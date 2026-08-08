import { withAuth } from '@/lib/server-supabase'
import { dispatchPushForNotification } from '@/lib/push-notifications'
import { NextResponse } from 'next/server'

export const POST = withAuth(async (request, { supabase, user }) => {
  try {
    const body = await request.json()
    const { postId, content } = body

    if (!postId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (content.trim().length < 2) {
      return NextResponse.json({ error: 'Comment must be at least 2 characters' }, { status: 400 })
    }
    if (content.trim().length > 4000) {
      return NextResponse.json({ error: 'Comment must be under 4000 characters' }, { status: 400 })
    }

    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        content,
      })
      .select()
      .single()

    if (commentError) {
      return NextResponse.json({ error: commentError.message }, { status: 400 })
    }

    const { data: commentedPost } = await supabase
      .from('posts').select('user_id, title').eq('id', postId).maybeSingle()
    if (commentedPost && commentedPost.user_id !== user.id) {
      const { data: notifRow } = await supabase.from('notifications').insert({
        user_id: commentedPost.user_id,
        actor_id: user.id,
        type: 'new_comment',
        target_id: postId,
        target_type: 'post',
        content: `New comment on "${(commentedPost.title || content).slice(0, 80)}"`,
        meta: { link: `/posts/${postId}` },
      }).select().single()
      if (notifRow) await dispatchPushForNotification(notifRow)
    }

    return NextResponse.json({ comment, message: 'Comment submitted successfully' })
  } catch (error: any) {
    console.error('Create comment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})