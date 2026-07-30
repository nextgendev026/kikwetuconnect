import { createApiClient } from '@/lib/server-supabase'
import { NextRequest, NextResponse } from 'next/server'
import { sendPushToUser, sendPushToMultipleUsers } from '@/lib/push-notifications'
import { ROLES } from '@/lib/roles'

export async function POST(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== ROLES.ADMIN) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { userId, userIds, payload } = body
    if (!payload?.title) return NextResponse.json({ error: 'Missing payload.title' }, { status: 400 })

    let sentCount = 0
    if (userIds && Array.isArray(userIds)) {
      sentCount = await sendPushToMultipleUsers(userIds, payload)
    } else if (userId) {
      const ok = await sendPushToUser(userId, payload)
      if (ok) sentCount = 1
    } else {
      return NextResponse.json({ error: 'Provide userId or userIds' }, { status: 400 })
    }

    return NextResponse.json({ sent: sentCount })
  } catch (e: any) {
    console.error('Push send error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
