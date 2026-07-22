import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/lib/supabase'

export async function GET(request: Request) {
  const supabase = createServerComponentClient<Database>({ cookies })
  const { searchParams } = new URL(request.url)
  
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const type = searchParams.get('type')
  const county = searchParams.get('county')
  const topic = searchParams.get('topic')
  const from = (page - 1) * limit

  let query = supabase
    .from('posts')
    .select(`
      *,
      profiles:user_id (id, username, full_name, avatar_url, county_hub, heshima_rating, is_verified_expert),
      post_topics (topics:topic_id (name, slug, color)),
      votes:user_id (vote_type)
    `)
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (type) query = query.eq('post_type', type)
  if (county) query = query.eq('county_tag', county)
  if (topic) {
    const { data: postIds } = await supabase
      .from('post_topics')
      .select('post_id')
      .eq('topic_id', topic) as any
    const ids = postIds?.map((p: { post_id: string }) => p.post_id) || []
    query = query.in('id', ids)
  }

  const { data: posts, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Transform posts to include user vote
  const transformedPosts = (posts as any[])?.map(post => ({
    ...post,
    user_vote: post.votes?.[0]?.vote_type || null,
    tags: post.post_topics?.map((pt: any) => pt.topics?.name).filter(Boolean) || [],
  })) || []

  return NextResponse.json({ posts: transformedPosts })
}

export async function POST(request: Request) {
  const supabase = createServerComponentClient<Database>({ cookies })
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { post_type, title, content, media_url, county_tag, bounty_tokens, topic_ids } = body

  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      user_id: user.id,
      post_type,
      title,
      content,
      media_url,
      county_tag,
      bounty_tokens: bounty_tokens || 0,
    } as any)
    .select()
    .single<Database['public']['Tables']['posts']['Row']>()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Add topic relationships
  if (topic_ids && topic_ids.length > 0) {
    await supabase.from('post_topics').insert(
      topic_ids.map((topic_id: string) => ({
        post_id: post.id,
        topic_id,
      })) as any
    )
  }

  // Handle bounty tokens
  if (bounty_tokens && bounty_tokens > 0) {
    await supabase.from('tokens').insert({
      user_id: user.id,
      amount: -bounty_tokens,
      type: 'bounty',
      reference: post.id,
    } as any)
  }

  return NextResponse.json({ post })
}