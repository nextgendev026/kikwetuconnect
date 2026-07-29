import { createApiClient } from '@/lib/server-supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { postId, content } = body

    if (!postId || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (content.trim().length < 10) {
      return NextResponse.json(
        { error: 'Answer must be at least 10 characters' },
        { status: 400 }
      )
    }

    // Create answer
    const { data: answer, error: answerError } = await supabase
      .from('answers')
      .insert({
        post_id: postId,
        user_id: user.id,
        content,
      })
      .select()
      .single()

    if (answerError) {
      return NextResponse.json(
        { error: answerError.message },
        { status: 400 }
      )
    }

    // Notify post owner (if not answering own post)
    const { data: answeredPost } = await supabase
      .from('posts').select('user_id, title').eq('id', postId).single()
    if (answeredPost && answeredPost.user_id !== user.id) {
      await supabase.from('notifications').insert({
        user_id: answeredPost.user_id,
        actor_id: user.id,
        type: 'new_answer',
        target_id: postId,
        target_type: 'post',
        content: `New answer on "${(answeredPost.title || content).slice(0, 80)}"`,
        meta: { link: `/posts/${postId}` },
      })
    }

    return NextResponse.json({
      answer,
      message: 'Answer submitted successfully',
    })
  } catch (error: any) {
    console.error('Create answer error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
