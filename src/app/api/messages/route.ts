import { withAuth } from '@/lib/server-supabase'
import { NextResponse } from 'next/server'

export const GET = withAuth(async (request, { supabase, user }) => {
  const { searchParams } = new URL(request.url)
  const conversation_id = searchParams.get('conversation_id')

  if (!conversation_id) return NextResponse.json({ error: 'Missing conversation_id' }, { status: 400 })

  const { data: membership } = await supabase
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversation_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  const { data, error } = await supabase
    .from('messages')
    .select(`
      id, conversation_id, sender_id, content, message_type, metadata, reply_to, status, created_at, read_at,
      sender:profiles!messages_sender_id_fkey (id, username, full_name, avatar_url)
    `)
    .eq('conversation_id', conversation_id)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json(data || [])
})

export const POST = withAuth(async (request, { supabase, user }) => {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { conversation_id, content, message_type, metadata, reply_to } = body as {
    conversation_id?: string; content?: string; message_type?: string;
    metadata?: Record<string, unknown>; reply_to?: string
  }

  if (!conversation_id || !content) {
    return NextResponse.json({ error: 'Missing conversation_id or content' }, { status: 400 })
  }

  if (typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: 'Content cannot be empty' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('send_message', {
    p_conversation_id: conversation_id,
    p_content: content.trim(),
    p_message_type: message_type || 'text',
    p_metadata: metadata || {},
    p_reply_to: reply_to || null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json(data)
})

export const PATCH = withAuth(async (request, { supabase, user }) => {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { conversation_id } = body as { conversation_id?: string }
  if (!conversation_id) return NextResponse.json({ error: 'Missing conversation_id' }, { status: 400 })

  const { error } = await supabase.rpc('mark_conversation_read', {
    p_conversation_id: conversation_id,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
})
