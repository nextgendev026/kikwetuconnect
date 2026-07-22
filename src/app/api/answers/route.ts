import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/lib/supabase'

export async function POST(request: Request) {
  const supabase = createServerComponentClient<Database>({ cookies })
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { post_id, content } = body

  if (!post_id || !content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Verify post exists and is an inquiry
  const { data: post } = await supabase
    .from('posts')
    .select('id, post_type, bounty_tokens, user_id')
    .eq('id', post_id)
    .single<Database['public']['Tables']['posts']['Row']>()

  if (!post || post.post_type !== 'inquiry') {
    return NextResponse.json({ error: 'Invalid post' }, { status: 400 })
  }

  // Create answer
  const { data: answer, error } = await supabase
    .from('answers')
    .insert({
      post_id,
      user_id: user.id,
      content,
    } as any)
    .select()
    .single<Database['public']['Tables']['answers']['Row']>()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Create notification for post author
  if (post.user_id !== user.id) {
    await supabase.from('notifications').insert({
      user_id: post.user_id,
      actor_id: user.id,
      type: 'answer',
      target_id: answer.id,
      target_type: 'answer',
      content: 'answered your question',
    } as any)
  }

  return NextResponse.json({ answer })
}

export async function PUT(request: Request) {
  const supabase = createServerComponentClient<Database>({ cookies })
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { answer_id, content, is_expert_solution } = body

  // Check if user is the answer author
  const { data: answerData } = await supabase
    .from('answers')
    .select('user_id')
    .eq('id', answer_id)
    .single<Database['public']['Tables']['answers']['Row']>()

  if (!answerData || answerData.user_id !== user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const updates: any = {}
  if (content) updates.content = content
  if (typeof is_expert_solution === 'boolean') {
    // Only verified experts can mark expert solutions
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_verified_expert')
      .eq('id', user.id)
      .single<Database['public']['Tables']['profiles']['Row']>()

    if (!profile?.is_verified_expert) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }
    updates.is_expert_solution = is_expert_solution
  }

  const { data: updated } = await (supabase as any)
    .from('answers')
    .update(updates)
    .eq('id', answer_id)
    .select()
    .single()

  return NextResponse.json({ answer: updated })
}