import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''
  const type = searchParams.get('type') || ''
  const county = searchParams.get('county') || ''
  const verified = searchParams.get('verified') || ''
  const expert = searchParams.get('expert') || ''

  try {
    const searchUrl = new URL('/search', request.url)
    if (query) searchUrl.searchParams.set('q', query)
    if (type) searchUrl.searchParams.set('type', type)
    if (county) searchUrl.searchParams.set('county', county)
    if (verified === 'true') searchUrl.searchParams.set('verified', 'true')
    if (expert === 'true') searchUrl.searchParams.set('expert', 'true')

    const response = await fetch(searchUrl.toString())
    if (!response.ok) {
      throw new Error('Search API failed')
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { posts: [], quizzes: [], users: [], totalHits: 0 },
      { status: 500 }
    )
  }
}
