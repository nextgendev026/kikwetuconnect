import { createApiClient } from '@/lib/server-supabase'
import { sendPushToUser } from '@/lib/push'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { userId, title, body, data, tag } = await request.json()
    if (!userId || !title || !body) {
      return NextResponse.json({ error: 'Missing required fields (userId, title, body)' }, { status: 400 })
    }

    // Only allow sending to yourself or being admin
    if (userId !== user.id) {
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).maybeSingle()
      if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const result = await sendPushToUser(supabase, userId, {
      title,
      body,
      data,
      tag,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
    })

    return NextResponse.json(result)
  } catch (e: any) {
    console.error('Push send error:', e)
    return NextResponse.json({ error: e.message || 'Send failed' }, { status: 500 })
  }
}
