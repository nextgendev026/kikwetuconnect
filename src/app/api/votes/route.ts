import { createApiClient } from '@/lib/server-supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createApiClient(request)
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
  const { data: existingVote } = await supabase
    .from('votes')
    .select('id, vote_type')
    .eq('user_id', user.id)
    .eq('target_type', target_type)
    .eq('target_id', target_id)
    .maybeSingle()
  if (existingVote) {
    if (existingVote.vote_type === vote_type) {
      await supabase.from('votes').delete().eq('id', existingVote.id)
      return NextResponse.json({ vote_type: null })
    } else {
      await supabase.from('votes').update({ vote_type }).eq('id', existingVote.id)
      return NextResponse.json({ vote_type })
    }
  }
  await supabase.from('votes').insert({
    user_id: user.id,
    target_type,
    target_id,
    vote_type,
  })
  const { data: target } = await supabase
    .from(target_type === 'post' ? 'posts' : 'answers')
    .select('user_id')
    .eq('id', target_id)
    .maybeSingle()
  if (target?.user_id && target.user_id !== user.id && vote_type === 1) {
    await supabase.from('notifications').insert({
      user_id: target.user_id,
      actor_id: user.id,
      type: 'upvote',
      target_id,
      target_type,
      content: `Your ${target_type === 'post' ? 'post' : 'answer'} was upvoted`,
      meta: { link: `/${target_type === 'post' ? 'posts' : 'answers'}/${target_id}` },
    })
  }
  return NextResponse.json({ vote_type })
}

export async function DELETE(request: NextRequest) {
  const supabase = createApiClient(request)
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
