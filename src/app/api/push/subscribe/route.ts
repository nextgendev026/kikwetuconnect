import { createApiClient } from '@/lib/server-supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { endpoint, p256dhKey, authKey, deviceType, userAgent } = await request.json()
    if (!endpoint || !p256dhKey || !authKey) {
      return NextResponse.json({ error: 'Missing subscription fields' }, { status: 400 })
    }

    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: user.id,
      endpoint,
      p256dh_key: p256dhKey,
      auth_key: authKey,
      device_type: deviceType || 'unknown',
      user_agent: userAgent || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,endpoint', ignoreDuplicates: false })

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Push subscribe error:', e)
    return NextResponse.json({ error: e.message || 'Subscribe failed' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { endpoint } = await request.json().catch(() => ({}))

    let query = supabase.from('push_subscriptions').delete().eq('user_id', user.id)
    if (endpoint) query = query.eq('endpoint', endpoint)

    const { error } = await query
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Push unsubscribe error:', e)
    return NextResponse.json({ error: e.message || 'Unsubscribe failed' }, { status: 500 })
  }
}
