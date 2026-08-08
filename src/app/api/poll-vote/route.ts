import { withAuth } from '@/lib/server-supabase'
import { NextResponse } from 'next/server'

export const POST = withAuth(async (request, { supabase, user }) => {
  try {
    const body = await request.json()
    const { postId, optionId } = body

    if (!postId || !optionId) {
      return NextResponse.json(
        { error: 'Missing postId or optionId' },
        { status: 400 }
      )
    }

    const { error: voteError } = await supabase.rpc('vote_on_poll_option', {
      p_post_id: postId,
      p_option_id: optionId,
    })

    if (voteError) {
      return NextResponse.json({ error: voteError.message }, { status: 400 })
    }

    return NextResponse.json({ message: 'Vote recorded' })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
