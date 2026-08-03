import { withAuth } from '@/lib/server-supabase'
import { NextResponse } from 'next/server'

export const GET = withAuth(async (request, { supabase, user }) => {
  const { data, error } = await supabase
    .from('conversation_participants')
    .select(`
      conversation_id,
      conversations (
        id, type, title, last_message, last_message_at, updated_at, created_at,
        created_by,
        conversation_participants (
          user_id,
          profiles (id, username, full_name, avatar_url)
        )
      )
    `)
    .eq('user_id', user.id)
    .order('conversation_id', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const conversations = (data || []).map((cp: Record<string, unknown>) => {
    const conv = cp.conversations as Record<string, unknown>
    const participants = ((conv.conversation_participants as Array<Record<string, unknown>>) || [])
      .map((p) => p.profiles)
      .filter(Boolean)
    return {
      id: conv.id,
      type: conv.type,
      title: conv.title,
      last_message: conv.last_message,
      last_message_at: conv.last_message_at,
      updated_at: conv.updated_at,
      created_at: conv.created_at,
      created_by: conv.created_by,
      participants,
    }
  })

  return NextResponse.json(conversations)
})

export const POST = withAuth(async (request, { supabase, user }) => {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { type: convType, title, member_ids } = body as {
    type?: string; title?: string; member_ids?: string[]
  }

  if (!member_ids || !Array.isArray(member_ids) || member_ids.length === 0) {
    return NextResponse.json({ error: 'member_ids is required' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('create_conversation', {
    p_type: convType || 'dm',
    p_title: title || null,
    p_member_ids: member_ids,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ conversation_id: data })
})
