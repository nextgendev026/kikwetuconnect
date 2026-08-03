import { withAuth } from '@/lib/server-supabase'
import { NextResponse } from 'next/server'

export const POST = withAuth(async (request, { supabase, user }) => {
  try {
    const body = await request.json()
    const { topicId, action } = body

    if (!topicId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (action === 'follow') {
      // Check if already following
      const { data: existing } = await supabase
        .from('user_topics')
        .select('*')
        .eq('user_id', user.id)
        .eq('topic_id', topicId)
        .maybeSingle()

      if (existing) {
        return NextResponse.json(
          { error: 'Already following this topic' },
          { status: 400 }
        )
      }

      // Follow topic
      const { error } = await supabase
        .from('user_topics')
        .insert({
          user_id: user.id,
          topic_id: topicId,
        })

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }

      // Update topic follower count
      await supabase.rpc('update_topic_followers', {
        topic_id: topicId,
        increment: 1,
      })
    } else if (action === 'unfollow') {
      // Unfollow topic
      const { error } = await supabase
        .from('user_topics')
        .delete()
        .eq('user_id', user.id)
        .eq('topic_id', topicId)

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }

      // Update topic follower count
      await supabase.rpc('update_topic_followers', {
        topic_id: topicId,
        increment: -1,
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: `Topic ${action}ed successfully`,
    })
  } catch (error: any) {
    console.error('Follow topic error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
