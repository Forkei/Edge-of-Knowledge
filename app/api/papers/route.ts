import { NextRequest, NextResponse } from 'next/server'
import { searchPapers, formatAuthors } from '@/lib/papers'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  const limit = parseInt(searchParams.get('limit') || '10')

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 })
  }

  try {
    const papers = await searchPapers(query, limit)

    // Format for frontend
    const formatted = papers.map(p => ({
      paperId: p.paperId,
      title: p.title,
      authors: formatAuthors(p.authors),
      year: p.year,
      citationCount: p.citationCount,
      url: p.url,
    }))

    return NextResponse.json({ papers: formatted, total: papers.length })
  } catch (error) {
    console.error('Paper search error:', error)
    return NextResponse.json(
      { error: 'Failed to search papers' },
      { status: 500 }
    )
  }
}
