import { withAuth } from '@/lib/server-supabase'
import { NextResponse } from 'next/server'

export const POST = withAuth(async (request, { supabase, user }) => {
  const { content_type, content_id, reason } = await request.json()
  if (!['post', 'answer', 'story'].includes(content_type)) {
    return NextResponse.json({ error: 'Invalid content type' }, { status: 400 })
  }
  if (!content_id || !reason) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  const { error } = await supabase.rpc('flag_content', {
    p_content_type: content_type,
    p_content_id: content_id,
    p_reason: String(reason).slice(0, 200),
    p_risk_score: 0,
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
})
