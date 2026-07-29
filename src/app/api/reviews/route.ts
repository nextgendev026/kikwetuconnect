import { createApiClient } from '@/lib/server-supabase'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const reviewSchema = z.object({
  order_id: z.string().uuid(),
  listing_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const parsed = reviewSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

    const { order_id, listing_id, rating, comment } = parsed.data

    const { data: order } = await supabase
      .from('marketplace_orders').select('id, buyer_id, status').eq('id', order_id).single()
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.buyer_id !== user.id) return NextResponse.json({ error: 'Only the buyer can review' }, { status: 403 })
    if (order.status !== 'delivered') return NextResponse.json({ error: 'Can only review delivered orders' }, { status: 400 })

    const { data: existing } = await supabase
      .from('marketplace_reviews').select('id').eq('order_id', order_id).eq('reviewer_id', user.id).maybeSingle()
    if (existing) return NextResponse.json({ error: 'Already reviewed this order' }, { status: 409 })

    const { error: insertErr } = await supabase.from('marketplace_reviews').insert({
      order_id, reviewer_id: user.id, listing_id,
      rating, comment: comment?.trim() || null,
    })
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 400 })

    return NextResponse.json({ message: 'Review submitted' })
  } catch (e: any) {
    console.error('Review error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
