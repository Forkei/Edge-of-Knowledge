// Research Agent - Agentic loop for gathering research
// Uses Gemini with tool calling to iteratively search and gather information

import { GoogleGenAI, Content, Part, FunctionCallingConfigMode } from '@google/genai'
import { RESEARCH_TOOLS } from './agent-tools'
import {
  ToolCall,
  ToolResult,
  executeToolsParallel,
  formatToolResultsForGemini,
} from './tool-executor'
import { PaperSearchResult } from './papers'
import { WebSearchResult } from './web-search'

const MAX_ITERATIONS = 10
const MODEL_NAME = 'gemini-3-pro-preview'

export interface ResearchContext {
  topic: string
  branchType: string
  originalAnalysis: unknown
  collectedPapers: PaperSearchResult[]
  collectedWebResults: WebSearchResult[]
  iterations: number
  toolCalls: { iteration: number; calls: string[]; results: string[] }[]
  researchSummary?: string
  researchConfidence?: number
  frontierDetected?: boolean
  totalTime: number
}

interface AgentConfig {
  maxIterations?: number
  minPapers?: number
  minConfidence?: number
}

/**
 * Run the research agent to gather comprehensive information on a topic
 */
export async function runResearchAgent(
  topic: string,
  branchType: string,
  originalAnalysis: unknown,
  config: AgentConfig = {}
): Promise<ResearchContext> {
  const startTime = Date.now()
  const maxIterations = config.maxIterations || MAX_ITERATIONS

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const ai = new GoogleGenAI({ apiKey })

  const context: ResearchContext = {
    topic,
    branchType,
    originalAnalysis,
    collectedPapers: [],
    collectedWebResults: [],
    iterations: 0,
    toolCalls: [],
    totalTime: 0,
  }

  // Build initial system prompt
  const systemPrompt = buildAgentSystemPrompt(topic, branchType, originalAnalysis)

  // Message history for the conversation
  const messages: Content[] = [
    {
      role: 'user',
      parts: [{ text: systemPrompt }],
    },
  ]

  let isComplete = false

  while (!isComplete && context.iterations < maxIterations) {
    context.iterations++

    try {
      // Call Gemini with tools
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: messages,
        config: {
          temperature: 0.7, // Lower for more focused research
          maxOutputTokens: 2048,
          tools: [{ functionDeclarations: RESEARCH_TOOLS }],
          toolConfig: {
            functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO }
          },
        },
      })

      const candidate = response.candidates?.[0]
      const parts = candidate?.content?.parts || []

      // Extract tool calls from response
      const toolCalls = extractToolCalls(parts)

      if (toolCalls.length === 0) {
        // No tool calls - agent might be done or confused
        // Check if there's text that indicates completion
        const textParts = parts.filter(p => p.text)
        if (textParts.length > 0) {
          console.log(`Agent text response: ${textParts[0].text?.slice(0, 200)}`)
        }
        break
      }

      // Check for finish_research call
      const finishCall = toolCalls.find(c => c.name === 'finish_research')
      if (finishCall) {
        // Extract finish args
        const args = finishCall.args as {
          summary?: string
          confidence?: number
          key_papers?: string[]
          frontier_detected?: boolean
        }
        context.researchSummary = args.summary
        context.researchConfidence = args.confidence
        context.frontierDetected = args.frontier_detected
        isComplete = true

        // Log completion
        context.toolCalls.push({
          iteration: context.iterations,
          calls: [`finish_research(confidence: ${args.confidence})`],
          results: ['Research complete'],
        })
        break
      }

      // Execute all tool calls in parallel
      const results = await executeToolsParallel(toolCalls)

      // Accumulate results
      accumulateResults(context, results)

      // Log this iteration
      context.toolCalls.push({
        iteration: context.iterations,
        calls: toolCalls.map(c => `${c.name}(${JSON.stringify(c.args).slice(0, 100)})`),
        results: results.map(r => r.error || `${r.name}: ${getResultSummary(r)}`),
      })

      // Add assistant's response to message history
      messages.push({
        role: 'model',
        parts: parts,
      })

      // Add tool results as function responses (proper format for Gemini)
      const functionResponseParts: Part[] = results.map(r => ({
        functionResponse: {
          name: r.name,
          response: (r.error ? { error: r.error } : r.result) as Record<string, unknown>,
        }
      }))
      messages.push({
        role: 'user',
        parts: functionResponseParts,
      })

      // Check if we have enough papers and should prompt for completion
      if (context.collectedPapers.length >= 10 && context.iterations >= 3) {
        // Add a hint as a separate text message
        messages.push({
          role: 'user',
          parts: [{ text: '[You have gathered significant research. Consider calling finish_research if you have enough context, or continue searching if needed.]' }],
        })
      }
    } catch (error) {
      console.error(`Agent iteration ${context.iterations} failed:`, error)

      // Add error to log and continue
      context.toolCalls.push({
        iteration: context.iterations,
        calls: ['ERROR'],
        results: [error instanceof Error ? error.message : 'Unknown error'],
      })

      // Don't break - try to continue with what we have
      if (context.iterations >= 2 && context.collectedPapers.length > 0) {
        isComplete = true
      }
    }
  }

  // If we hit max iterations without finish, set reasonable defaults
  if (!isComplete) {
    context.researchSummary = 'Research gathered through iterative search'
    context.researchConfidence = Math.min(0.3 + context.collectedPapers.length * 0.05, 0.8)
    context.frontierDetected = context.collectedPapers.length < 5
  }

  context.totalTime = Date.now() - startTime

  console.log(`Research agent completed:
    - Iterations: ${context.iterations}
    - Papers found: ${context.collectedPapers.length}
    - Web results: ${context.collectedWebResults.length}
    - Total time: ${context.totalTime}ms
    - Confidence: ${context.researchConfidence}
  `)

  return context
}

/**
 * Build the initial system prompt for the agent
 */
function buildAgentSystemPrompt(
  topic: string,
  branchType: string,
  originalAnalysis: unknown
): string {
  const branchFocus = getBranchFocus(branchType)

  return `You are a research agent exploring the topic "${topic}".
Your focus is: ${branchFocus}

YOUR GOAL: Gather comprehensive research to create an engaging exploration page for curious users.

AVAILABLE TOOLS:
- search_academic_papers: Search Semantic Scholar for peer-reviewed papers
- search_web: Search the web for general info, news, Wikipedia
- get_paper_details: Get more info about a specific paper
- finish_research: Call when you have enough information

STRATEGY:
1. Start with broad searches on the main topic
2. Try MULTIPLE search queries with different terms and synonyms
3. Search for both established knowledge AND recent developments
4. Look for controversies, debates, and unsolved questions
5. Use web search for context that might not be in papers
6. When you have 5-15 quality papers and good web context, call finish_research

IMPORTANT:
- Try at least 2-3 different search queries before finishing
- Include synonyms and related terms in your searches
- If a search returns few results, try alternative terminology
- Note if you find a research frontier (gap in knowledge, active debate, unsolved problem)

${originalAnalysis ? `ORIGINAL SUBJECT ANALYSIS:\n${JSON.stringify(originalAnalysis, null, 2).slice(0, 1000)}` : ''}

Begin your research now. Start with search queries related to "${topic}".`
}

/**
 * Get focus description based on branch type
 */
function getBranchFocus(branchType: string): string {
  switch (branchType) {
    case 'science':
      return 'Finding established scientific knowledge and peer-reviewed research'
    case 'unknown':
      return 'Exploring unknowns, open questions, and research frontiers'
    case 'experiment':
      return 'Finding experiments, methods, and hands-on explorations'
    default:
      return 'Comprehensive exploration of all aspects'
  }
}

/**
 * Extract tool calls from Gemini response parts
 */
function extractToolCalls(parts: Part[]): ToolCall[] {
  const calls: ToolCall[] = []

  for (const part of parts) {
    if (part.functionCall) {
      calls.push({
        name: part.functionCall.name || '',
        args: (part.functionCall.args as Record<string, unknown>) || {},
      })
    }
  }

  return calls
}

/**
 * Accumulate results from tool calls into context
 */
function accumulateResults(context: ResearchContext, results: ToolResult[]): void {
  for (const result of results) {
    if (result.error) continue

    if (result.name === 'search_academic_papers' && result.result) {
      const data = result.result as { papers?: Array<{ id: string }> }
      if (data.papers) {
        // Convert back to PaperSearchResult format and deduplicate
        for (const paper of data.papers) {
          const paperId = paper.id
          if (!context.collectedPapers.some(p => p.paperId === paperId)) {
            context.collectedPapers.push(paper as unknown as PaperSearchResult)
          }
        }
      }
    }

    if (result.name === 'search_web' && result.result) {
      const data = result.result as { results?: WebSearchResult[] }
      if (data.results) {
        // Deduplicate by URL
        for (const webResult of data.results) {
          if (!context.collectedWebResults.some(r => r.url === webResult.url)) {
            context.collectedWebResults.push(webResult)
          }
        }
      }
    }
  }
}

/**
 * Get a brief summary of a tool result for logging
 */
function getResultSummary(result: ToolResult): string {
  if (result.error) return `error: ${result.error}`

  if (result.name === 'search_academic_papers') {
    const data = result.result as { count?: number }
    return `${data?.count || 0} papers`
  }

  if (result.name === 'search_web') {
    const data = result.result as { count?: number }
    return `${data?.count || 0} results`
  }

  if (result.name === 'get_paper_details') {
    const data = result.result as { title?: string }
    return `details for "${data?.title?.slice(0, 30)}..."`
  }

  return 'ok'
}

/**
 * Format collected research for the content generation prompt
 */
export function formatResearchForPrompt(context: ResearchContext): string {
  const sections: string[] = []

  // Paper summary
  if (context.collectedPapers.length > 0) {
    const paperList = context.collectedPapers.slice(0, 10).map((p, i) => {
      const paper = p as unknown as {
        title: string
        authors: string
        year: number
        citations: number
        abstract: string
      }
      return `${i + 1}. "${paper.title}" (${paper.year}) - ${paper.citations} citations
   Authors: ${paper.authors}
   Abstract: ${paper.abstract?.slice(0, 200) || 'N/A'}...`
    })

    sections.push(`ACADEMIC PAPERS FOUND (${context.collectedPapers.length} total):
${paperList.join('\n\n')}`)

    // Year analysis
    const years = context.collectedPapers
      .map(p => (p as unknown as { year: number }).year)
      .filter(y => y > 0)
    if (years.length > 0) {
      const minYear = Math.min(...years)
      const maxYear = Math.max(...years)
      const recentCount = years.filter(y => y >= new Date().getFullYear() - 2).length
      sections.push(`Paper year range: ${minYear}-${maxYear}
Recent papers (last 2 years): ${recentCount}`)
    }
  } else {
    sections.push('NO ACADEMIC PAPERS FOUND - This may indicate a research frontier.')
  }

  // Web results
  if (context.collectedWebResults.length > 0) {
    const webList = context.collectedWebResults.slice(0, 5).map((r, i) =>
      `${i + 1}. ${r.title} (${r.source})
   ${r.snippet}`
    )

    sections.push(`WEB CONTEXT (${context.collectedWebResults.length} results):
${webList.join('\n\n')}`)
  }

  // Agent's research summary
  if (context.researchSummary) {
    sections.push(`RESEARCH AGENT SUMMARY:
${context.researchSummary}

Agent confidence: ${context.researchConfidence}
Frontier detected: ${context.frontierDetected ? 'Yes' : 'No'}`)
  }

  // Search history for transparency
  sections.push(`RESEARCH PROCESS:
- Iterations: ${context.iterations}
- Total time: ${context.totalTime}ms
- Tool calls: ${context.toolCalls.map(tc => tc.calls.join(', ')).join(' → ')}`)

  return sections.join('\n\n---\n\n')
}
