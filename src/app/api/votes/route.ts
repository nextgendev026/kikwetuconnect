import { withAuth, createServiceClient } from '@/lib/server-supabase'
import { trackActivity } from '@/lib/activity'
import { dispatchPushForNotification } from '@/lib/push-notifications'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'
import { NextResponse } from 'next/server'

export const POST = withAuth(async (request, { supabase, user }) => {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  if (!checkRateLimit('votes-post', ip, 30, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const svc = createServiceClient()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { target_type, target_id, vote_type } = body as { target_type?: string; target_id?: string; vote_type?: number }
  if (!['post', 'answer'].includes(target_type || '')) {
    return NextResponse.json({ error: 'Invalid target type' }, { status: 400 })
  }
  if (![1, -1].includes(vote_type || 0)) {
    return NextResponse.json({ error: 'Invalid vote type' }, { status: 400 })
  }
  if (!target_id || typeof target_id !== 'string') {
    return NextResponse.json({ error: 'Invalid target ID' }, { status: 400 })
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
    const { data: notifRow } = await svc.from('notifications').insert({
      user_id: target.user_id,
      actor_id: user.id,
      type: 'upvote',
      target_id,
      target_type,
      content: `Your ${target_type === 'post' ? 'post' : 'answer'} was upvoted`,
      meta: { link: `/${target_type === 'post' ? 'posts' : 'answers'}/${target_id}` },
    }).select().single()
    if (notifRow) await dispatchPushForNotification(notifRow)
  }

  await trackActivity(supabase, {
    eventType: vote_type === 1 ? 'post_upvoted' : 'post_downvoted',
    entityType: target_type,
    entityId: target_id,
  }, user.id)

  return NextResponse.json({ vote_type })
})

export const DELETE = withAuth(async (request, { supabase, user }) => {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  if (!checkRateLimit('votes-delete', ip, 30, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
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
})
