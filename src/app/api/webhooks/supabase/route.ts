import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/server-supabase'
import { sendPushToUser } from '@/lib/push-notifications'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Internal webhook called by the Supabase database (pg_net trigger on
 * messages INSERT) so users get push notifications even when the app is
 * closed. Guarded by a shared secret stored in app_settings.
 */
export async function POST(request: Request) {
  try {
    const supabase = createServiceClient()
    const { data: setting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'push_webhook_secret')
      .maybeSingle()

    const secret = setting?.value as string | undefined
    const supplied = request.headers.get('x-kc-secret')
    if (!secret || supplied !== secret) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body?.type) return NextResponse.json({ error: 'Missing type' }, { status: 400 })

    if (body.type === 'ping') {
      return NextResponse.json({ ok: true })
    }

    if (body.type === 'message') {
      const convId: string = body.conversation_id
      const senderId: string = body.sender_id
      if (!UUID_RE.test(convId) || !UUID_RE.test(senderId)) {
        return NextResponse.json({ error: 'Bad ids' }, { status: 400 })
      }

      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', convId)
        .neq('user_id', senderId)

      if (!participants?.length) return NextResponse.json({ ok: true, sent: 0 })

      const { data: sender } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', senderId)
        .maybeSingle()

      const senderName = sender?.full_name || sender?.username || 'Someone'
      const displayContent = body.content || (body.message_type === 'image' ? '📷 Image' : body.message_type === 'file' ? '📎 File' : 'Message')

      let sent = 0
      await Promise.allSettled(participants.map(async p => {
        const ok = await sendPushToUser(p.user_id, {
          title: 'New message',
          body: `${senderName}: ${displayContent}`.slice(0, 140),
          data: { url: `/messages?conversation_id=${convId}` },
          tag: `msg-${convId}`,
        })
        if (ok) sent += 1
      }))

      return NextResponse.json({ ok: true, sent })
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch (e: any) {
    console.error('Push webhook error:', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}
