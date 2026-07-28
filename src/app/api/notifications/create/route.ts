import { createApiClient } from '@/lib/server-supabase'
import { headers } from 'next/headers'
import { cookies } from 'next/headers'

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createApiClient(request)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      userId,
      type,
      targetId,
      targetType,
      content,
    } = body

    if (!userId || !type || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (userId !== user.id) {
      return NextResponse.json(
        { error: 'Cannot send notifications to other users' },
        { status: 403 }
      )
    }

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        actor_id: user.id,
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
