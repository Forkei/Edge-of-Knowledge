// Tool definitions for Gemini function calling
// These define the tools available to the research agent

import { FunctionDeclaration } from '@google/genai'

// Using parametersJsonSchema for raw JSON schema format
export const RESEARCH_TOOLS: FunctionDeclaration[] = [
  {
    name: 'search_academic_papers',
    description: 'Search Semantic Scholar for academic papers on a topic. Returns title, authors, year, citation count, and abstract. Use this for scientific research and peer-reviewed literature.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for academic papers (e.g., "quantum entanglement biology", "photonic crystals butterflies")'
        },
        limit: {
          type: 'number',
          description: 'Max papers to return (1-20, default 10)'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'search_web',
    description: 'Search the web for general information, news, Wikipedia articles, and recent developments. Good for context that may not be in academic papers, recent news, and general explanations.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Web search query for general information'
        },
        limit: {
          type: 'number',
          description: 'Max results to return (1-10, default 5)'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'get_paper_details',
    description: 'Get full details of a specific paper including abstract, references, and citations. Use this when you need more information about a promising paper.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        paperId: {
          type: 'string',
          description: 'Semantic Scholar paper ID from a previous search'
        }
      },
      required: ['paperId']
    }
  },
  {
    name: 'finish_research',
    description: 'Call this when you have gathered enough information to generate the exploration content. You should have 5-15 quality papers and some web context before calling this.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: 'Brief summary of what you learned from your research'
        },
        confidence: {
          type: 'number',
          description: 'Confidence level 0-1 that you have enough info to create a good exploration'
        },
        key_papers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Paper IDs of the most relevant papers found'
        },
        frontier_detected: {
          type: 'boolean',
          description: 'Whether you detected a research frontier (gap in knowledge, active debate, or unsolved problem)'
        }
      },
      required: ['summary', 'confidence']
    }
  }
]

// Type for tool call arguments
export interface SearchAcademicPapersArgs {
  query: string
  limit?: number
}

export interface SearchWebArgs {
  query: string
  limit?: number
}

export interface GetPaperDetailsArgs {
  paperId: string
}

export interface FinishResearchArgs {
  summary: string
  confidence: number
  key_papers?: string[]
  frontier_detected?: boolean
}

export type ToolArgs =
  | SearchAcademicPapersArgs
  | SearchWebArgs
  | GetPaperDetailsArgs
  | FinishResearchArgs
