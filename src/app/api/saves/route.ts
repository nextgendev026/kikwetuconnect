import { createApiClient } from '@/lib/server-supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { target_type, target_id } = await request.json()
    if (!target_type || !target_id) return NextResponse.json({ error: 'Missing target_type or target_id' }, { status: 400 })
    if (!['post', 'listing'].includes(target_type)) return NextResponse.json({ error: 'Invalid target type' }, { status: 400 })

    const table = target_type === 'post' ? 'saves' : 'saved_listings'
    const targetCol = target_type === 'post' ? 'target_id' : 'listing_id'

    const { data: existing } = await supabase
      .from(table).select('id').eq('user_id', user.id).eq(targetCol, target_id).maybeSingle()

    if (existing) {
      await supabase.from(table).delete().eq('id', existing.id)
      return NextResponse.json({ saved: false })
    }

    const insertData: Record<string, any> = { user_id: user.id }
    insertData[targetCol] = target_id
    if (target_type === 'post') insertData.target_type = 'post'
    await supabase.from(table).insert(insertData)

    return NextResponse.json({ saved: true })
  } catch (e: any) {
    console.error('Save error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
