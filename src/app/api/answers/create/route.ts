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
