import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      postType,
      title,
      content,
      mediaUrl,
      countyTag,
      bountyTokens = 0,
      topics = [],
    } = body

    // Validate input
    if (!postType || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (content.length < 10) {
      return NextResponse.json(
        { error: 'Content must be at least 10 characters' },
        { status: 400 }
      )
    }

    if (postType === 'inquiry' && !title) {
      return NextResponse.json(
        { error: 'Title is required for inquiries' },
        { status: 400 }
      )
    }

    // Create post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        post_type: postType,
        title: title || null,
        content,
        media_url: mediaUrl || null,
        county_tag: countyTag || null,
        bounty_tokens: bountyTokens,
      })
      .select()
      .single()

    if (postError) {
      return NextResponse.json(
        { error: postError.message },
        { status: 400 }
      )
    }

    // Add topics if provided
    if (topics.length > 0 && post) {
      const postTopics = topics.map((topicId: string) => ({
        post_id: post.id,
        topic_id: topicId,
      }))

      await supabase.from('post_topics').insert(postTopics)
    }

    return NextResponse.json({
      post,
      message: 'Post created successfully',
    })
  } catch (error: any) {
    console.error('Create post error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
