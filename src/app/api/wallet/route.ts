import { withAuth } from '@/lib/server-supabase'
import { NextResponse } from 'next/server'

export const GET = withAuth(async (request, { supabase, user }) => {
  try {
    // Get total tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('tokens')
      .select('amount, type')
      .eq('user_id', user.id)

    if (tokenError) {
      return NextResponse.json(
        { error: tokenError.message },
        { status: 400 }
      )
    }

    const totalTokens = tokenData?.reduce((sum, item) => sum + item.amount, 0) || 0

    // Get token history (last 20)
    const { data: history, error: historyError } = await supabase
      .from('tokens')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (historyError) {
      return NextResponse.json(
        { error: historyError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      totalTokens,
      history,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
