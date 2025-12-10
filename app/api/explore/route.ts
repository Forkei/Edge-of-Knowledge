import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { searchPapers, formatAuthors } from '@/lib/papers'
import { BranchContent, Citation, KnowledgeDepth } from '@/lib/store'
import {
  SYSTEM_PROMPT,
  buildBranchExplorationPrompt,
  buildExperimentPrompt,
  formatPaperResultsForPrompt,
  detectFrontierFromPapers,
} from '@/lib/prompts'
import { rateLimit, getClientId } from '@/lib/rate-limit'

const MODEL_NAME = 'gemini-3-pro-preview'

// Rate limit: 20 requests per minute per IP (more lenient for exploration)
const RATE_LIMIT_CONFIG = { maxRequests: 20, windowMs: 60 * 1000 }

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
    const { branchType, branchId, branchTitle, context, searchQuery } = body

    if (!process.env.GEMINI_API_KEY) {
      // Return mock data for development
      return NextResponse.json(getMockBranchContent(branchType))
    }

    // Step 1: Search for relevant papers FIRST
    // Use searchQuery if provided (from previous branch), otherwise use context + branchTitle
    const query = searchQuery || `${context} ${branchTitle || branchType}`.trim()
    const papers = await searchPapers(query, 15)

    // Format papers for prompt injection
    const formattedPapers = papers.slice(0, 10).map(p => ({
      title: p.title,
      authors: formatAuthors(p.authors),
      year: p.year,
      citationCount: p.citationCount,
    }))
    const paperContext = formatPaperResultsForPrompt(formattedPapers)

    // Format citations for response
    const citations: Citation[] = papers.slice(0, 5).map(p => ({
      paperId: p.paperId,
      title: p.title,
      authors: formatAuthors(p.authors),
      year: p.year,
      citationCount: p.citationCount,
      url: p.url,
    }))

    // Pre-calculate frontier status from paper data
    const paperAnalysis = detectFrontierFromPapers(papers)

    // Step 2: Build the appropriate prompt
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

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

    // Step 3: Generate response with system prompt
    // Prepend system prompt to the user prompt (SDK doesn't support systemInstruction separately)
    const fullPrompt = `${SYSTEM_PROMPT}\n\n---\n\n${prompt}`

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      config: {
        temperature: 1.0,
        maxOutputTokens: 4096,
      },
    })

    const text = response.text || ''

    // Step 4: Parse JSON from response
    let content: ParsedExploreResponse = {}
    try {
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0]
        content = JSON.parse(jsonStr.trim())
      }
    } catch (e) {
      console.error('Failed to parse Gemini response:', e)
      console.error('Raw response:', text.slice(0, 500))
    }

    // Step 5: Determine final frontier status
    // Trust Gemini's assessment but verify with paper data
    const geminiSaysFrontier = content.isFrontier === true
    const papersSayFrontier = paperAnalysis.isFrontier

    // Use paper analysis as ground truth, but allow Gemini to upgrade to frontier
    // if it provides a specific reason (might have detected something papers missed)
    const isFrontier = papersSayFrontier || (geminiSaysFrontier && !!content.frontierReason)

    // Determine depth - prefer paper analysis but let Gemini's confidence influence
    let depth: KnowledgeDepth = paperAnalysis.depth
    if (content.depth && isValidDepth(content.depth)) {
      // If Gemini says it's more frontier than papers suggest, trust Gemini
      if (depthOrder(content.depth) > depthOrder(paperAnalysis.depth)) {
        depth = content.depth
      }
    }

    // Override with frontier if detected
    if (isFrontier) {
      depth = 'frontier'
    }

    // Build final response
    const branchContent: BranchContent = {
      headline: content.headline || `Exploring ${branchTitle || branchType}`,
      summary: content.summary || 'Investigating this branch of knowledge...',
      citations,
      confidence: normalizeConfidence(content.confidence),
      researchHeat: paperAnalysis.researchHeat,
      branches: normalizeBranches(content.branches),
      experiments: normalizeExperiments(content.experiments),
      isFrontier,
      frontierReason: isFrontier
        ? (content.frontierReason || paperAnalysis.frontierReason || undefined)
        : undefined,
      depth,
      // Include knowledge map if provided
      ...(content.knowledgeMap && { knowledgeMap: content.knowledgeMap }),
    }

    return NextResponse.json(branchContent)

  } catch (error) {
    console.error('Explore API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Exploration failed' },
      { status: 500 }
    )
  }
}

// Types for parsed response
interface ParsedExploreResponse {
  headline?: string
  summary?: string
  depth?: string
  confidence?: number
  researchHeat?: string
  evidence?: {
    paperCount?: number
    mostRecentYear?: number | null
    oldestYear?: number | null
    topCitations?: Array<{
      title: string
      authors: string
      year: number
      citationCount: number
    }>
  }
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
    timeRequired?: string
    materials?: string[]
    steps?: string[]
    expectedOutcome?: string
    alternativeOutcome?: string
    realScience?: string
    safetyNotes?: string
  }>
  isFrontier?: boolean
  frontierReason?: string
}

// Helper functions
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

function normalizeConfidence(value: number | undefined): number {
  if (value === undefined) return 70
  if (value <= 1) return Math.round(value * 100)
  return Math.max(0, Math.min(100, Math.round(value)))
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

// Mock data for development
function getMockBranchContent(branchType: string): BranchContent {
  const mockData: Record<string, BranchContent> = {
    science: {
      headline: 'Structural Color Through Nanoscale Architecture',
      summary: 'The vibrant colors arise from microscopic structures, not pigments. Light interacts with nanoscale ridges creating interference patterns. This is called structural coloration.',
      citations: [
        { paperId: 'abc123', title: 'Photonic Crystals in Nature', authors: 'Chen et al.', year: 2024, citationCount: 45 },
        { paperId: 'def456', title: 'Structural Color Mechanisms', authors: 'Martinez, J.', year: 2023, citationCount: 89 },
      ],
      confidence: 85,
      researchHeat: 'hot',
      branches: [
        { id: 'nanoscale-structure', title: 'Nanoscale Structure', teaser: 'How the ridges create interference', type: 'science' },
        { id: 'color-evolution', title: 'Color Evolution', teaser: 'Why did this mechanism evolve?', type: 'unknown' },
        { id: 'diy-iridescence', title: 'DIY Iridescence', teaser: 'Create structural color at home', type: 'experiment' },
      ],
      isFrontier: false,
      depth: 'known',
    },
    unknown: {
      headline: 'Uncharted: Genetic Control of Nanostructures',
      summary: 'We don\'t fully understand how organisms genetically encode and construct such precise nanoscale structures. The gap between DNA and final structure remains one of biology\'s open questions.',
      citations: [
        { paperId: 'ghi789', title: 'Genetic Control of Structural Color', authors: 'Wang et al.', year: 2023, citationCount: 23 },
      ],
      confidence: 35,
      researchHeat: 'cold',
      branches: [
        { id: 'genetic-encoding', title: 'Genetic Encoding', teaser: 'How do genes specify nanostructures?', type: 'unknown' },
        { id: 'self-assembly', title: 'Self-Assembly', teaser: 'Do structures self-organize?', type: 'science' },
        { id: 'convergent-evolution', title: 'Convergent Evolution', teaser: 'Why did this evolve multiple times?', type: 'unknown' },
      ],
      isFrontier: true,
      frontierReason: 'Only 1 paper found addressing this specific question.',
      depth: 'frontier',
    },
    experiment: {
      headline: 'Investigate Structural Color at Home',
      summary: 'You can observe and experiment with structural coloration using everyday materials. These experiments reveal the physics of light interference.',
      citations: [],
      confidence: 90,
      researchHeat: 'warm',
      branches: [
        { id: 'soap-bubbles', title: 'Soap Film Colors', teaser: 'Thin film interference you can see', type: 'experiment' },
        { id: 'cd-diffraction', title: 'CD Diffraction', teaser: 'Diffraction gratings in your drawer', type: 'experiment' },
      ],
      experiments: [
        {
          id: 'angle-observation',
          title: 'Angle-Dependent Color Shift',
          hypothesis: 'Structural colors change with viewing angle',
          materials: ['Specimen or iridescent object', 'White paper', 'Light source', 'Protractor'],
          steps: [
            'Place specimen on white paper under consistent lighting',
            'Observe color at 0°, 30°, 45°, 60°, 90° angles',
            'Note which colors appear at which angles',
            'Compare to pigment-based colors which don\'t shift'
          ],
          expectedOutcome: 'Structural colors shift through spectrum as angle changes; pigments stay constant',
          difficulty: 'beginner',
        },
      ],
      isFrontier: false,
      depth: 'investigated',
    },
  }

  return mockData[branchType] || mockData.science
}
