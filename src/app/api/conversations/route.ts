import { createApiClient } from '@/lib/server-supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createApiClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  const conversations = (data || []).map((cp: any) => {
    const conv = cp.conversations
    const participants = (conv.conversation_participants || [])
      .map((p: any) => p.profiles)
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
}

export async function POST(request: NextRequest) {
  const supabase = createApiClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type: convType, title, member_ids } = await request.json()

  const { data, error } = await supabase.rpc('create_conversation', {
    p_type: convType || 'dm',
    p_title: title || null,
    p_member_ids: member_ids || [],
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ conversation_id: data })
}
