import { useExplorationStore, AnalyzeProgressEvent, InitialAnalysis, ValidationError } from './store'

interface AnalyzeParams {
  image: string
  mimeType: string
  context?: string
}

interface StreamingAnalyzeResult {
  success: boolean
  analysis?: InitialAnalysis
  validationError?: ValidationError
  error?: string
}

/**
 * Starts a streaming analysis request and updates the store with progress events.
 * Returns the final analysis result or error.
 */
export async function startStreamingAnalyze(
  params: AnalyzeParams
): Promise<StreamingAnalyzeResult> {
  const store = useExplorationStore.getState()

  // Clear any previous progress and set loading
  store.clearAnalyzeProgress()
  store.setInitialLoading(true)
  store.setInitialError(null)
  store.setValidationError(null)

  console.log(`[SSE Analyze] Starting streaming analyze...`)

  try {
    console.log(`[SSE Analyze] Fetching /api/analyze/stream...`)
    const response = await fetch('/api/analyze/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })

    console.log(`[SSE Analyze] Response status: ${response.status}`)
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[SSE Analyze] Fetch failed:`, errorText)
      throw new Error('Failed to start analysis')
    }

    const reader = response.body?.getReader()
    if (!reader) {
      console.error(`[SSE Analyze] No response body/reader`)
      throw new Error('No response stream')
    }

    console.log(`[SSE Analyze] Got reader, starting to read stream...`)
    const decoder = new TextDecoder()
    let buffer = ''
    let result: StreamingAnalyzeResult = { success: false }

    while (true) {
      const { done, value } = await reader.read()
      console.log(`[SSE Analyze] Read chunk: done=${done}, size=${value?.length || 0}`)

      if (done) break

      buffer += decoder.decode(value, { stream: true })
      console.log(`[SSE Analyze] Buffer now (first 200 chars): ${buffer.slice(0, 200)}`)

      // Process complete SSE events - handle both \n and \r\n
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() || '' // Keep incomplete line in buffer
      console.log(`[SSE Analyze] Processing ${lines.length} lines, buffer remaining: ${buffer.length} chars`)

      let eventType = ''
      let eventData = ''

      for (const line of lines) {
        console.log(`[SSE Analyze] Line: "${line.slice(0, 100)}"`)
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim()
          console.log(`[SSE Analyze] Got event type: ${eventType}`)
        } else if (line.startsWith('data: ')) {
          eventData = line.slice(6).trim()
          console.log(`[SSE Analyze] Got data: ${eventData.slice(0, 100)}`)
        } else if (line === '' && eventType && eventData) {
          console.log(`[SSE Analyze] Processing complete event: ${eventType}`)
          // Process complete event
          try {
            const data = JSON.parse(eventData)
            console.log(`[SSE Analyze] Event received: ${eventType}`, data)

            if (eventType === 'progress') {
              // Add progress event to store
              console.log(`[SSE Analyze] Adding progress event:`, data)
              store.addAnalyzeProgressEvent(data as AnalyzeProgressEvent)
              // Verify it was added
              const events = useExplorationStore.getState().analyzeProgressEvents
              console.log(`[SSE Analyze] Store now has ${events.length} progress events`)
            } else if (eventType === 'complete') {
              // Analysis complete - delay briefly to ensure progress UI shows
              console.log(`[SSE Analyze] Analysis complete! Showing result after brief delay...`)
              const analysis = data as InitialAnalysis
              // Small delay to let React render the progress UI at least once
              await new Promise(resolve => setTimeout(resolve, 500))
              store.setInitialAnalysis(analysis)
              result = { success: true, analysis }
            } else if (eventType === 'validation_error') {
              // Validation error
              console.log(`[SSE Analyze] Validation error:`, data)
              const validationError: ValidationError = {
                issue: data.issue || 'ambiguous',
                suggestion: data.suggestion,
                partialIdentification: data.partialIdentification,
              }
              store.setValidationError(validationError)
              store.setInitialLoading(false)
              result = { success: false, validationError }
            } else if (eventType === 'error') {
              // Error
              console.log(`[SSE Analyze] Error:`, data.error)
              store.setInitialError(data.error || 'Analysis failed')
              store.setInitialLoading(false)
              result = { success: false, error: data.error }
            }
          } catch (e) {
            console.error('[SSE Analyze] Failed to parse SSE event:', e, eventData)
          }

          // Reset for next event
          eventType = ''
          eventData = ''
        }
      }
    }

    return result
  } catch (error) {
    console.error('[SSE Analyze] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Analysis failed'
    store.setInitialError(errorMessage)
    store.setInitialLoading(false)
    return { success: false, error: errorMessage }
  }
}
