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
  console.log(`[WebSearch] Starting search for: "${query}"`)

  // Try DuckDuckGo Instant Answer API first (more reliable)
  try {
    const instantResults = await searchWithInstantAnswer(query, limit)
    if (instantResults.length > 0) {
      console.log(`[WebSearch] Got ${instantResults.length} results from Instant Answer API`)
      return instantResults
    }
  } catch (e) {
    console.log(`[WebSearch] Instant Answer API failed: ${e instanceof Error ? e.message : 'unknown'}`)
  }

  // Fallback to HTML scraping
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
    console.log(`[WebSearch] Fetching HTML from: ${searchUrl}`)

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
      console.error(`[WebSearch] DuckDuckGo HTML failed: ${response.status}`)
      return []
    }

    const html = await response.text()
    console.log(`[WebSearch] Got HTML response: ${html.length} chars`)
    console.log(`[WebSearch] HTML preview: ${html.slice(0, 500)}`)

    const results = parseSearchResults(html, limit)
    console.log(`[WebSearch] Parsed ${results.length} results from HTML`)
    return results
  } catch (error) {
    console.error('[WebSearch] HTML scraping error:', error)
    return []
  }
}

/**
 * Search using DuckDuckGo Instant Answer API - more reliable but limited
 */
async function searchWithInstantAnswer(query: string, limit: number): Promise<WebSearchResult[]> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    throw new Error(`Instant Answer API returned ${response.status}`)
  }

  const data = await response.json()
  const results: WebSearchResult[] = []

  // Add abstract if available
  if (data.Abstract && data.AbstractURL) {
    results.push({
      title: data.Heading || query,
      url: data.AbstractURL,
      snippet: data.Abstract,
      source: data.AbstractSource || 'Wikipedia',
    })
  }

  // Add related topics
  if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
    for (const topic of data.RelatedTopics.slice(0, limit - results.length)) {
      if (topic.Text && topic.FirstURL) {
        results.push({
          title: topic.Text.split(' - ')[0] || topic.Text.slice(0, 60),
          url: topic.FirstURL,
          snippet: topic.Text,
          source: 'DuckDuckGo',
        })
      }
    }
  }

  return results.slice(0, limit)
}

/**
 * Parse DuckDuckGo HTML search results
 * DDG HTML results have class "result results_links results_links_deep web-result"
 * Inside each: a.result__a with href (redirect URL) and title text
 * And a.result__snippet with the description
 */
function parseSearchResults(html: string, limit: number): WebSearchResult[] {
  const results: WebSearchResult[] = []

  // Log HTML length for debugging
  console.log(`[WebSearch] Parsing HTML, length: ${html.length}`)

  // Pattern 1: Match result blocks with class containing "result"
  // DDG uses: class="result results_links results_links_deep web-result"
  const resultBlockRegex = /<div[^>]*class="[^"]*\bresult\b[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]*class="[^"]*\bresult\b|$)/gi

  // Inside result block, find the main link and snippet
  const titleLinkRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i
  const snippetRegex = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i

  let match
  while ((match = resultBlockRegex.exec(html)) !== null && results.length < limit) {
    const block = match[1]

    const titleMatch = block.match(titleLinkRegex)
    if (titleMatch) {
      let url = extractRealUrl(titleMatch[1])
      const title = cleanHtml(titleMatch[2])

      // Skip ads and internal DDG links
      if (!url || url.includes('duckduckgo.com') || url.includes('/y.js') || !url.startsWith('http')) {
        continue
      }

      const snippetMatch = block.match(snippetRegex)
      const snippet = snippetMatch ? cleanHtml(snippetMatch[1]) : ''
      const source = extractDomain(url)

      if (title && title.length > 3) {
        results.push({ title, url, snippet, source })
        console.log(`[WebSearch] Found result: ${title.slice(0, 50)}...`)
      }
    }
  }

  console.log(`[WebSearch] Pattern 1 found ${results.length} results`)

  // Pattern 2: Fallback - look for any links with uddg= parameter (DDG redirect links)
  if (results.length === 0) {
    const uddgLinkRegex = /<a[^>]*href="[^"]*uddg=([^"&]+)[^"]*"[^>]*>([^<]+)<\/a>/gi

    while ((match = uddgLinkRegex.exec(html)) !== null && results.length < limit) {
      try {
        const url = decodeURIComponent(match[1])
        const title = cleanHtml(match[2])

        if (url.startsWith('http') && title.length > 5 && !title.includes('DuckDuckGo')) {
          results.push({
            title,
            url,
            snippet: '',
            source: extractDomain(url),
          })
        }
      } catch (e) {
        // Skip malformed URLs
      }
    }
    console.log(`[WebSearch] Pattern 2 (uddg) found ${results.length} results`)
  }

  // Pattern 3: Last resort - extract any external links with decent titles
  if (results.length === 0) {
    const anyLinkRegex = /<a[^>]*href="(https?:\/\/(?!duckduckgo)[^"]+)"[^>]*>([^<]{5,100})<\/a>/gi
    const seenUrls = new Set<string>()

    while ((match = anyLinkRegex.exec(html)) !== null && results.length < limit) {
      const url = match[1]
      const title = cleanHtml(match[2])

      // Skip duplicates and junk
      if (
        seenUrls.has(url) ||
        url.includes('duckduckgo.com') ||
        title.length < 10 ||
        /^(Back|Next|Home|Menu|Close|Search)$/i.test(title)
      ) {
        continue
      }

      seenUrls.add(url)
      results.push({
        title,
        url,
        snippet: '',
        source: extractDomain(url),
      })
    }
    console.log(`[WebSearch] Pattern 3 (any link) found ${results.length} results`)
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
