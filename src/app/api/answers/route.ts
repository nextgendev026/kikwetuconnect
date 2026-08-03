import { withAuth } from '@/lib/server-supabase'
import { NextResponse } from 'next/server'

export const POST = withAuth(async (request, { supabase, user }) => {
  try {
    const body = await request.json()
    const { post_id, content } = body

    if (!post_id || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (content.length < 10) {
      return NextResponse.json({ error: 'Content must be at least 10 characters' }, { status: 400 })
    }

    const { data: answer, error } = await supabase
      .from('answers')
      .insert({
        post_id,
        user_id: user.id,
        content,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ answer, message: 'Answer created successfully' })
  } catch (error: any) {
    console.error('Create answer error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
