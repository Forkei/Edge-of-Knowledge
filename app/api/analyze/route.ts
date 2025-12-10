import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { searchPapers, formatAuthors, calculateResearchHeat, getLastStudiedYear } from '@/lib/papers'
import { InitialAnalysis } from '@/lib/store'
import {
  SYSTEM_PROMPT,
  INITIAL_ANALYSIS_PROMPT,
  formatPaperResultsForPrompt,
  detectFrontierFromPapers,
} from '@/lib/prompts'

const MODEL_NAME = 'gemini-2.5-flash-preview-05-20'

// Mock response for development without API key
const MOCK_ANALYSIS: InitialAnalysis = {
  identification: {
    name: 'Monarch Butterfly Wing',
    confidence: 87,
    oneLiner: 'A marvel of natural engineering where nanoscale structures create brilliant color without pigments.',
  },
  doors: [
    {
      id: 'science',
      title: 'The Science',
      teaser: 'How microscopic structures bend light to create color',
      paperHint: 'hot',
    },
    {
      id: 'unknown',
      title: 'The Unknown',
      teaser: 'Mysteries of how genes encode nanostructures',
      paperHint: 'warm',
    },
    {
      id: 'experiment',
      title: 'Investigate',
      teaser: 'Experiments you can do to explore structural color',
      paperHint: 'warm',
    },
  ],
  paperCount: 47,
  lastStudied: '2024',
  researchActivity: 'hot',
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { image, mimeType, context } = body

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // If no API key, return mock data
    if (!process.env.GEMINI_API_KEY) {
      await new Promise(resolve => setTimeout(resolve, 1500))
      return NextResponse.json({
        ...MOCK_ANALYSIS,
        _demo: true,
      })
    }

    // Initialize Gemini
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

    // Step 1: Quick identification to get a subject for paper search
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
    let subjectName = 'unknown observation'

    try {
      const jsonMatch = quickIdText.match(/```(?:json)?\s*([\s\S]*?)```/) || quickIdText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0])
        subjectName = parsed.name || subjectName
      }
    } catch {
      // If JSON parsing fails, try to extract just the name
      const nameMatch = quickIdText.match(/"name"\s*:\s*"([^"]+)"/)
      if (nameMatch) {
        subjectName = nameMatch[1]
      }
    }

    // Step 2: Search for papers based on identified subject
    const papers = await searchPapers(subjectName, 20)
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
    const fullAnalysisPrompt = buildFullAnalysisPrompt(context, subjectName, paperContext)

    // Prepend system prompt to the user prompt (SDK doesn't support systemInstruction separately)
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
        temperature: 1.0,
        maxOutputTokens: 2048,
      },
    })

    const analysisText = analysisResponse.text || ''

    // Parse the full analysis
    let parsedAnalysis: {
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

    // Build the response, merging Gemini output with paper data
    const identification = {
      name: parsedAnalysis.identification?.name || subjectName,
      confidence: normalizeConfidence(parsedAnalysis.identification?.confidence),
      oneLiner: parsedAnalysis.identification?.oneLiner || `Exploring ${subjectName}...`,
    }

    // Map doors with proper paperHint from actual paper data
    const doors: InitialAnalysis['doors'] = (parsedAnalysis.doors || []).map(door => ({
      id: (door.id as 'science' | 'unknown' | 'experiment') || 'science',
      title: door.title || 'Explore',
      teaser: door.teaser || 'Discover more...',
      paperHint: researchHeat,
    }))

    // Fallback doors if none parsed
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

    return NextResponse.json(analysis)

  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}

// Quick identification to get subject for paper search
function buildQuickIdentificationPrompt(context?: string): string {
  const contextSection = context ? `\nUser context: "${context}"` : ''

  return `Quickly identify what is in this image.${contextSection}

Respond with JSON only:
{
  "name": "Specific scientific name (e.g., 'Danaus plexippus wing' not just 'butterfly')"
}

Be as specific as possible. This will be used to search academic papers.`
}

// Full analysis with paper context injected
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

// Normalize confidence to 0-100 scale
function normalizeConfidence(value: number | undefined): number {
  if (value === undefined) return 70
  // If it's a decimal (0-1), convert to percentage
  if (value <= 1) return Math.round(value * 100)
  // If it's already a percentage, clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(value)))
}
