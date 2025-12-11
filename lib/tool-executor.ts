// Tool executor for the research agent
// Handles execution of tool calls from Gemini, including parallel execution

import { searchPapers, getPaperDetails, PaperSearchResult, PaperDetails } from './papers'
import { searchWeb, WebSearchResult } from './web-search'
import {
  SearchAcademicPapersArgs,
  SearchWebArgs,
  GetPaperDetailsArgs,
  FinishResearchArgs,
} from './agent-tools'

export interface ToolCall {
  name: string
  args: Record<string, unknown>
}

export interface ToolResult {
  name: string
  result: unknown
  error?: string
  executionTime?: number
}

// Type guard for tool args
function isSearchPapersArgs(args: unknown): args is SearchAcademicPapersArgs {
  return typeof args === 'object' && args !== null && 'query' in args
}

function isSearchWebArgs(args: unknown): args is SearchWebArgs {
  return typeof args === 'object' && args !== null && 'query' in args
}

function isGetPaperDetailsArgs(args: unknown): args is GetPaperDetailsArgs {
  return typeof args === 'object' && args !== null && 'paperId' in args
}

function isFinishResearchArgs(args: unknown): args is FinishResearchArgs {
  return typeof args === 'object' && args !== null && 'summary' in args && 'confidence' in args
}

/**
 * Execute a single tool call
 */
export async function executeTool(call: ToolCall): Promise<ToolResult> {
  const startTime = Date.now()

  try {
    switch (call.name) {
      case 'search_academic_papers': {
        if (!isSearchPapersArgs(call.args)) {
          return {
            name: call.name,
            result: null,
            error: 'Invalid arguments: query is required',
            executionTime: Date.now() - startTime,
          }
        }

        const limit = Math.min(Math.max(call.args.limit || 10, 1), 20)
        const papers = await searchPapers(call.args.query, limit)

        return {
          name: call.name,
          result: formatPapersForAgent(papers),
          executionTime: Date.now() - startTime,
        }
      }

      case 'search_web': {
        if (!isSearchWebArgs(call.args)) {
          return {
            name: call.name,
            result: null,
            error: 'Invalid arguments: query is required',
            executionTime: Date.now() - startTime,
          }
        }

        const limit = Math.min(Math.max(call.args.limit || 5, 1), 10)
        const results = await searchWeb(call.args.query, limit)

        return {
          name: call.name,
          result: formatWebResultsForAgent(results),
          executionTime: Date.now() - startTime,
        }
      }

      case 'get_paper_details': {
        if (!isGetPaperDetailsArgs(call.args)) {
          return {
            name: call.name,
            result: null,
            error: 'Invalid arguments: paperId is required',
            executionTime: Date.now() - startTime,
          }
        }

        const details = await getPaperDetails(call.args.paperId)

        if (!details) {
          return {
            name: call.name,
            result: null,
            error: 'Paper not found',
            executionTime: Date.now() - startTime,
          }
        }

        return {
          name: call.name,
          result: formatPaperDetailsForAgent(details),
          executionTime: Date.now() - startTime,
        }
      }

      case 'finish_research': {
        if (!isFinishResearchArgs(call.args)) {
          return {
            name: call.name,
            result: null,
            error: 'Invalid arguments: summary and confidence are required',
            executionTime: Date.now() - startTime,
          }
        }

        // Just pass through the finish args - this signals completion
        return {
          name: call.name,
          result: {
            summary: call.args.summary,
            confidence: call.args.confidence,
            keyPapers: call.args.key_papers || [],
            frontierDetected: call.args.frontier_detected || false,
          },
          executionTime: Date.now() - startTime,
        }
      }

      default:
        return {
          name: call.name,
          result: null,
          error: `Unknown tool: ${call.name}`,
          executionTime: Date.now() - startTime,
        }
    }
  } catch (error) {
    return {
      name: call.name,
      result: null,
      error: error instanceof Error ? error.message : 'Tool execution failed',
      executionTime: Date.now() - startTime,
    }
  }
}

/**
 * Execute multiple tool calls in parallel
 * All calls run simultaneously for maximum speed
 */
export async function executeToolsParallel(calls: ToolCall[]): Promise<ToolResult[]> {
  const results = await Promise.all(calls.map(executeTool))
  return results
}

/**
 * Execute tool calls with concurrency limit
 * Use this if API rate limiting becomes an issue
 */
export async function executeToolsWithLimit(
  calls: ToolCall[],
  concurrencyLimit: number = 3
): Promise<ToolResult[]> {
  const results: ToolResult[] = []
  const queue = [...calls]

  while (queue.length > 0) {
    const batch = queue.splice(0, concurrencyLimit)
    const batchResults = await Promise.all(batch.map(executeTool))
    results.push(...batchResults)
  }

  return results
}

// Format functions to make results more useful for the agent

function formatPapersForAgent(papers: PaperSearchResult[]): {
  count: number
  papers: {
    id: string
    title: string
    authors: string
    year: number
    citations: number
    abstract: string
    url: string
    venue: string
  }[]
} {
  return {
    count: papers.length,
    papers: papers.map(p => ({
      id: p.paperId,
      title: p.title,
      authors: p.authors.map(a => a.name).join(', ') || 'Unknown',
      year: p.year,
      citations: p.citationCount,
      abstract: p.abstract ? truncate(p.abstract, 300) : 'No abstract available',
      url: p.url,
      venue: p.venue || 'Unknown venue',
    })),
  }
}

function formatWebResultsForAgent(results: WebSearchResult[]): {
  count: number
  results: {
    title: string
    url: string
    snippet: string
    source: string
  }[]
} {
  return {
    count: results.length,
    results: results.map(r => ({
      title: r.title,
      url: r.url,
      snippet: truncate(r.snippet, 200),
      source: r.source,
    })),
  }
}

function formatPaperDetailsForAgent(paper: PaperDetails): {
  id: string
  title: string
  authors: string
  year: number
  citations: number
  abstract: string
  url: string
  venue: string
  fields: string[]
  topReferences: { title: string; id: string }[]
  topCitations: { title: string; id: string }[]
} {
  return {
    id: paper.paperId,
    title: paper.title,
    authors: paper.authors.map(a => a.name).join(', ') || 'Unknown',
    year: paper.year,
    citations: paper.citationCount,
    abstract: paper.abstract || 'No abstract available',
    url: paper.url,
    venue: paper.venue || 'Unknown venue',
    fields: paper.fieldsOfStudy || [],
    topReferences: (paper.references || []).slice(0, 5).map(r => ({
      title: r.title,
      id: r.paperId,
    })),
    topCitations: (paper.citations || []).slice(0, 5).map(c => ({
      title: c.title,
      id: c.paperId,
    })),
  }
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

/**
 * Format tool results for sending back to Gemini
 */
export function formatToolResultsForGemini(results: ToolResult[]): string {
  return results
    .map(r => {
      if (r.error) {
        return `Tool "${r.name}" failed: ${r.error}`
      }
      return `Tool "${r.name}" returned:\n${JSON.stringify(r.result, null, 2)}`
    })
    .join('\n\n---\n\n')
}
