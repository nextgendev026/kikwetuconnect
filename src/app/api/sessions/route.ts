import { withAuth, createServiceClient } from '@/lib/server-supabase'
import { dispatchPushForNotification } from '@/lib/push-notifications'
import { NextResponse } from 'next/server'

export const POST = withAuth(async (request, { supabase, user }) => {
  try {
    const svc = createServiceClient()
    const { request_id } = await request.json()
    if (!request_id) return NextResponse.json({ error: 'Missing request_id' }, { status: 400 })

    const { data: helpReq, error: reqErr } = await supabase
      .from('student_help_requests').select('id, student_id, status').eq('id', request_id).maybeSingle()
    if (reqErr || !helpReq) return NextResponse.json({ error: 'Help request not found' }, { status: 404 })
    if (helpReq.status !== 'open') return NextResponse.json({ error: 'Request is no longer open' }, { status: 400 })
    if (helpReq.student_id === user.id) return NextResponse.json({ error: 'Cannot help yourself' }, { status: 400 })

    // These tables have no client INSERT/UPDATE policies (server-only writes),
    // so the privileged client is used after the checks above. Race-guard:
    // only one expert may claim an open request.
    const { data: claimed, error: updateReqErr } = await svc
      .from('student_help_requests').update({ assigned_to: user.id, status: 'assigned' })
      .eq('id', request_id).eq('status', 'open').select('id')
    if (updateReqErr) return NextResponse.json({ error: updateReqErr.message }, { status: 400 })
    if (!claimed || claimed.length === 0) {
      return NextResponse.json({ error: 'Request was just claimed by someone else' }, { status: 409 })
    }

    const { data: session, error: sErr } = await svc
      .from('student_sessions').insert({
        request_id, expert_id: user.id, student_id: helpReq.student_id,
        status: 'active', started_at: new Date().toISOString(),
      }).select().single()
    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 400 })

    // Notify student (service client: notification targets another user)
    const { data: assignedNotif } = await svc.from('notifications').insert({
      user_id: helpReq.student_id, actor_id: user.id,
      type: 'session_assigned', target_id: session.id, target_type: 'session',
      content: 'An expert has started a session for your help request',
      meta: { link: '/sessions' },
    }).select().single()
    if (assignedNotif) await dispatchPushForNotification(assignedNotif)

    return NextResponse.json({ session, message: 'Session started' })
  } catch (e: any) {
    console.error('Create session error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const PATCH = withAuth(async (request, { supabase, user }) => {
  try {
    const svc = createServiceClient()
    const { session_id, notes } = await request.json()
    if (!session_id) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })

    const { data: session, error: sessErr } = await supabase
      .from('student_sessions').select('id, expert_id, student_id, status, started_at').eq('id', session_id).maybeSingle()
    if (sessErr || !session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    if (session.expert_id !== user.id && session.student_id !== user.id) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
    }
    if (session.status !== 'active') return NextResponse.json({ error: 'Session is not active' }, { status: 400 })

    const ended_at = new Date().toISOString()
    const duration_minutes = Math.max(1, Math.floor((Date.now() - new Date(session.started_at).getTime()) / 60000))

    const updateData: Record<string, any> = {
      ended_at, duration_minutes, status: 'completed',
    }
    if (notes && session.expert_id === user.id) updateData.expert_notes = notes

    // No client UPDATE policy on student_sessions (server-only writes).
    const { data: updated, error: updateErr } = await svc
      .from('student_sessions').update(updateData).eq('id', session_id).select().single()
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 })

    // Notify both participants (service client: notification targets the other user)
    const sessionParticipants = [session.expert_id, session.student_id].filter(id => id !== user.id)
    if (sessionParticipants.length > 0) {
      const { data: endNotifs } = await svc.from('notifications').insert(
        sessionParticipants.map(uid => ({
          user_id: uid, actor_id: user.id,
          type: 'session_ended', target_id: session_id, target_type: 'session',
          content: `Session completed (${duration_minutes} min)`,
          meta: { link: '/sessions' },
        }))
      ).select()
      if (endNotifs?.length) {
        for (const n of endNotifs) await dispatchPushForNotification(n)
      }
    }

    return NextResponse.json({ session: updated, message: `Session completed — ${duration_minutes} min` })
  } catch (e: any) {
    console.error('End session error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
