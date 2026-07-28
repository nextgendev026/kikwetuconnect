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
    const { notificationId, markAll } = body

    if (markAll) {
      // Mark all notifications as read
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
    } else if (notificationId) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id)

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Missing notification ID or markAll flag' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'Notifications marked as read',
    })
  } catch (error: any) {
    console.error('Mark read error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
