// Semantic Scholar API integration
// Free API, no key required (rate limited to ~100 req/sec)

const SEMANTIC_SCHOLAR_API = 'https://api.semanticscholar.org/graph/v1'

export interface PaperSearchResult {
  paperId: string
  title: string
  authors: { name: string }[]
  year: number
  citationCount: number
  abstract?: string
  url: string
  venue?: string
  isOpenAccess?: boolean
}

export interface PaperDetails extends PaperSearchResult {
  abstract: string
  references?: { paperId: string; title: string }[]
  citations?: { paperId: string; title: string }[]
  fieldsOfStudy?: string[]
  publicationDate?: string
}

interface SemanticScholarPaper {
  paperId: string
  title: string
  authors?: { name: string }[]
  year?: number
  citationCount?: number
  abstract?: string
  url?: string
  venue?: string
  isOpenAccess?: boolean
  fieldsOfStudy?: string[]
  publicationDate?: string
}

/**
 * Search for scientific papers on Semantic Scholar
 */
export async function searchPapers(
  query: string,
  limit: number = 10
): Promise<PaperSearchResult[]> {
  try {
    const params = new URLSearchParams({
      query,
      limit: String(limit),
      fields: 'paperId,title,authors,year,citationCount,abstract,url,venue,isOpenAccess',
    })

    const response = await fetch(
      `${SEMANTIC_SCHOLAR_API}/paper/search?${params}`,
      {
        headers: {
          'Accept': 'application/json',
        },
        // Add timeout
        signal: AbortSignal.timeout(10000),
      }
    )

    if (!response.ok) {
      console.error('Semantic Scholar API error:', response.status, response.statusText)
      return []
    }

    const data = await response.json()

    if (!data.data || !Array.isArray(data.data)) {
      return []
    }

    return data.data.map((paper: SemanticScholarPaper) => ({
      paperId: paper.paperId,
      title: paper.title || 'Untitled',
      authors: paper.authors || [],
      year: paper.year || 0,
      citationCount: paper.citationCount || 0,
      abstract: paper.abstract,
      url: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
      venue: paper.venue,
      isOpenAccess: paper.isOpenAccess,
    }))
  } catch (error) {
    console.error('Error searching papers:', error)
    return []
  }
}

/**
 * Get detailed information about a specific paper
 */
export async function getPaperDetails(paperId: string): Promise<PaperDetails | null> {
  try {
    const fields = [
      'paperId',
      'title',
      'authors',
      'year',
      'citationCount',
      'abstract',
      'url',
      'venue',
      'isOpenAccess',
      'fieldsOfStudy',
      'publicationDate',
      'references.paperId',
      'references.title',
      'citations.paperId',
      'citations.title',
    ].join(',')

    const response = await fetch(
      `${SEMANTIC_SCHOLAR_API}/paper/${paperId}?fields=${fields}`,
      {
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      }
    )

    if (!response.ok) {
      console.error('Semantic Scholar API error:', response.status)
      return null
    }

    const paper = await response.json()

    return {
      paperId: paper.paperId,
      title: paper.title || 'Untitled',
      authors: paper.authors || [],
      year: paper.year || 0,
      citationCount: paper.citationCount || 0,
      abstract: paper.abstract || '',
      url: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
      venue: paper.venue,
      isOpenAccess: paper.isOpenAccess,
      fieldsOfStudy: paper.fieldsOfStudy,
      publicationDate: paper.publicationDate,
      references: paper.references,
      citations: paper.citations,
    }
  } catch (error) {
    console.error('Error getting paper details:', error)
    return null
  }
}

/**
 * Format authors list for display
 */
export function formatAuthors(authors: { name: string }[], maxAuthors: number = 3): string {
  if (!authors || authors.length === 0) return 'Unknown authors'

  const names = authors.slice(0, maxAuthors).map(a => a.name)

  if (authors.length > maxAuthors) {
    return `${names.join(', ')} et al.`
  }

  return names.join(', ')
}

/**
 * Determine research heat based on paper years
 */
export function calculateResearchHeat(
  papers: PaperSearchResult[]
): 'hot' | 'warm' | 'cold' | 'dormant' {
  if (papers.length === 0) return 'dormant'

  const currentYear = new Date().getFullYear()
  const recentPapers = papers.filter(p => p.year >= currentYear - 2).length
  const somewhatRecentPapers = papers.filter(p => p.year >= currentYear - 5).length

  if (recentPapers >= 3) return 'hot'
  if (recentPapers >= 1 || somewhatRecentPapers >= 3) return 'warm'
  if (somewhatRecentPapers >= 1) return 'cold'
  return 'dormant'
}

/**
 * Get the most recent year from papers
 */
export function getLastStudiedYear(papers: PaperSearchResult[]): string {
  if (papers.length === 0) return 'Unknown'

  const maxYear = Math.max(...papers.map(p => p.year || 0))
  return maxYear > 0 ? String(maxYear) : 'Unknown'
}
