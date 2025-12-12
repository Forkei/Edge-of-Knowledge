import { NextRequest } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { searchPapers, formatAuthors, getLastStudiedYear } from '@/lib/papers'
import { InitialAnalysis } from '@/lib/store'
import {
  SYSTEM_PROMPT,
  INITIAL_ANALYSIS_PROMPT,
  formatPaperResultsForPrompt,
  detectFrontierFromPapers,
} from '@/lib/prompts'
import { rateLimit, getClientId } from '@/lib/rate-limit'

const MODEL_NAME = 'gemini-3-pro-preview'

// Rate limit: 10 requests per minute per IP
const RATE_LIMIT_CONFIG = { maxRequests: 10, windowMs: 60 * 1000 }

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes max

// Progress event types for initial analysis
export interface AnalyzeProgressEvent {
  stage: 'starting' | 'identifying' | 'searching' | 'found-papers' | 'analyzing' | 'complete' | 'error'
  message: string
  detail?: string
  searchQueries?: string[]
  papersFound?: number
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  // Helper to send SSE event
  const sendEvent = (controller: ReadableStreamDefaultController, event: string, data: unknown) => {
    controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Rate limiting
        const clientId = getClientId(request)
        const { success, resetIn } = rateLimit(clientId, RATE_LIMIT_CONFIG)

        if (!success) {
          sendEvent(controller, 'error', {
            error: `Rate limit exceeded. Try again in ${Math.ceil(resetIn / 1000)} seconds.`
          })
          controller.close()
          return
        }

        const body = await request.json()
        const { image, mimeType, context } = body

        if (!image) {
          sendEvent(controller, 'error', { error: 'No image provided' })
          controller.close()
          return
        }

        if (!process.env.GEMINI_API_KEY) {
          sendEvent(controller, 'error', { error: 'API key not configured' })
          controller.close()
          return
        }

        // Initialize Gemini
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

        // Step 1: Quick identification
        sendEvent(controller, 'progress', {
          stage: 'identifying',
          message: 'Looking at your image...',
          detail: 'Identifying what we\'re looking at'
        } as AnalyzeProgressEvent)

        const quickIdPrompt = buildQuickIdentificationPrompt(context)

        const quickIdResponse = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: [{
            role: 'user',
            parts: [
              { text: quickIdPrompt },
              { inlineData: { mimeType, data: image } },
            ],
          }],
          config: {
            temperature: 0.7,
            maxOutputTokens: 512,
          },
        })

        const quickIdText = quickIdResponse.text || ''
        console.log(`[Quick ID] Raw response (first 500 chars): ${quickIdText.slice(0, 500)}`)

        let subjectName = 'unknown observation'
        let searchQueries: string[] = []

        try {
          // Try multiple JSON extraction patterns
          let jsonStr: string | null = null

          // Pattern 1: ```json ... ```
          const codeBlockMatch = quickIdText.match(/```(?:json)?\s*([\s\S]*?)```/)
          if (codeBlockMatch) {
            jsonStr = codeBlockMatch[1].trim()
            console.log(`[Quick ID] Found JSON in code block`)
          }

          // Pattern 2: Raw JSON object
          if (!jsonStr) {
            const rawJsonMatch = quickIdText.match(/\{[\s\S]*\}/)
            if (rawJsonMatch) {
              jsonStr = rawJsonMatch[0]
              console.log(`[Quick ID] Found raw JSON object`)
            }
          }

          if (jsonStr) {
            console.log(`[Quick ID] Attempting to parse: ${jsonStr.slice(0, 200)}`)
            const parsed = JSON.parse(jsonStr)
            subjectName = parsed.name || subjectName
            searchQueries = parsed.searchQueries || []
            console.log(`[Quick ID] Parsed successfully - name: "${subjectName}", queries: ${JSON.stringify(searchQueries)}`)
          } else {
            console.log(`[Quick ID] No JSON found in response`)
          }
        } catch (e) {
          console.log(`[Quick ID] JSON parse failed: ${e instanceof Error ? e.message : 'unknown error'}`)
          // Fallback: try to extract name with regex
          const nameMatch = quickIdText.match(/"name"\s*:\s*"([^"]+)"/)
          if (nameMatch) {
            subjectName = nameMatch[1]
            console.log(`[Quick ID] Fallback regex found name: "${subjectName}"`)
          }
          // Also try to extract searchQueries
          const queriesMatch = quickIdText.match(/"searchQueries"\s*:\s*\[([\s\S]*?)\]/)
          if (queriesMatch) {
            const queriesStr = queriesMatch[1]
            searchQueries = queriesStr.match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, '')) || []
            console.log(`[Quick ID] Fallback regex found queries: ${JSON.stringify(searchQueries)}`)
          }
        }

        console.log(`[Quick ID] Final result - name: "${subjectName}", queries: ${JSON.stringify(searchQueries)}`)

        // Fallback search queries
        if (searchQueries.length === 0) {
          searchQueries = [subjectName]
        }

        // Emit what we identified
        sendEvent(controller, 'progress', {
          stage: 'searching',
          message: `Found: ${subjectName}`,
          detail: 'Searching academic papers...',
          searchQueries: searchQueries.slice(0, 3),
        } as AnalyzeProgressEvent)

        // Step 2: Search for papers
        const searchPromises = searchQueries.slice(0, 3).map(query =>
          searchPapers(query, 10).catch(() => [])
        )

        // Show each search as it completes
        let paperCount = 0
        const paperSets = await Promise.all(
          searchPromises.map(async (promise, idx) => {
            const results = await promise
            paperCount += results.length
            sendEvent(controller, 'progress', {
              stage: 'found-papers',
              message: `Searched "${searchQueries[idx]}"`,
              detail: `Found ${results.length} papers`,
              papersFound: paperCount,
            } as AnalyzeProgressEvent)
            return results
          })
        )

        // Combine and deduplicate papers
        const seenPaperIds = new Set<string>()
        const papers = paperSets.flat().filter(paper => {
          if (seenPaperIds.has(paper.paperId)) return false
          seenPaperIds.add(paper.paperId)
          return true
        }).slice(0, 20)

        console.log(`Search queries: ${searchQueries.join(', ')} → ${papers.length} unique papers`)

        // Emit paper summary
        sendEvent(controller, 'progress', {
          stage: 'analyzing',
          message: `Found ${papers.length} unique papers`,
          detail: 'Now analyzing findings...',
          papersFound: papers.length,
        } as AnalyzeProgressEvent)

        const formattedPapers = papers.slice(0, 10).map(p => ({
          title: p.title,
          authors: formatAuthors(p.authors),
          year: p.year,
          citationCount: p.citationCount,
        }))

        const paperContext = formatPaperResultsForPrompt(formattedPapers)
        const { researchHeat } = detectFrontierFromPapers(papers)
        const lastStudied = getLastStudiedYear(papers)

        // Step 3: Full analysis with paper context
        sendEvent(controller, 'progress', {
          stage: 'analyzing',
          message: 'Creating your exploration...',
          detail: 'Generating doors and insights',
          papersFound: papers.length,
        } as AnalyzeProgressEvent)

        const fullAnalysisPrompt = buildFullAnalysisPrompt(context, subjectName, paperContext)
        const fullPrompt = `${SYSTEM_PROMPT}\n\n---\n\n${fullAnalysisPrompt}`

        const analysisResponse = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: [{
            role: 'user',
            parts: [
              { text: fullPrompt },
              { inlineData: { mimeType, data: image } },
            ],
          }],
          config: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        })

        const analysisText = analysisResponse.text || ''

        // Parse the full analysis
        let parsedAnalysis: {
          validation?: {
            isValid?: boolean
            confidence?: number
            issue?: string | null
            suggestion?: string
          }
          identification?: {
            name?: string
            commonName?: string
            confidence?: number
            category?: string
            oneLiner?: string
          }
          doors?: Array<{
            id?: string
            title?: string
            teaser?: string
            icon?: string
          }>
          quickStats?: {
            researchActivity?: string
            fieldsInvolved?: string[]
            surpriseFactor?: string
          }
        } = {}

        try {
          const jsonMatch = analysisText.match(/```(?:json)?\s*([\s\S]*?)```/) || analysisText.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            parsedAnalysis = JSON.parse(jsonMatch[1] || jsonMatch[0])
          }
        } catch (e) {
          console.error('Failed to parse full analysis:', e)
        }

        // Check validation
        if (parsedAnalysis.validation?.isValid === false) {
          sendEvent(controller, 'validation_error', {
            issue: parsedAnalysis.validation.issue || 'ambiguous',
            suggestion: parsedAnalysis.validation.suggestion || 'Try uploading a clearer image of something in nature, a scientific subject, or an interesting object.',
            partialIdentification: parsedAnalysis.identification?.name || subjectName,
          })
          controller.close()
          return
        }

        // Build the response
        const identification = {
          name: parsedAnalysis.identification?.name || subjectName,
          confidence: normalizeConfidence(parsedAnalysis.identification?.confidence),
          oneLiner: parsedAnalysis.identification?.oneLiner || `Exploring ${subjectName}...`,
        }

        // Map doors
        const doors: InitialAnalysis['doors'] = (parsedAnalysis.doors || []).map(door => ({
          id: (door.id as 'science' | 'unknown' | 'experiment') || 'science',
          title: door.title || 'Explore',
          teaser: door.teaser || 'Discover more...',
          paperHint: researchHeat,
        }))

        // Fallback doors
        if (doors.length === 0) {
          doors.push(
            { id: 'science', title: 'The Science', teaser: 'Explore how this works', paperHint: researchHeat },
            { id: 'unknown', title: 'The Unknown', teaser: 'Discover what we don\'t know', paperHint: researchHeat },
            { id: 'experiment', title: 'Investigate', teaser: 'Try your own experiments', paperHint: researchHeat },
          )
        }

        const analysis: InitialAnalysis = {
          identification,
          doors,
          paperCount: papers.length,
          lastStudied,
          researchActivity: researchHeat,
        }

        // Send final result
        sendEvent(controller, 'progress', {
          stage: 'complete',
          message: 'Analysis complete!',
          detail: `Ready to explore ${identification.name}`,
          papersFound: papers.length,
        } as AnalyzeProgressEvent)

        sendEvent(controller, 'complete', analysis)
        controller.close()

      } catch (error) {
        console.error('Streaming analyze error:', error)
        sendEvent(controller, 'error', {
          error: error instanceof Error ? error.message : 'Analysis failed'
        })
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

// Quick identification prompt
function buildQuickIdentificationPrompt(context?: string): string {
  const contextSection = context ? `\nUser context: "${context}"` : ''

  return `Quickly identify what is in this image and suggest search queries for academic research.${contextSection}

Respond with JSON only:
{
  "name": "The main subject (e.g., 'Monarch Butterfly Wing', 'Tesla Model 3', 'Quartz Crystal')",
  "searchQueries": [
    "Primary academic search term",
    "Alternative or broader term",
    "Scientific/technical angle"
  ]
}

IMPORTANT:
- name: Be specific about what you see
- searchQueries: Generate 2-3 search terms that would find ACADEMIC papers
  - For natural subjects: use scientific names and phenomena (e.g., "Danaus plexippus", "structural coloration")
  - For technology/products: focus on the underlying science (e.g., "electric vehicle battery technology", "lithium ion battery chemistry")
  - For everyday objects: think about the materials, physics, or engineering (e.g., "automotive aerodynamics", "internal combustion engine efficiency")

The searchQueries should be terms that would return results from academic databases like Semantic Scholar.`
}

// Full analysis prompt
function buildFullAnalysisPrompt(context: string | undefined, subject: string, paperContext: string): string {
  const contextSection = context ? `\nUser's context: "${context}"` : ''

  return `${INITIAL_ANALYSIS_PROMPT}
${contextSection}

The subject appears to be: "${subject}"

PAPER SEARCH RESULTS:
${paperContext}

Use these papers to inform your response:
- If many recent papers exist, this is well-studied
- If few or old papers, this might be frontier territory
- Reference what the research shows, don't make things up

Remember: The confidence value should be 0.0-1.0 (a decimal), not a percentage.
Make each door teaser specific and compelling based on what you know about this subject.`
}

// Normalize confidence
function normalizeConfidence(value: number | undefined): number {
  if (value === undefined) return 70
  if (value <= 1) return Math.round(value * 100)
  return Math.max(0, Math.min(100, Math.round(value)))
}
