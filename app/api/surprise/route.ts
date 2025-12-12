import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { searchPapers, formatAuthors, getLastStudiedYear } from '@/lib/papers'
import { InitialAnalysis } from '@/lib/store'
import {
  SYSTEM_PROMPT,
  formatPaperResultsForPrompt,
  detectFrontierFromPapers,
} from '@/lib/prompts'
import { rateLimit, getClientId } from '@/lib/rate-limit'

const MODEL_NAME = 'gemini-3-pro-preview'

// Rate limit: 10 requests per minute per IP
const RATE_LIMIT_CONFIG = { maxRequests: 10, windowMs: 60 * 1000 }

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientId(request)
    const { success, remaining, resetIn } = rateLimit(clientId, RATE_LIMIT_CONFIG)

    if (!success) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${Math.ceil(resetIn / 1000)} seconds.` },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(resetIn / 1000)),
          },
        }
      )
    }

    const body = await request.json()
    const { topic, teaser, category } = body

    if (!topic) {
      return NextResponse.json({ error: 'No topic provided' }, { status: 400 })
    }

    // If no API key, return mock data
    if (!process.env.GEMINI_API_KEY) {
      await new Promise(resolve => setTimeout(resolve, 1500))
      return NextResponse.json(getMockAnalysis(topic, teaser, category))
    }

    // Step 1: Search for papers on this topic
    const papers = await searchPapers(topic, 20)
    const formattedPapers = papers.slice(0, 10).map(p => ({
      title: p.title,
      authors: formatAuthors(p.authors),
      year: p.year,
      citationCount: p.citationCount,
    }))

    const paperContext = formatPaperResultsForPrompt(formattedPapers)
    const { researchHeat } = detectFrontierFromPapers(papers)
    const lastStudied = getLastStudiedYear(papers)

    // Step 2: Generate analysis with Gemini
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

    const prompt = buildSurpriseAnalysisPrompt(topic, teaser, category, paperContext)
    const fullPrompt = `${SYSTEM_PROMPT}\n\n---\n\n${prompt}`

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      config: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    })

    const text = response.text || ''

    // Parse the response
    let parsedAnalysis: {
      identification?: {
        name?: string
        confidence?: number
        oneLiner?: string
      }
      doors?: Array<{
        id?: string
        title?: string
        teaser?: string
      }>
    } = {}

    try {
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedAnalysis = JSON.parse(jsonMatch[1] || jsonMatch[0])
      }
    } catch (e) {
      console.error('Failed to parse surprise analysis:', e)
    }

    // Build response
    const identification = {
      name: parsedAnalysis.identification?.name || topic,
      confidence: normalizeConfidence(parsedAnalysis.identification?.confidence),
      oneLiner: parsedAnalysis.identification?.oneLiner || teaser || `Exploring ${topic}...`,
    }

    const doors: InitialAnalysis['doors'] = (parsedAnalysis.doors || []).map(door => ({
      id: (door.id as 'science' | 'unknown' | 'experiment') || 'science',
      title: door.title || 'Explore',
      teaser: door.teaser || 'Discover more...',
      paperHint: researchHeat,
    }))

    // Fallback doors if none parsed
    if (doors.length === 0) {
      doors.push(
        { id: 'science', title: 'The Science', teaser: `How ${topic} works`, paperHint: researchHeat },
        { id: 'unknown', title: 'The Unknown', teaser: 'What we don\'t know yet', paperHint: researchHeat },
        { id: 'experiment', title: 'Investigate', teaser: 'Ways to explore this yourself', paperHint: researchHeat },
      )
    }

    const analysis: InitialAnalysis = {
      identification,
      doors,
      paperCount: papers.length,
      lastStudied,
      researchActivity: researchHeat,
    }

    return NextResponse.json(analysis)

  } catch (error) {
    console.error('Surprise analysis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}

function buildSurpriseAnalysisPrompt(topic: string, teaser: string, category: string, paperContext: string): string {
  return `You are analyzing a fascinating scientific topic that a curious user wants to explore.

TOPIC: "${topic}"
CATEGORY: ${category}
TEASER: "${teaser}"

PAPER SEARCH RESULTS:
${paperContext}

Based on the papers found, generate an analysis of this topic with three exploration paths.

Respond with JSON:
{
  "identification": {
    "name": "The topic name (can refine the original)",
    "confidence": 0.0-1.0 (how well-understood is this topic?),
    "oneLiner": "A compelling one-sentence hook that makes the reader want to explore"
  },
  "doors": [
    {
      "id": "science",
      "title": "The Science",
      "teaser": "Specific scientific angle to explore (based on papers)"
    },
    {
      "id": "unknown",
      "title": "The Unknown",
      "teaser": "A genuine mystery or open question in this area"
    },
    {
      "id": "experiment",
      "title": "Investigate",
      "teaser": "How someone could explore or learn about this themselves"
    }
  ]
}

Make each door teaser specific and compelling based on what you know about this topic and the papers found.
The "unknown" door should point to a REAL gap in scientific knowledge, not something trivial.`
}

function normalizeConfidence(value: number | undefined): number {
  if (value === undefined) return 70
  if (value <= 1) return Math.round(value * 100)
  return Math.max(0, Math.min(100, Math.round(value)))
}

function getMockAnalysis(topic: string, teaser: string, category: string): InitialAnalysis {
  return {
    identification: {
      name: topic,
      confidence: 75,
      oneLiner: teaser || `Discover the fascinating science behind ${topic}`,
    },
    doors: [
      { id: 'science', title: 'The Science', teaser: `How ${topic} works at a fundamental level`, paperHint: 'warm' },
      { id: 'unknown', title: 'The Unknown', teaser: 'Open questions scientists are still investigating', paperHint: 'warm' },
      { id: 'experiment', title: 'Investigate', teaser: 'Ways to explore this topic yourself', paperHint: 'warm' },
    ],
    paperCount: 42,
    lastStudied: '2024',
    researchActivity: 'warm',
    _demo: true,
  } as InitialAnalysis & { _demo: boolean }
}
