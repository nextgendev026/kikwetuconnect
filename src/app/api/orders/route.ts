import { createApiClient } from '@/lib/server-supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { listing_id, quantity, delivery_address, contact_phone, delivery_notes } = await request.json()

    if (!listing_id || !quantity || !delivery_address || !contact_phone) {
      return NextResponse.json({ error: 'Missing required fields (listing_id, quantity, delivery_address, contact_phone)' }, { status: 400 })
    }
    if (quantity < 1) return NextResponse.json({ error: 'Quantity must be at least 1' }, { status: 400 })
    if (!/^0\d{9}$/.test(contact_phone.replace(/\s/g, '')) && !/^\+254\d{9}$/.test(contact_phone.replace(/\s/g, ''))) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 })
    }

    const { data: listing, error: listingErr } = await supabase
      .from('marketplace_listings').select('id, seller_id, price, stock_quantity, is_active, status, title').eq('id', listing_id).single()
    if (listingErr || !listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    if (!listing.is_active || listing.status !== 'active') return NextResponse.json({ error: 'Listing is no longer active' }, { status: 400 })
    if (listing.seller_id === user.id) return NextResponse.json({ error: 'You cannot buy your own listing' }, { status: 400 })
    if (listing.stock_quantity !== null && listing.stock_quantity < quantity) {
      return NextResponse.json({ error: `Only ${listing.stock_quantity} available` }, { status: 400 })
    }

    const total_price = listing.price * quantity

    const { data: order, error: orderErr } = await supabase
      .from('marketplace_orders').insert({
        listing_id, buyer_id: user.id, seller_id: listing.seller_id,
        quantity, unit_price: listing.price, total_price,
        status: 'pending', delivery_address: delivery_address.trim(),
        contact_phone: contact_phone.trim(), delivery_notes: delivery_notes?.trim() || null,
      }).select().single()

    if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 400 })

    return NextResponse.json({ order, message: 'Order placed' })
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

    const { data: order } = await supabase.from('marketplace_orders').select('*').eq('id', order_id).single()
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const isBuyer = order.buyer_id === user.id
    const isSeller = order.seller_id === user.id

    const transitions: Record<string, string[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['shipped', 'cancelled'],
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
    if (status === 'cancelled' && !isBuyer && !isSeller) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const { error: updateErr } = await supabase.from('marketplace_orders').update({ status, updated_at: new Date().toISOString() }).eq('id', order_id)
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 })

    return NextResponse.json({ message: `Order ${status}` })
  } catch (e: any) {
    console.error('Update order error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
