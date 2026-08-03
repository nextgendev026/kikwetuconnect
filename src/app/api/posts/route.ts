import { createApiClient } from '@/lib/server-supabase'
import { checkRateLimit } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createApiClient(request)
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const type = searchParams.get('type')
  const county = searchParams.get('county')
  const topic = searchParams.get('topic')
  const category = searchParams.get('category')
  const from = (page - 1) * limit

  let query = supabase
    .from('posts')
    .select(`
      *,
      profiles:user_id (id, username, full_name, avatar_url, county_hub, heshima_rating, is_verified_expert)
    `)
    .is('space_id', null)
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (type) query = query.eq('post_type', type)
  if (county) query = query.eq('county_tag', county)
  if (category) query = query.eq('category', category)
  if (topic) {
    const { data: postIds } = await supabase
      .from('post_topics')
      .select('post_id')
      .eq('topic_id', topic)
    const ids = postIds?.map((p: { post_id: string }) => p.post_id) || []
    if (ids.length === 0) return NextResponse.json({ posts: [] })
    query = query.in('id', ids)
  }

  const { data: posts, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ posts: posts || [] })
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  if (!checkRateLimit('posts', ip, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const supabase = createApiClient(request)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { post_type, title, content, media_url, county_tag, bounty_tokens, category } = body as {
    post_type?: string; title?: string; content?: string; media_url?: string;
    county_tag?: string; bounty_tokens?: number; category?: string
  }

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }

  const validTypes = ['baraza', 'inquiry', 'article', 'poll']
  if (post_type && !validTypes.includes(post_type)) {
    return NextResponse.json({ error: 'Invalid post type' }, { status: 400 })
  }

  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      user_id: user.id,
      post_type: post_type || 'baraza',
      title: title || null,
      content: content.trim(),
      media_url: media_url || null,
      county_tag: county_tag || null,
      bounty_tokens: bounty_tokens || 0,
      category: category || 'Post',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ post })
}
