import { createApiClient } from '@/lib/server-supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim()

  if (q.length < 2) {
    return NextResponse.json({ posts: [], profiles: [], topics: [], query: q })
  }

  const supabase = createApiClient(request)
  // Strip characters that would break Supabase's PostgREST .or() filter parsing.
  const safeQ = q.replace(/[,."()]/g, ' ').trim()
  if (!safeQ) return NextResponse.json({ posts: [], profiles: [], topics: [], query: q })
  const like = `%${safeQ}%`
  const limit = 20

  try {
    const [postsRes, profilesRes, topicsRes] = await Promise.all([
      supabase
        .from('posts')
        .select('id, user_id, post_type, title, content, media_url, media_type, county_tag, bounty_tokens, upvotes_count, answers_count, comments_count, is_pinned, is_hidden, created_at, profiles(full_name, username, avatar_url, heshima_rating, is_verified_expert)')
        .or(`title.ilike.${like},content.ilike.${like}`)
        .order('created_at', { ascending: false })
        .limit(limit),
      supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, county_hub, heshima_rating, is_verified_expert')
        .or(`username.ilike.${like},full_name.ilike.${like}`)
        .limit(limit),
      supabase
        .from('topics')
        .select('id, name, slug, description, color, follower_count')
        .or(`name.ilike.${like},slug.ilike.${like},description.ilike.${like}`)
        .limit(limit),
    ])

    const posts = (postsRes.data || []).filter((p: any) => !p.is_hidden)
    const profiles = profilesRes.data || []
    const topics = topicsRes.data || []

    return NextResponse.json({ posts, profiles, topics, query: q })
  } catch (e) {
    console.error('Search error:', e)
    return NextResponse.json({ posts: [], profiles: [], topics: [], query: q }, { status: 500 })
  }
}
