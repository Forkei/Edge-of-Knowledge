// =============================================================================
// EDGE OF KNOWLEDGE — PROMPT TEMPLATES
// =============================================================================

// -----------------------------------------------------------------------------
// SYSTEM PROMPT — Sets the tone and mission
// -----------------------------------------------------------------------------
export const SYSTEM_PROMPT = `You are a scientific curiosity guide — part explorer, part teacher, part fellow wonderer.

Your mission is NOT to explain things. Your mission is to reveal WHERE KNOWLEDGE ENDS.

When someone shows you an observation, you:
1. IDENTIFY what they're seeing with scientific precision
2. MAP what humanity knows, debates, and doesn't know about it
3. SPARK genuine research questions they hadn't thought to ask
4. PROPOSE experiments they could actually do
5. CONNECT their observation to the broader tapestry of science

You are honest about uncertainty. When something is genuinely unknown, you say so with excitement — that's where discovery lives. When something is well-established, you say so with confidence.

You never make things up. If you're uncertain, you say "this appears to be" or "likely" — never false confidence.

Your tone: Curious, warm, precise. Like a scientist friend who's genuinely excited to explore with them.`

// -----------------------------------------------------------------------------
// INITIAL ANALYSIS PROMPT — First response after image upload
// -----------------------------------------------------------------------------
export const INITIAL_ANALYSIS_PROMPT = `Analyze this image and any context provided.

Provide a BRIEF initial analysis — this is just the entry point, not the full exploration.

Return JSON in this exact format:
{
  "identification": {
    "name": "Scientific name or description",
    "commonName": "Common name if applicable",
    "confidence": 0.0-1.0,
    "category": "biology|chemistry|physics|geology|meteorology|materials|other",
    "oneLiner": "One compelling sentence about what this is"
  },
  "doors": [
    {
      "id": "science",
      "title": "The Science",
      "teaser": "One sentence hook — what would they learn?",
      "icon": "🔬"
    },
    {
      "id": "unknown",
      "title": "The Unknown",
      "teaser": "One sentence hook — what mysteries await?",
      "icon": "🌌"
    },
    {
      "id": "experiment",
      "title": "Investigate",
      "teaser": "One sentence hook — what could they try?",
      "icon": "🧪"
    }
  ],
  "quickStats": {
    "researchActivity": "hot|warm|cold|dormant",
    "fieldsInvolved": ["field1", "field2"],
    "surpriseFactor": "A short phrase about what's unexpected or interesting"
  }
}

IMPORTANT:
- The "teaser" for each door should make them WANT to click
- Be specific to THIS observation, not generic
- Confidence should reflect YOUR certainty, not the science's certainty
- Keep it SHORT — details come when they explore`

// -----------------------------------------------------------------------------
// BRANCH EXPLORATION PROMPT — When user clicks a door/branch
// -----------------------------------------------------------------------------
export function buildBranchExplorationPrompt(
  branchType: string,
  observation: string,
  paperResults: string
): string {
  return `The user is exploring: "${branchType}" for their observation of "${observation}".

You have access to paper search results below. USE THEM to ground your response.

PAPER SEARCH RESULTS:
${paperResults}

Based on these papers (or lack thereof), provide a focused exploration.

Return JSON in this exact format:
{
  "headline": "5-7 word compelling headline",
  "summary": "2-3 sentences MAX. Be specific. Cite papers if relevant.",
  "depth": "known|investigated|debated|unknown|frontier",
  "confidence": 0-100,
  "researchHeat": "hot|warm|cold|dormant",

  "evidence": {
    "paperCount": number,
    "mostRecentYear": number or null,
    "oldestYear": number or null,
    "topCitations": [
      {"title": "...", "authors": "...", "year": 2024, "citationCount": 100}
    ]
  },

  "knowledgeMap": {
    "established": ["Fact 1 with high consensus", "Fact 2"],
    "debated": ["Active debate 1", "Controversy 2"],
    "unknown": ["Genuine unknown 1", "Open question 2"]
  },

  "branches": [
    {
      "id": "unique-id",
      "title": "2-4 words",
      "teaser": "Why this is worth exploring",
      "type": "science|unknown|experiment|deeper",
      "searchQuery": "What to search if they click this"
    }
  ],

  "isFrontier": boolean,
  "frontierReason": "If isFrontier is true, explain why in one sentence"
}

FRONTIER DETECTION RULES:
- isFrontier = true if:
  - Paper search returned 0-2 results
  - Most recent paper is 5+ years old
  - The specific aspect being asked about has no direct research
  - You find genuine contradictions with no resolution
- isFrontier = false if:
  - Multiple recent papers exist
  - The topic is well-covered even if complex
  - Uncertainty is due to YOUR knowledge limits, not humanity's

CRITICAL:
- Ground claims in the paper results
- If papers found: cite them, mention years, show this is real research
- If no papers: this might be a genuine frontier — say so honestly
- Never invent citations
- "Unknown" means HUMANITY doesn't know, not that YOU don't know`
}

// -----------------------------------------------------------------------------
// EXPERIMENT GENERATION PROMPT — For the "Investigate" branch
// -----------------------------------------------------------------------------
export function buildExperimentPrompt(observation: string, paperResults: string): string {
  return `Generate safe, accessible experiments for investigating: "${observation}"

PAPER SEARCH RESULTS:
${paperResults}

Return JSON:
{
  "experiments": [
    {
      "title": "Experiment name",
      "hypothesis": "What we're testing",
      "difficulty": "beginner|intermediate|advanced",
      "timeRequired": "e.g., 30 minutes",
      "materials": ["item 1", "item 2"],
      "steps": ["Step 1", "Step 2"],
      "expectedOutcome": "What should happen if hypothesis is correct",
      "alternativeOutcome": "What it means if something else happens",
      "realScience": "How this relates to actual research methods",
      "safetyNotes": "Any precautions needed"
    }
  ],
  "whyTheseWork": "Brief explanation of experimental approach",
  "limitations": "What these experiments CAN'T tell us"
}

RULES:
- Beginner: Household items only, completely safe, anyone can do
- Intermediate: May need a few special items (magnifying glass, pH strips)
- Advanced: More complex but still accessible (no lab equipment)
- NEVER suggest anything dangerous
- Each experiment should actually test something meaningful
- Connect to real scientific methodology`
}

// -----------------------------------------------------------------------------
// QUESTION GENERATION PROMPT — For generating research questions
// -----------------------------------------------------------------------------
export function buildQuestionsPrompt(observation: string, paperResults: string): string {
  return `Generate research questions inspired by: "${observation}"

PAPER SEARCH RESULTS:
${paperResults}

Return JSON:
{
  "questions": {
    "surface": [
      {
        "question": "The question",
        "whyInteresting": "Why this matters",
        "howToAnswer": "How someone could find the answer"
      }
    ],
    "intermediate": [...],
    "frontier": [...]
  },
  "biggestOpenQuestion": "The most fascinating unanswered question",
  "potentialDiscovery": "What finding this answer could mean for science"
}

SURFACE = Answerable with basic research or observation
INTERMEDIATE = Requires specialized knowledge or tools
FRONTIER = At the genuine edge of human knowledge

For FRONTIER questions:
- Check paper results — if heavily researched, it's not frontier
- True frontiers are specific, not vague
- "Why does X exist?" is too broad
- "Why does X show Y pattern in Z conditions?" is frontier-worthy`
}

// -----------------------------------------------------------------------------
// CONFIDENCE CALIBRATION
// -----------------------------------------------------------------------------
export const CONFIDENCE_GUIDE: Record<number, string> = {
  95: "I'm certain — this is well-documented",
  85: "High confidence — strong evidence supports this",
  70: "Moderate confidence — generally accepted but some nuance",
  50: "Uncertain — evidence is mixed or limited",
  30: "Speculative — based on limited data or inference",
  10: "Highly uncertain — this is my best guess",
}

export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 90) return CONFIDENCE_GUIDE[95]
  if (confidence >= 80) return CONFIDENCE_GUIDE[85]
  if (confidence >= 60) return CONFIDENCE_GUIDE[70]
  if (confidence >= 40) return CONFIDENCE_GUIDE[50]
  if (confidence >= 20) return CONFIDENCE_GUIDE[30]
  return CONFIDENCE_GUIDE[10]
}

// -----------------------------------------------------------------------------
// DEPTH LEVELS
// -----------------------------------------------------------------------------
export const DEPTH_LEVELS = {
  known: {
    label: "Well Established",
    description: "Strong scientific consensus, extensively studied",
    color: "blue",
    bgClass: "bg-blue-500/10",
  },
  investigated: {
    label: "Investigated",
    description: "Significant research exists, generally understood",
    color: "cyan",
    bgClass: "bg-cyan-500/10",
  },
  debated: {
    label: "Actively Debated",
    description: "Scientists disagree or evidence is conflicting",
    color: "amber",
    bgClass: "bg-amber-500/10",
  },
  unknown: {
    label: "Understudied",
    description: "Limited research, many open questions",
    color: "purple",
    bgClass: "bg-purple-500/10",
  },
  frontier: {
    label: "Frontier",
    description: "At the edge of human knowledge",
    color: "pink",
    bgClass: "bg-pink-500/10",
  },
} as const

export type DepthLevel = keyof typeof DEPTH_LEVELS

// -----------------------------------------------------------------------------
// RESEARCH HEAT INDICATORS
// -----------------------------------------------------------------------------
export const RESEARCH_HEAT = {
  hot: {
    label: "Hot",
    description: "Active research in the last 2 years",
    icon: "🔥",
    color: "text-orange-400",
  },
  warm: {
    label: "Active",
    description: "Research ongoing in the last 5 years",
    icon: "☀️",
    color: "text-yellow-400",
  },
  cold: {
    label: "Slow",
    description: "Limited recent activity",
    icon: "❄️",
    color: "text-blue-400",
  },
  dormant: {
    label: "Dormant",
    description: "No recent research found",
    icon: "🌑",
    color: "text-gray-400",
  },
} as const

export type ResearchHeatLevel = keyof typeof RESEARCH_HEAT

// -----------------------------------------------------------------------------
// HELPER: Format paper results for prompt injection
// -----------------------------------------------------------------------------
export function formatPaperResultsForPrompt(
  papers: Array<{
    title: string
    authors: string
    year: number
    citationCount?: number
    abstract?: string
  }>
): string {
  if (papers.length === 0) {
    return `NO PAPERS FOUND.
This is significant — it may indicate:
- A genuine frontier of knowledge
- A topic that hasn't been formally studied
- A need to search with different terms

Treat this carefully. If no research exists, say so honestly.`
  }

  const currentYear = new Date().getFullYear()
  const years = papers.map(p => p.year)
  const mostRecent = Math.max(...years)
  const oldest = Math.min(...years)
  const recentCount = papers.filter(p => p.year >= currentYear - 3).length

  let summary = `Found ${papers.length} papers (${oldest}-${mostRecent})\n`
  summary += `Recent papers (last 3 years): ${recentCount}\n\n`

  summary += `TOP PAPERS:\n`
  papers.slice(0, 5).forEach((p, i) => {
    summary += `${i + 1}. "${p.title}" (${p.year})\n`
    summary += `   Authors: ${p.authors}\n`
    if (p.citationCount !== undefined) {
      summary += `   Citations: ${p.citationCount}\n`
    }
    if (p.abstract) {
      summary += `   Abstract: ${p.abstract.slice(0, 200)}...\n`
    }
    summary += '\n'
  })

  if (recentCount === 0) {
    summary += `\n⚠️ NOTE: No papers in the last 3 years. This area may be understudied or considered settled.`
  } else if (recentCount >= 3) {
    summary += `\n✓ Active research area with ${recentCount} recent publications.`
  }

  return summary
}

// -----------------------------------------------------------------------------
// HELPER: Detect frontier from paper data
// -----------------------------------------------------------------------------
export function detectFrontierFromPapers(
  papers: Array<{ year: number; citationCount?: number }>,
  geminiConfidence?: number
): {
  isFrontier: boolean
  frontierReason: string | null
  depth: DepthLevel
  researchHeat: ResearchHeatLevel
} {
  const currentYear = new Date().getFullYear()
  const recentPapers = papers.filter(p => p.year >= currentYear - 3)
  const veryRecentPapers = papers.filter(p => p.year >= currentYear - 2)

  // Determine research heat
  let researchHeat: ResearchHeatLevel
  if (veryRecentPapers.length >= 3) {
    researchHeat = 'hot'
  } else if (recentPapers.length >= 2) {
    researchHeat = 'warm'
  } else if (papers.length > 0) {
    researchHeat = 'cold'
  } else {
    researchHeat = 'dormant'
  }

  // Frontier detection
  if (papers.length === 0) {
    return {
      isFrontier: true,
      frontierReason: 'No published research specifically addresses this observation.',
      depth: 'frontier',
      researchHeat,
    }
  }

  if (papers.length <= 2 && recentPapers.length === 0) {
    return {
      isFrontier: true,
      frontierReason: `Only ${papers.length} papers found, none in the last 3 years.`,
      depth: 'frontier',
      researchHeat,
    }
  }

  const latestYear = Math.max(...papers.map(p => p.year))
  if (latestYear < currentYear - 5) {
    return {
      isFrontier: true,
      frontierReason: `Research appears dormant — last paper published in ${latestYear}.`,
      depth: 'frontier',
      researchHeat,
    }
  }

  // Not frontier — determine depth
  let depth: DepthLevel

  if (papers.length <= 5 || (geminiConfidence !== undefined && geminiConfidence < 40)) {
    depth = 'unknown'
  } else if (recentPapers.length >= 3 || (geminiConfidence !== undefined && geminiConfidence < 60)) {
    depth = 'debated'
  } else if (geminiConfidence !== undefined && geminiConfidence < 80) {
    depth = 'investigated'
  } else if (papers.length >= 10 && (geminiConfidence === undefined || geminiConfidence >= 80)) {
    depth = 'known'
  } else {
    depth = 'investigated'
  }

  return {
    isFrontier: false,
    frontierReason: null,
    depth,
    researchHeat,
  }
}
