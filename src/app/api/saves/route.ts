import { withAuth } from '@/lib/server-supabase'
import { NextResponse } from 'next/server'

export const POST = withAuth(async (request, { supabase, user }) => {
  try {
    const { target_type, target_id } = await request.json()
    if (!target_type || !target_id) return NextResponse.json({ error: 'Missing target_type or target_id' }, { status: 400 })
    if (!['post', 'answer', 'listing'].includes(target_type)) return NextResponse.json({ error: 'Invalid target type' }, { status: 400 })

    const { data, error } = await supabase.rpc('toggle_save', {
      p_target_type: target_type,
      p_target_id: target_id,
    })

    if (error) throw error
    return NextResponse.json(data)
  } catch (e: any) {
    console.error('Save error:', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
})
