import { withAuth } from '@/lib/server-supabase'
import { NextResponse } from 'next/server'

export const GET = withAuth(async (request, { supabase, user }) => {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '30')
  const offset = parseInt(searchParams.get('offset') || '0')

  const { data, error } = await supabase.rpc('get_personalized_feed', {
    p_user_id: user.id,
    p_limit: limit,
    p_offset: offset,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ posts: data })
})
