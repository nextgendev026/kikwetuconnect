import { createApiClient } from '@/lib/server-supabase'
import { NextRequest, NextResponse } from 'next/server'

const cache = new Map<string, { data: any; expiry: number }>()
const CACHE_TTL = 5_000

function getCached(key: string) {
  const entry = cache.get(key)
  if (entry && Date.now() < entry.expiry) return entry.data
  cache.delete(key)
  return null
}

function setCache(key: string, data: any) {
  if (cache.size > 100) cache.clear()
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL })
}

export async function GET(request: NextRequest) {
  const supabase = createApiClient(request)
  try {
    const searchParams = request.nextUrl.searchParams
    const query = (searchParams.get('q') || '').trim()
    const type = searchParams.get('type') || 'all'

    if (query.length < 2) {
      return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 })
    }

    const cacheKey = `search:${query}:${type}`
    const cached = getCached(cacheKey)
    if (cached) return NextResponse.json(cached)

    const searchTerm = `%${query.toLowerCase()}%`
    const searchWords = query.trim().split(/\s+/).filter(Boolean).join(' | ')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    try {
      const [postsResult, profilesResult, topicsResult] = await Promise.all([
        (async () => {
          let q = supabase
            .from('posts')
            .select(`*, profiles:user_id (id, full_name, username, heshima_rating, is_verified_expert)`)
          if (searchWords) {
            q = q.textSearch('content', searchWords, { type: 'websearch' })
          } else {
            q = q.or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`)
          }
          if (type !== 'all') q = q.eq('post_type', type)
          return q.order('created_at', { ascending: false }).limit(20)
        })(),
        supabase
          .from('profiles')
          .select('id, full_name, username, heshima_rating, is_verified_expert')
          .or(`full_name.ilike.${searchTerm},username.ilike.${searchTerm}`)
          .limit(10),
        supabase
          .from('topics')
          .select('id, name, slug, follower_count')
          .ilike('name', searchTerm)
          .limit(10),
      ])

      const posts = (postsResult.error && postsResult.error.code !== 'PGRST116') ? [] : (postsResult.data || [])
      const profiles = (profilesResult.error && profilesResult.error.code !== 'PGRST116') ? [] : (profilesResult.data || [])
      const topics = (topicsResult.error && topicsResult.error.code !== 'PGRST116') ? [] : (topicsResult.data || [])

      const result = { posts, profiles, topics, query }
      setCache(cacheKey, result)
      return NextResponse.json(result)
    } finally {
      clearTimeout(timeout)
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: 'Search timed out' }, { status: 504 })
    }
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
