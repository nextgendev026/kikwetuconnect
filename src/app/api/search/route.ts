import { createApiClient } from '@/lib/server-supabase'

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createApiClient(request);
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    const type = searchParams.get('type') || 'all'

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters' },
        { status: 400 }
      )
    }

    const searchTerm = `%${query.toLowerCase()}%`

    // Search posts
    let postsQuery = supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          username,
          heshima_rating,
          is_verified_expert
        )
      `)
      .or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`)

    if (type !== 'all') {
      postsQuery = postsQuery.eq('post_type', type)
    }

    const { data: posts, error: postsError } = await postsQuery
      .order('created_at', { ascending: false })
      .limit(20)

    if (postsError && postsError.code !== 'PGRST116') {
      throw postsError
    }

    // Search profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, username, heshima_rating, is_verified_expert')
      .or(`full_name.ilike.${searchTerm},username.ilike.${searchTerm}`)
      .limit(10)

    if (profilesError && profilesError.code !== 'PGRST116') {
      throw profilesError
    }

    // Search topics
    const { data: topics, error: topicsError } = await supabase
      .from('topics')
      .select('id, name, slug, follower_count')
      .ilike('name', searchTerm)
      .limit(10)

    if (topicsError && topicsError.code !== 'PGRST116') {
      throw topicsError
    }

    return NextResponse.json({
      posts: posts || [],
      profiles: profiles || [],
      topics: topics || [],
      query,
    })
  } catch (error: any) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
