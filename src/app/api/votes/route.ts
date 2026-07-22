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
  const { target_type, target_id, vote_type } = body

  if (!['post', 'answer'].includes(target_type)) {
    return NextResponse.json({ error: 'Invalid target type' }, { status: 400 })
  }
  if (![1, -1].includes(vote_type)) {
    return NextResponse.json({ error: 'Invalid vote type' }, { status: 400 })
  }

  // Check if user already voted
  const { data: existingVote } = await supabase
    .from('votes')
    .select('id, vote_type')
    .eq('user_id', user.id)
    .eq('target_type', target_type)
    .eq('target_id', target_id)
    .single<Database['public']['Tables']['votes']['Row']>()

  if (existingVote) {
    if (existingVote.vote_type === vote_type) {
      // Remove vote (toggle off)
      await supabase.from('votes').delete().eq('id', existingVote.id)
      return NextResponse.json({ vote_type: null })
    } else {
      // Change vote
      await (supabase as any)
        .from('votes')
        .update({ vote_type })
        .eq('id', existingVote.id)
      return NextResponse.json({ vote_type })
    }
  }

  // Create new vote
  await supabase.from('votes').insert({
    user_id: user.id,
    target_type,
    target_id,
    vote_type,
  } as any)

  // Create notification for post/answer author
  const { data: target } = await supabase
    .from(target_type === 'post' ? 'posts' : 'answers')
    .select('user_id')
    .eq('id', target_id)
    .single<{ user_id: string }>()

  if (target && target.user_id !== user.id && vote_type === 1) {
    await supabase.from('notifications').insert({
      user_id: target.user_id,
      actor_id: user.id,
      type: 'upvote',
      target_id,
      target_type,
      content: `${target_type === 'post' ? 'post' : 'answer'} upvoted`,
    } as any)
  }

  return NextResponse.json({ vote_type })
}

export async function DELETE(request: Request) {
  const supabase = createServerComponentClient<Database>({ cookies })
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const target_type = searchParams.get('target_type')
  const target_id = searchParams.get('target_id')

  if (!target_type || !target_id) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  await supabase
    .from('votes')
    .delete()
    .eq('user_id', user.id)
    .eq('target_type', target_type)
    .eq('target_id', target_id)

  return NextResponse.json({ success: true })
}