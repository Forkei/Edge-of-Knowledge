import { useExplorationStore, ProgressEvent, BranchContent } from './store'

interface ExploreParams {
  branchType: string
  branchId?: string
  branchTitle: string
  context?: string
  searchQuery?: string
  originalAnalysis?: unknown
}

/**
 * Starts a streaming exploration request and returns the tab ID.
 * Progress events and final content are automatically stored.
 */
export async function startStreamingExplore(
  tabId: string,
  params: ExploreParams
): Promise<void> {
  const store = useExplorationStore.getState()

  // Clear any previous progress
  store.clearTabProgress(tabId)
  console.log(`[SSE] Starting streaming explore for tab ${tabId}`, params)

  try {
    console.log(`[SSE] Fetching /api/explore/stream...`)
    const response = await fetch('/api/explore/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })

    console.log(`[SSE] Response status: ${response.status}`)
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[SSE] Fetch failed:`, errorText)
      throw new Error('Failed to start exploration')
    }

    const reader = response.body?.getReader()
    if (!reader) {
      console.error(`[SSE] No response body/reader`)
      throw new Error('No response stream')
    }

    console.log(`[SSE] Got reader, starting to read stream...`)
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      console.log(`[SSE] Read chunk: done=${done}, size=${value?.length || 0}`)

      if (done) break

      buffer += decoder.decode(value, { stream: true })
      console.log(`[SSE] Buffer now (first 200 chars): ${buffer.slice(0, 200)}`)

      // Process complete SSE events
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep incomplete line in buffer
      console.log(`[SSE] Processing ${lines.length} lines`)

      let eventType = ''
      let eventData = ''

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim()
        } else if (line.startsWith('data: ')) {
          eventData = line.slice(6).trim()
        } else if (line === '' && eventType && eventData) {
          // Process complete event
          try {
            const data = JSON.parse(eventData)
            console.log(`[SSE] Event received: ${eventType}`, data)

            if (eventType === 'progress') {
              // Add progress event to tab
              console.log(`[SSE] Adding progress event to tab ${tabId}:`, data)
              store.addTabProgressEvent(tabId, data as ProgressEvent)
              // Verify it was added
              const tabs = useExplorationStore.getState().tabs
              const tab = tabs.find(t => t.id === tabId)
              console.log(`[SSE] Tab now has ${tab?.progressEvents?.length || 0} progress events`)
            } else if (eventType === 'complete') {
              // Update tab with final content
              console.log(`[SSE] Completing tab ${tabId}`)
              store.updateTabContent(tabId, data as BranchContent)
            } else if (eventType === 'error') {
              // Handle error
              console.log(`[SSE] Error for tab ${tabId}:`, data.error)
              store.setTabError(tabId, data.error || 'Exploration failed')
            }
          } catch (e) {
            console.error('Failed to parse SSE event:', e, eventData)
          }

          // Reset for next event
          eventType = ''
          eventData = ''
        }
      }
    }
  } catch (error) {
    store.setTabError(
      tabId,
      error instanceof Error ? error.message : 'Failed to explore'
    )
  }
}
