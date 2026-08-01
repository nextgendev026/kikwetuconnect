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

    // Follow/unfollow a user (now uses follow request system)
    if (action === 'follow') {
      const { target_user_id } = body
      if (!target_user_id) return NextResponse.json({ error: 'target_user_id required' }, { status: 400 })
      if (target_user_id === user.id) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })

      // Use the new follow request RPC
      const { data, error } = await supabase.rpc('create_follow_request', {
        p_target_id: target_user_id
      })

      if (error) {
        // If already following, unfollow
        if (error.message?.includes('already following')) {
          const { data: existing } = await supabase
            .from('follows').select('id').eq('follower_id', user.id).eq('following_id', target_user_id).maybeSingle()

          if (existing) {
            const { error: delError } = await supabase
              .from('follows').delete().eq('id', existing.id)
            if (delError) throw delError

            const { error: rpc1 } = await svc.rpc('decrement_follower_count', { user_id: target_user_id })
            if (rpc1) console.error('decrement_follower_count error:', rpc1)
            const { error: rpc2 } = await svc.rpc('decrement_following_count', { user_id: user.id })
            if (rpc2) console.error('decrement_following_count error:', rpc2)

            await trackActivity(supabase, { eventType: 'unfollow', entityType: 'user', entityId: target_user_id }, user.id)

            return NextResponse.json({ following: false, action: 'unfollowed' })
          }
        }
        throw error
      }

      const result = data as any
      if (result?.status === 'already_following') {
        return NextResponse.json({ following: true, action: 'already_following' })
      }
      if (result?.status === 'request_pending') {
        return NextResponse.json({ following: false, followRequest: result.request, action: 'request_pending' })
      }
      if (result?.status === 'request_sent') {
        return NextResponse.json({ following: false, followRequestId: result.request_id, action: 'request_sent' })
      }

      return NextResponse.json({ following: false })
    }

    // Accept follow request
    if (action === 'accept_follow_request') {
      const { request_id } = body
      if (!request_id) return NextResponse.json({ error: 'request_id required' }, { status: 400 })

      const { data, error } = await supabase.rpc('accept_follow_request', { p_request_id: request_id })
      if (error) throw error

      const result = data as any
      if (result?.status === 'accepted') {
        await trackActivity(supabase, { eventType: 'follow', entityType: 'user', entityId: user.id }, user.id)
        return NextResponse.json({ success: true, action: 'accepted' })
      }
      return NextResponse.json({ success: false })
    }

    // Decline follow request
    if (action === 'decline_follow_request') {
      const { request_id } = body
      if (!request_id) return NextResponse.json({ error: 'request_id required' }, { status: 400 })

      const { data, error } = await supabase.rpc('decline_follow_request', { p_request_id: request_id })
      if (error) throw error

      return NextResponse.json({ success: true, action: 'declined' })
    }

    // Cancel follow request (by requester)
    if (action === 'cancel_follow_request') {
      const { target_user_id } = body
      if (!target_user_id) return NextResponse.json({ error: 'target_user_id required' }, { status: 400 })

      const { data, error } = await supabase.rpc('cancel_follow_request', { p_target_id: target_user_id })
      if (error) throw error

      return NextResponse.json({ success: true, action: 'cancelled' })
    }

    // Get pending follow requests
    if (action === 'get_pending_follow_requests') {
      const { data, error } = await supabase.rpc('get_pending_follow_requests')
      if (error) throw error
      return NextResponse.json(data)
    }

    // Get sent follow requests
    if (action === 'get_sent_follow_requests') {
      const { data, error } = await supabase.rpc('get_sent_follow_requests')
      if (error) throw error
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    console.error('Profile API error:', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
