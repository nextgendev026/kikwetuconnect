import { createApiClient } from '@/lib/server-supabase'

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    const supabase = createApiClient(request);
  try {

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

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
}
