import { withAuth } from '@/lib/server-supabase'
import { checkRateLimit } from '@/lib/rate-limit'
import { NextResponse } from 'next/server'

export const POST = withAuth(async (request, { supabase, user }) => {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    if (!checkRateLimit('posts-create', ip, 10, 60_000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const { postType, title, content, mediaUrl, mediaUrls, countyTag, bountyTokens = 0, topics = [], category } = body as {
      postType?: string; title?: string; content?: string; mediaUrl?: string;
      mediaUrls?: string[]; countyTag?: string; bountyTokens?: number;
      topics?: string[]; category?: string
    }

    if (!postType || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (typeof content !== 'string' || content.trim().length < 10) {
      return NextResponse.json({ error: 'Content must be at least 10 characters' }, { status: 400 })
    }

    if (postType === 'inquiry' && !title) {
      return NextResponse.json({ error: 'Title is required for inquiries' }, { status: 400 })
    }

    const allowedCategories = ['Post', 'Ask', 'Poll', 'Nairobi']
    const validCategory = allowedCategories.includes(category || '') ? category : 'Post'

    const insertData: Record<string, unknown> = {
      user_id: user.id,
      post_type: postType,
      title: title || null,
      content: content.trim(),
      media_url: mediaUrl || (mediaUrls && mediaUrls.length > 0 ? mediaUrls[0] : null),
      media_urls: mediaUrls || null,
      county_tag: countyTag || null,
      bounty_tokens: bountyTokens,
      category: validCategory,
    }

    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert(insertData)
      .select()
      .single()

    if (postError) {
      return NextResponse.json({ error: postError.message }, { status: 400 })
    }

    if (topics && topics.length > 0 && post) {
      const postTopics = topics.map((topicId: string) => ({ post_id: post.id, topic_id: topicId }))
      await supabase.from('post_topics').insert(postTopics)
    }

    return NextResponse.json({ post, message: 'Post created successfully' })
  } catch (error) {
    console.error('Create post error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
