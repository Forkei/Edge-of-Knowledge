import { NextRequest } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { formatAuthors, PaperSearchResult } from '@/lib/papers'
import { BranchContent, Citation, KnowledgeDepth } from '@/lib/store'
import {
  SYSTEM_PROMPT,
  buildBranchExplorationPrompt,
  buildExperimentPrompt,
  formatPaperResultsForPrompt,
  detectFrontierFromPapers,
} from '@/lib/prompts'
import { rateLimit, getClientId } from '@/lib/rate-limit'
import { runResearchAgentWithProgress, formatResearchForPrompt, ResearchContext, ProgressCallback } from '@/lib/research-agent'

const MODEL_NAME = 'gemini-3-pro-preview'

// Rate limit: 20 requests per minute per IP
const RATE_LIMIT_CONFIG = { maxRequests: 20, windowMs: 60 * 1000 }

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes max for Pro tier, will use what's available

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
        const { branchType, branchTitle, context, originalAnalysis } = body

        if (!process.env.GEMINI_API_KEY) {
          sendEvent(controller, 'error', { error: 'API key not configured' })
          controller.close()
          return
        }

        // Progress callback to stream updates to frontend
        const onProgress: ProgressCallback = (event) => {
          sendEvent(controller, 'progress', event)
        }

        // Send initial status
        sendEvent(controller, 'progress', {
          stage: 'starting',
          message: 'Starting research...',
          iteration: 0
        })

        // Run the research agent with progress streaming
        const topic = branchTitle || context || branchType
        const researchContext = await runResearchAgentWithProgress(
          topic,
          branchType,
          originalAnalysis,
          onProgress,
          { maxIterations: 10 } // Allow thorough research
        )

        // Extract papers (using correct field names: paperId, citationCount)
        const papers: PaperSearchResult[] = researchContext.collectedPapers.map(p => {
          const paper = p as unknown as {
            paperId: string
            title: string
            authors: string
            year: number
            citationCount: number
            abstract: string
            url: string
            venue: string
          }
          return {
            paperId: paper.paperId,
            title: paper.title,
            authors: paper.authors ? paper.authors.split(', ').map(name => ({ name })) : [],
            year: paper.year || 0,
            citationCount: paper.citationCount || 0,
            abstract: paper.abstract,
            url: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
            venue: paper.venue,
          } as PaperSearchResult
        })

        // Format citations
        const citations: Citation[] = papers.slice(0, 5).map(p => ({
          paperId: p.paperId,
          title: p.title,
          authors: formatAuthors(p.authors),
          year: p.year,
          citationCount: p.citationCount,
          url: p.url,
        }))

        // Analyze papers for frontier detection
        const paperAnalysis = detectFrontierFromPapers(papers)
        if (researchContext?.frontierDetected) {
          paperAnalysis.isFrontier = true
          // Don't use the full research summary as frontier reason - keep it short
          paperAnalysis.frontierReason = 'This specific area has limited published research.'
        }

        // Send progress: generating content
        sendEvent(controller, 'progress', {
          stage: 'generating',
          message: 'Writing exploration content...',
          papersFound: papers.length,
          webResultsFound: researchContext.collectedWebResults.length
        })

        // Generate final content
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
        const paperContext = formatResearchForPrompt(researchContext)

        let prompt: string
        if (branchType === 'experiment') {
          prompt = buildExperimentPrompt(context, paperContext)
        } else {
          prompt = buildBranchExplorationPrompt(
            branchTitle || branchType,
            context,
            paperContext
          )
        }

        const fullPrompt = `${SYSTEM_PROMPT}\n\n---\n\n${prompt}`

        const response = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
          config: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          },
        })

        const text = response.text || ''

        // Parse JSON from response
        let content: ParsedExploreResponse = {}
        try {
          const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const jsonStr = jsonMatch[1] || jsonMatch[0]
            content = JSON.parse(jsonStr.trim())
          }
        } catch (e) {
          console.error('Failed to parse Gemini response:', e)
        }

        // Determine frontier status
        const geminiSaysFrontier = content.isFrontier === true
        const papersSayFrontier = paperAnalysis.isFrontier
        const isFrontier = papersSayFrontier || (geminiSaysFrontier && !!content.frontierReason)

        let depth: KnowledgeDepth = paperAnalysis.depth
        if (content.depth && isValidDepth(content.depth)) {
          if (depthOrder(content.depth) > depthOrder(paperAnalysis.depth)) {
            depth = content.depth
          }
        }
        if (isFrontier) {
          depth = 'frontier'
        }

        // Build final response
        const branchContent: BranchContent = {
          headline: content.headline || `Exploring ${branchTitle || branchType}`,
          summary: content.summary || 'Investigating this branch of knowledge...',
          citations,
          researchHeat: paperAnalysis.researchHeat,
          branches: normalizeBranches(content.branches),
          experiments: normalizeExperiments(content.experiments),
          scientificTerms: normalizeScientificTerms(content.scientificTerms),
          relatedTopics: normalizeRelatedTopics(content.relatedTopics),
          isFrontier,
          frontierReason: isFrontier
            ? (content.frontierReason || paperAnalysis.frontierReason || undefined)
            : undefined,
          depth,
          ...(content.knowledgeMap && { knowledgeMap: content.knowledgeMap }),
        }

        // Send final result
        sendEvent(controller, 'complete', branchContent)
        controller.close()

      } catch (error) {
        console.error('Streaming explore error:', error)
        sendEvent(controller, 'error', {
          error: error instanceof Error ? error.message : 'Exploration failed'
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

// Types and helpers (same as main route)
interface ParsedExploreResponse {
  headline?: string
  summary?: string
  depth?: string
  confidence?: number
  researchHeat?: string
  knowledgeMap?: {
    established?: string[]
    debated?: string[]
    unknown?: string[]
  }
  branches?: Array<{
    id?: string
    title?: string
    teaser?: string
    type?: string
    searchQuery?: string
  }>
  experiments?: Array<{
    id?: string
    title?: string
    hypothesis?: string
    difficulty?: string
    materials?: string[]
    steps?: string[]
    expectedOutcome?: string
  }>
  scientificTerms?: Array<{
    term?: string
    definition?: string
    searchQuery?: string
    category?: string
  }>
  relatedTopics?: Array<{
    title?: string
    teaser?: string
    searchQuery?: string
  }>
  isFrontier?: boolean
  frontierReason?: string
}

function isValidDepth(depth: string): depth is KnowledgeDepth {
  return ['known', 'investigated', 'debated', 'unknown', 'frontier'].includes(depth)
}

function depthOrder(depth: KnowledgeDepth): number {
  const order: Record<KnowledgeDepth, number> = {
    known: 0,
    investigated: 1,
    debated: 2,
    unknown: 3,
    frontier: 4,
  }
  return order[depth] ?? 2
}

function normalizeBranches(branches?: ParsedExploreResponse['branches']): BranchContent['branches'] {
  if (!branches || !Array.isArray(branches)) return []
  return branches.map((b, i) => ({
    id: b.id || `branch-${i}`,
    title: b.title || 'Explore',
    teaser: b.teaser || 'Discover more...',
    type: normalizeType(b.type),
    ...(b.searchQuery && { searchQuery: b.searchQuery }),
  }))
}

function normalizeType(type?: string): 'science' | 'unknown' | 'experiment' | 'paper' | 'custom' {
  if (type === 'science' || type === 'unknown' || type === 'experiment' || type === 'paper') {
    return type
  }
  if (type === 'deeper') return 'science'
  return 'custom'
}

function normalizeExperiments(experiments?: ParsedExploreResponse['experiments']): BranchContent['experiments'] {
  if (!experiments || !Array.isArray(experiments)) return undefined
  return experiments.map((e, i) => ({
    id: e.id || `exp-${i}`,
    title: e.title || 'Experiment',
    hypothesis: e.hypothesis || 'Testing...',
    materials: e.materials || [],
    steps: e.steps || [],
    expectedOutcome: e.expectedOutcome || 'Observe the results',
    difficulty: normalizeDifficulty(e.difficulty),
  }))
}

function normalizeDifficulty(diff?: string): 'beginner' | 'intermediate' | 'advanced' {
  if (diff === 'beginner' || diff === 'intermediate' || diff === 'advanced') {
    return diff
  }
  return 'intermediate'
}

function normalizeScientificTerms(terms?: ParsedExploreResponse['scientificTerms']): BranchContent['scientificTerms'] {
  if (!terms || !Array.isArray(terms)) return undefined
  return terms
    .filter(t => t.term && t.definition)
    .map(t => ({
      term: t.term!,
      definition: t.definition!,
      searchQuery: t.searchQuery,
      category: t.category,
    }))
}

function normalizeRelatedTopics(topics?: ParsedExploreResponse['relatedTopics']): BranchContent['relatedTopics'] {
  if (!topics || !Array.isArray(topics)) return undefined
  return topics
    .filter(t => t.title && t.searchQuery)
    .map(t => ({
      title: t.title!,
      teaser: t.teaser || 'Explore this topic',
      searchQuery: t.searchQuery!,
    }))
}
