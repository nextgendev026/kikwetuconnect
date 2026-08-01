import { createApiClient, createServiceClient } from '@/lib/server-supabase'
import { trackActivity } from '@/lib/activity'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const svc = createServiceClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { action } = body

    // Follow/unfollow a user
    if (action === 'follow') {
      const { target_user_id } = body
      if (!target_user_id) return NextResponse.json({ error: 'target_user_id required' }, { status: 400 })
      if (target_user_id === user.id) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })

      const { data: existing } = await supabase
        .from('follows').select('id').eq('follower_id', user.id).eq('following_id', target_user_id).maybeSingle()

      if (existing) {
        const { error: delError } = await supabase
          .from('follows').delete().eq('id', existing.id)
        if (delError) throw delError

        // Counter RPCs are service_role-only; identity is enforced server-side.
        const { error: rpc1 } = await svc.rpc('decrement_follower_count', { user_id: target_user_id })
        if (rpc1) console.error('decrement_follower_count error:', rpc1)
        const { error: rpc2 } = await svc.rpc('decrement_following_count', { user_id: user.id })
        if (rpc2) console.error('decrement_following_count error:', rpc2)

        await trackActivity(supabase, { eventType: 'unfollow', entityType: 'user', entityId: target_user_id }, user.id)

        return NextResponse.json({ following: false })
      }

      const { error: insError } = await supabase
        .from('follows').insert({ follower_id: user.id, following_id: target_user_id })
      if (insError) throw insError

      const { error: rpc3 } = await svc.rpc('increment_follower_count', { user_id: target_user_id })
      if (rpc3) console.error('increment_follower_count error:', rpc3)
      const { error: rpc4 } = await svc.rpc('increment_following_count', { user_id: user.id })
      if (rpc4) console.error('increment_following_count error:', rpc4)

      const { error: notifErr } = await svc.rpc('create_notification', {
        p_user_id: target_user_id,
        p_actor_id: user.id,
        p_type: 'follow',
        p_target_id: target_user_id,
        p_target_type: 'profile',
        p_content: 'started following you',
      })
      if (notifErr) console.error('create_notification error:', notifErr)

      await trackActivity(supabase, { eventType: 'follow', entityType: 'user', entityId: target_user_id }, user.id)

      return NextResponse.json({ following: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    console.error('Profile API error:', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
