// Text parser utility for identifying and wrapping scientific terms

export interface ScientificTerm {
  term: string           // e.g., "photonic crystals"
  definition: string     // Brief definition (1-2 sentences)
  searchQuery?: string   // Query to use if expanded to tab
  category?: string      // e.g., "physics", "biology"
}

export interface ParsedSegment {
  type: 'text' | 'term'
  content: string
  term?: ScientificTerm
}

/**
 * Parse text and identify scientific terms, returning segments for rendering
 *
 * @param text - The text to parse
 * @param terms - Array of scientific terms to identify
 * @returns Array of parsed segments (text or term)
 */
export function parseTermsInText(
  text: string,
  terms: ScientificTerm[]
): ParsedSegment[] {
  if (!terms || terms.length === 0) {
    return [{ type: 'text', content: text }]
  }

  // Sort terms by length (longest first to avoid partial matches)
  const sortedTerms = [...terms].sort((a, b) => b.term.length - a.term.length)

  // Create a map for quick lookup
  const termMap = new Map<string, ScientificTerm>()
  sortedTerms.forEach(t => {
    termMap.set(t.term.toLowerCase(), t)
  })

  // Build regex pattern for all terms (case-insensitive, word boundaries)
  const escapedTerms = sortedTerms.map(t =>
    t.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  )
  const pattern = new RegExp(`\\b(${escapedTerms.join('|')})\\b`, 'gi')

  const segments: ParsedSegment[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, match.index)
      })
    }

    // Add the term match
    const matchedText = match[0]
    const term = termMap.get(matchedText.toLowerCase())

    if (term) {
      segments.push({
        type: 'term',
        content: matchedText, // Preserve original case
        term
      })
    } else {
      // Fallback: treat as regular text
      segments.push({
        type: 'text',
        content: matchedText
      })
    }

    lastIndex = pattern.lastIndex
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex)
    })
  }

  return segments
}

/**
 * Check if a term appears in text (case-insensitive)
 */
export function termExistsInText(text: string, term: string): boolean {
  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`\\b${escapedTerm}\\b`, 'i')
  return pattern.test(text)
}

/**
 * Filter terms to only those that appear in the text
 */
export function filterTermsInText(
  text: string,
  terms: ScientificTerm[]
): ScientificTerm[] {
  return terms.filter(t => termExistsInText(text, t.term))
}
