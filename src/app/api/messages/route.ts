import { createApiClient } from '@/lib/server-supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createApiClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const conversation_id = searchParams.get('conversation_id')

  if (!conversation_id) return NextResponse.json({ error: 'Missing conversation_id' }, { status: 400 })

  // Verify membership
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
}

export async function POST(request: NextRequest) {
  const supabase = createApiClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { conversation_id, content, message_type, metadata, reply_to } = await request.json()
  if (!conversation_id || !content) return NextResponse.json({ error: 'Missing conversation_id or content' }, { status: 400 })

  const { data, error } = await supabase.rpc('send_message', {
    p_conversation_id: conversation_id,
    p_content: content,
    p_message_type: message_type || 'text',
    p_metadata: metadata || {},
    p_reply_to: reply_to || null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  const supabase = createApiClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { conversation_id } = await request.json()
  if (!conversation_id) return NextResponse.json({ error: 'Missing conversation_id' }, { status: 400 })

  const { error } = await supabase.rpc('mark_conversation_read', {
    p_conversation_id: conversation_id,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
