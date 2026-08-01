import { createApiClient } from '@/lib/server-supabase'
import { getJwtSessionId } from '@/lib/session'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    const res = NextResponse.json({})
    const supabase = createApiClient(request, res)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ authenticated: false, ok: true })

    const { data: { session } } = await supabase.auth.getSession()
    const sessionId = getJwtSessionId(session?.access_token)
    if (!sessionId) return NextResponse.json({ authenticated: true, ok: true, reason: 'no-session-id' })

    // Claim: stamp this session as the account's only active session.
    if (action === 'claim') {
      const { error } = await supabase
        .from('profiles')
        .update({ active_session_id: sessionId })
        .eq('id', user.id)
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      return NextResponse.json({ authenticated: true, ok: true })
    }

    // Check: is the current session still the active one?
    if (action === 'check') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('active_session_id')
        .eq('id', user.id)
        .maybeSingle()
      const active = profile?.active_session_id ?? null
      // Legacy profiles without a claim are treated as valid.
      if (!active) return NextResponse.json({ authenticated: true, ok: true })
      return NextResponse.json({ authenticated: true, ok: active === sessionId })
    }

    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || 'Session error' }, { status: 500 })
  }
}
