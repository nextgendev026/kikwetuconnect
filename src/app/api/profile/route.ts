import { withAuth } from '@/lib/server-supabase'
import { trackActivity } from '@/lib/activity'
import { NextResponse } from 'next/server'

export const POST = withAuth(async (request, { supabase, user }) => {
  try {
    const body = await request.json()
    const { action } = body

    // Follow/unfollow a user (direct toggle — no approval needed)
    if (action === 'follow') {
      const { target_user_id } = body
      if (!target_user_id) return NextResponse.json({ error: 'target_user_id required' }, { status: 400 })
      if (target_user_id === user.id) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })

      const { data, error } = await supabase.rpc('toggle_follow', {
        p_target_id: target_user_id
      })

      if (error) throw error

      const result = data as any
      const following = result?.following === true

      await trackActivity(
        supabase,
        { eventType: following ? 'follow' : 'unfollow', entityType: 'user', entityId: target_user_id },
        user.id
      )

      return NextResponse.json({ following, action: following ? 'following' : 'unfollowed' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: unknown) {
    console.error('Profile API error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})