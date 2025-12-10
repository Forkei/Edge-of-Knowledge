import { GoogleGenAI } from '@google/genai'

// Model: Gemini 3 Pro Preview - Google's most advanced reasoning model
// 1M token context window, 64k token output
const MODEL_NAME = 'gemini-3-pro-preview'

export interface AnalysisResult {
  identification: {
    name: string
    category: string
    confidence: number
    description: string
  }
  mechanism: {
    explanation: string
    keyPrinciples: string[]
  }
  knowledgeMap: {
    established: Array<{
      fact: string
      confidence: number
      source?: string
    }>
    debated: Array<{
      topic: string
      perspectives: string[]
      whyDebated: string
    }>
    unknown: Array<{
      question: string
      whyUnknown: string
      potentialApproaches: string[]
    }>
  }
  questions: Array<{
    question: string
    depth: 'surface' | 'intermediate' | 'frontier'
    relatedField: string
  }>
  hypotheses: Array<{
    hypothesis: string
    experiment: {
      title: string
      materials: string[]
      steps: string[]
      expectedOutcome: string
      difficulty: 'beginner' | 'intermediate' | 'advanced'
    }
  }>
  connections: Array<{
    field: string
    connection: string
    insight: string
  }>
}

// Retry logic for transient failures
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Don't retry on certain errors
      if (lastError.message.includes('API key') ||
          lastError.message.includes('quota') ||
          lastError.message.includes('invalid') ||
          lastError.message.includes('PERMISSION_DENIED')) {
        throw lastError
      }

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)))
      }
    }
  }

  throw lastError
}

export async function analyzeImage(
  imageBase64: string,
  mimeType: string,
  userContext?: string
): Promise<AnalysisResult> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured. Please add it to your .env.local file.')
  }

  // Initialize the new Google GenAI SDK
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

  const prompt = buildAnalysisPrompt(userContext)

  const result = await withRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: imageBase64,
              },
            },
          ],
        },
      ],
      config: {
        // Gemini 3 Pro specific settings
        // Keep temperature at default 1.0 to avoid looping on complex reasoning
        temperature: 1.0,
        maxOutputTokens: 8192,
        // Use high thinking level for complex scientific analysis
        thinkingConfig: {
          thinkingBudget: 8192,
        },
      },
    })

    return response
  })

  const text = result.text || ''

  // Parse the JSON response - handle various formats
  let jsonStr: string | null = null

  // Try to extract from code blocks first
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim()
  }

  // If no code block, try to find raw JSON
  if (!jsonStr) {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonStr = jsonMatch[0]
    }
  }

  if (!jsonStr) {
    console.error('Failed to extract JSON from response:', text.substring(0, 500))
    throw new Error('Failed to parse AI response. The model did not return valid JSON.')
  }

  try {
    const parsed = JSON.parse(jsonStr) as AnalysisResult

    // Validate required fields exist
    if (!parsed.identification || !parsed.knowledgeMap || !parsed.hypotheses) {
      throw new Error('Response missing required fields')
    }

    return parsed
  } catch (parseError) {
    console.error('JSON parse error:', parseError, '\nRaw JSON:', jsonStr.substring(0, 500))
    throw new Error('Failed to parse AI response as valid JSON structure.')
  }
}

function buildAnalysisPrompt(userContext?: string): string {
  const contextSection = userContext
    ? `\n\nUSER CONTEXT: "${userContext}"\nPay special attention to what the user mentioned.`
    : ''

  return `You are "Edge of Knowledge" - a scientific curiosity guide that maps observations against the boundary of human knowledge.

MISSION: Don't just identify what's in the image. Reveal where established science ends, where debate begins, and where mystery remains. Inspire the observer to become a scientist themselves.

Analyze this image and respond with ONLY valid JSON (no other text):${contextSection}

{
  "identification": {
    "name": "Specific scientific name or identification",
    "category": "Scientific domain (e.g., 'Botany / Seed Dispersal', 'Physics / Optics')",
    "confidence": 0.0 to 1.0,
    "description": "What we're observing, written to spark curiosity"
  },
  "mechanism": {
    "explanation": "How this works at a fundamental level - the science behind what we see",
    "keyPrinciples": ["Core scientific principle 1", "Core principle 2", "Core principle 3"]
  },
  "knowledgeMap": {
    "established": [
      {
        "fact": "Something science knows with high confidence about this",
        "confidence": 0.85 to 1.0,
        "source": "Field of study or notable research"
      },
      {
        "fact": "Another established fact",
        "confidence": 0.85 to 1.0,
        "source": "Source"
      }
    ],
    "debated": [
      {
        "topic": "An area where scientists actively disagree",
        "perspectives": ["One scientific view", "Competing scientific view"],
        "whyDebated": "Why this remains controversial or unresolved"
      }
    ],
    "unknown": [
      {
        "question": "A genuine frontier question science hasn't answered",
        "whyUnknown": "What makes this genuinely difficult to know",
        "potentialApproaches": ["How future research might tackle this"]
      },
      {
        "question": "Another unknown at the edge of knowledge",
        "whyUnknown": "The barrier to understanding",
        "potentialApproaches": ["Possible research directions"]
      }
    ]
  },
  "questions": [
    {
      "question": "A question this observation naturally raises",
      "depth": "surface",
      "relatedField": "Scientific field"
    },
    {
      "question": "A deeper question requiring more investigation",
      "depth": "intermediate",
      "relatedField": "Scientific field"
    },
    {
      "question": "A question at the frontier of human knowledge",
      "depth": "frontier",
      "relatedField": "Scientific field"
    }
  ],
  "hypotheses": [
    {
      "hypothesis": "A testable prediction the observer could investigate",
      "experiment": {
        "title": "Name of the experiment",
        "materials": ["Common item 1", "Common item 2", "etc."],
        "steps": ["Clear step 1", "Clear step 2", "Clear step 3", "Clear step 4"],
        "expectedOutcome": "What you'd expect to observe if the hypothesis is correct",
        "difficulty": "beginner"
      }
    },
    {
      "hypothesis": "Another testable hypothesis",
      "experiment": {
        "title": "Experiment name",
        "materials": ["Item 1", "Item 2"],
        "steps": ["Step 1", "Step 2", "Step 3"],
        "expectedOutcome": "Expected results",
        "difficulty": "intermediate"
      }
    }
  ],
  "connections": [
    {
      "field": "A related but unexpected scientific field",
      "connection": "How this observation connects to that field",
      "insight": "A deeper insight from making this connection"
    },
    {
      "field": "Another connected field",
      "connection": "The link",
      "insight": "Why this matters"
    },
    {
      "field": "Practical application field",
      "connection": "Real-world connection",
      "insight": "How this knowledge is being used"
    }
  ]
}

CRITICAL REQUIREMENTS:
1. Return ONLY the JSON object - no markdown, no explanation, no preamble
2. The "unknown" section must contain GENUINE scientific mysteries, not just things a layperson wouldn't know
3. Experiments must be SAFE and use commonly available materials
4. Be honest about confidence levels - if uncertain, say so
5. Include at least 2 items in each array section
6. Make the content accessible but scientifically accurate
7. Inspire wonder - this is about the joy of discovery`
}

export { MODEL_NAME }
