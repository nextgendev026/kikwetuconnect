import { withAuth, createServiceClient } from '@/lib/server-supabase'
import { NextResponse } from 'next/server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Returns short-lived signed read URLs for chat media paths, but ONLY if the
// requesting user is a participant of the conversation that owns the message.
export const POST = withAuth(async (request, { supabase, user }) => {
  try {
    const { messageId, path } = await request.json()
    if (!messageId || !path || typeof messageId !== 'string' || typeof path !== 'string') {
      return NextResponse.json({ error: 'Missing messageId or path' }, { status: 400 })
    }
    if (!UUID_RE.test(messageId)) {
      return NextResponse.json({ error: 'Invalid messageId' }, { status: 400 })
    }

    // Fetch the message (participant RLS already scopes reads to members).
    const { data: msg, error: msgErr } = await supabase
      .from('messages')
      .select('conversation_id')
      .eq('id', messageId)
      .maybeSingle()
    if (msgErr || !msg) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    // Verify membership explicitly (defense in depth, service client bypasses RLS).
    const { data: member, error: memberErr } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('conversation_id', msg.conversation_id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (memberErr || !member) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
    }

    const service = createServiceClient()
    const { data, error } = await service.storage
      .from('media')
      .createSignedUrl(path, 3600)

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Unable to sign URL' }, { status: 500 })
    }

    return NextResponse.json({ url: data.signedUrl })
  } catch {
    return NextResponse.json({ error: 'Signed URL failed' }, { status: 500 })
  }
})
