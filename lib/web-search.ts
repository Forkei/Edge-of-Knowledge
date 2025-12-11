// DuckDuckGo web search integration
// No API key needed - uses HTML search endpoint

export interface WebSearchResult {
  title: string
  url: string
  snippet: string
  source: string // domain name
}

/**
 * Search the web using DuckDuckGo HTML search
 * Parses HTML response to extract results
 */
export async function searchWeb(
  query: string,
  limit: number = 5
): Promise<WebSearchResult[]> {
  try {
    // Use DuckDuckGo HTML search endpoint
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`

    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      console.error('DuckDuckGo search failed:', response.status)
      return []
    }

    const html = await response.text()
    return parseSearchResults(html, limit)
  } catch (error) {
    console.error('Web search error:', error)
    return []
  }
}

/**
 * Parse DuckDuckGo HTML search results
 */
function parseSearchResults(html: string, limit: number): WebSearchResult[] {
  const results: WebSearchResult[] = []

  // DuckDuckGo HTML results are in divs with class "result"
  // Each result has:
  // - a.result__a (title and URL)
  // - a.result__snippet (description)
  // - span.result__url (visible URL)

  // Match result blocks
  const resultRegex = /<div[^>]*class="[^"]*result[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi
  const linkRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i
  const snippetRegex = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i
  const urlRegex = /<span[^>]*class="[^"]*result__url[^"]*"[^>]*>([\s\S]*?)<\/span>/i

  // Alternative pattern for newer DDG HTML
  const altResultRegex = /<div[^>]*class="[^"]*links_main[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
  const altLinkRegex = /<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i

  let match
  let useAltPattern = false

  // Try primary pattern first
  while ((match = resultRegex.exec(html)) !== null && results.length < limit) {
    const block = match[1]

    const linkMatch = block.match(linkRegex)
    const snippetMatch = block.match(snippetRegex)

    if (linkMatch) {
      // Extract and clean URL - DuckDuckGo uses redirect URLs
      let url = linkMatch[1]
      url = extractRealUrl(url)

      // Skip if it's an ad or DuckDuckGo internal link
      if (url.includes('duckduckgo.com') || url.includes('ad_') || !url.startsWith('http')) {
        continue
      }

      const title = cleanHtml(linkMatch[2])
      const snippet = snippetMatch ? cleanHtml(snippetMatch[1]) : ''
      const source = extractDomain(url)

      if (title && url) {
        results.push({
          title,
          url,
          snippet,
          source,
        })
      }
    }
  }

  // If no results with primary pattern, try alternative
  if (results.length === 0) {
    // Simpler fallback: extract any links with reasonable content
    const simpleLinkRegex = /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([^<]{10,})<\/a>/gi

    while ((match = simpleLinkRegex.exec(html)) !== null && results.length < limit) {
      const url = extractRealUrl(match[1])
      const title = cleanHtml(match[2])

      if (
        !url.includes('duckduckgo.com') &&
        !url.includes('ad_') &&
        title.length > 10 &&
        !title.includes('DuckDuckGo')
      ) {
        results.push({
          title,
          url,
          snippet: '',
          source: extractDomain(url),
        })
      }
    }
  }

  return results
}

/**
 * Extract real URL from DuckDuckGo redirect URL
 * DDG URLs look like: //duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com...
 */
function extractRealUrl(ddgUrl: string): string {
  if (ddgUrl.includes('uddg=')) {
    const match = ddgUrl.match(/uddg=([^&]+)/)
    if (match) {
      return decodeURIComponent(match[1])
    }
  }

  // If it's already a real URL
  if (ddgUrl.startsWith('http')) {
    return ddgUrl
  }

  // Handle protocol-relative URLs
  if (ddgUrl.startsWith('//')) {
    return 'https:' + ddgUrl
  }

  return ddgUrl
}

/**
 * Clean HTML tags and entities from text
 */
function cleanHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

/**
 * Extract domain name from URL
 */
function extractDomain(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname.replace(/^www\./, '')
  } catch {
    // Fallback regex extraction
    const match = url.match(/https?:\/\/(?:www\.)?([^\/]+)/)
    return match ? match[1] : url
  }
}

/**
 * Alternative: Use DuckDuckGo Instant Answer API for quick facts
 * This is more limited but returns structured JSON
 */
export async function getInstantAnswer(query: string): Promise<{
  abstract?: string
  abstractSource?: string
  abstractUrl?: string
  relatedTopics?: { text: string; url: string }[]
} | null> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    if (!data.Abstract && !data.RelatedTopics?.length) {
      return null
    }

    return {
      abstract: data.Abstract || undefined,
      abstractSource: data.AbstractSource || undefined,
      abstractUrl: data.AbstractURL || undefined,
      relatedTopics: data.RelatedTopics?.slice(0, 5).map((t: any) => ({
        text: t.Text || '',
        url: t.FirstURL || '',
      })).filter((t: any) => t.text && t.url),
    }
  } catch (error) {
    console.error('Instant answer error:', error)
    return null
  }
}
