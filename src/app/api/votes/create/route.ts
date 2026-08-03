import { withAuth } from '@/lib/server-supabase'
import { NextResponse } from 'next/server'

export const POST = withAuth(async (request, { supabase, user }) => {
  try {
    const body = await request.json()
    const { targetId, targetType, voteType } = body

    if (!targetId || !targetType || voteType === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!['post', 'answer'].includes(targetType)) {
      return NextResponse.json(
        { error: 'Invalid target type' },
        { status: 400 }
      )
    }

    // Check if vote already exists
    const { data: existingVote } = await supabase
      .from('votes')
      .select('id')
      .eq('user_id', user.id)
      .eq('target_id', targetId)
      .eq('target_type', targetType)
      .maybeSingle()

    if (existingVote) {
      // If same vote type, remove it (toggle off)
      const { data: currentVote } = await supabase
        .from('votes')
        .select('vote_type')
        .eq('id', existingVote.id)
        .maybeSingle()

      if (currentVote?.vote_type === voteType) {
        // Delete vote
        await supabase.from('votes').delete().eq('id', existingVote.id)
        return NextResponse.json({ message: 'Vote removed' })
      } else {
        // Update vote
        await supabase
          .from('votes')
          .update({ vote_type: voteType })
          .eq('id', existingVote.id)
        return NextResponse.json({ message: 'Vote updated' })
      }
    }

    // Create new vote
    const { error: voteError } = await supabase
      .from('votes')
      .insert({
        user_id: user.id,
        target_id: targetId,
        target_type: targetType,
        vote_type: voteType,
      })

    if (voteError) {
      return NextResponse.json(
        { error: voteError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'Vote created successfully',
    })
  } catch (error: any) {
    console.error('Vote error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
