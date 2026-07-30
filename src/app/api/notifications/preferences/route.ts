import { createApiClient } from '@/lib/server-supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) throw error
    return NextResponse.json({ data: data || { push_enabled: true, email_enabled: true, types: {} } })
  } catch (e: any) {
    console.error('Get notification prefs error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { push_enabled, email_enabled, types } = body

    const payload: Record<string, any> = { user_id: user.id, updated_at: new Date().toISOString() }
    if (typeof push_enabled === 'boolean') payload.push_enabled = push_enabled
    if (typeof email_enabled === 'boolean') payload.email_enabled = email_enabled
    if (types && typeof types === 'object') payload.types = types

    const { error } = await supabase
      .from('notification_preferences')
      .upsert(payload, { onConflict: 'user_id' })

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Save notification prefs error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
