import { withAuth } from '@/lib/server-supabase'
import { NextResponse } from 'next/server'

export const POST = withAuth(async (request, { supabase, user }) => {
  try {
    const body = await request.json()
    const {
      actorId,
      type,
      targetId,
      targetType,
      content,
    } = body

    if (!type || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Security: a notification can only be created for the caller themself.
    // Server-side flows must use the service role / create_notification RPC.
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        actor_id: actorId || null,
        type,
        target_id: targetId || null,
        target_type: targetType || null,
        content,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      notification,
      message: 'Notification created successfully',
    })
  } catch (error: any) {
    console.error('Create notification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
