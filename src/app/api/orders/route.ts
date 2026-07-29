import { createApiClient } from '@/lib/server-supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { listing_id, quantity, delivery_address, contact_phone, delivery_notes } = await request.json()
    if (!listing_id || !quantity || !delivery_address || !contact_phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (quantity < 1) return NextResponse.json({ error: 'Quantity must be at least 1' }, { status: 400 })
    if (!/^0\d{9}$/.test(contact_phone.replace(/\s/g, '')) && !/^\+254\d{9}$/.test(contact_phone.replace(/\s/g, ''))) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 })
    }

    const { data, error } = await supabase.rpc('create_order', {
      p_listing_id: listing_id,
      p_quantity: quantity,
      p_delivery_address: delivery_address.trim(),
      p_contact_phone: contact_phone.trim(),
      p_delivery_notes: delivery_notes?.trim() || null,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ order_id: data.order_id, total_price: data.total_price, message: 'Order placed' })
  } catch (e: any) {
    console.error('Create order error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { order_id, status } = await request.json()
    if (!order_id || !status) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    const validStatuses = ['confirmed', 'shipped', 'delivered', 'cancelled']
    if (!validStatuses.includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

    if (status === 'cancelled') {
      const { error: cancelErr } = await supabase.rpc('cancel_order', { p_order_id: order_id })
      if (cancelErr) return NextResponse.json({ error: cancelErr.message }, { status: 400 })
      return NextResponse.json({ message: 'Order cancelled' })
    }

    const { data: order } = await supabase.from('marketplace_orders').select('*').eq('id', order_id).single()
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const isBuyer = order.buyer_id === user.id
    const isSeller = order.seller_id === user.id

    const transitions: Record<string, string[]> = {
      pending: ['confirmed'],
      confirmed: ['shipped'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: [],
    }
    if (!transitions[order.status]?.includes(status)) {
      return NextResponse.json({ error: `Cannot transition from ${order.status} to ${status}` }, { status: 400 })
    }

    if (status === 'confirmed' && !isSeller) return NextResponse.json({ error: 'Only seller can confirm' }, { status: 403 })
    if (status === 'shipped' && !isSeller) return NextResponse.json({ error: 'Only seller can mark shipped' }, { status: 403 })
    if (status === 'delivered' && !isBuyer) return NextResponse.json({ error: 'Only buyer can mark delivered' }, { status: 403 })

    const { error: updateErr } = await supabase.from('marketplace_orders')
      .update({ status, updated_at: new Date().toISOString() }).eq('id', order_id)
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 })

    return NextResponse.json({ message: `Order ${status}` })
  } catch (e: any) {
    console.error('Update order error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
