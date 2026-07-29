import { createApiClient } from '@/lib/server-supabase'
import { NextRequest, NextResponse } from 'next/server'

interface MpesaStkResponse {
  MerchantRequestID: string
  CheckoutRequestID: string
  ResponseCode: string
  ResponseDescription: string
  CustomerMessage: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { order_id, phone } = await request.json()
    if (!order_id || !phone) return NextResponse.json({ error: 'Missing order_id or phone' }, { status: 400 })

    const { data: order, error: orderErr } = await supabase
      .from('marketplace_orders')
      .select('id, total_price, status, buyer_id, contact_phone')
      .eq('id', order_id)
      .single()

    if (orderErr || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.buyer_id !== user.id) return NextResponse.json({ error: 'Not your order' }, { status: 403 })
    if (order.status !== 'pending') return NextResponse.json({ error: 'Order is not pending' }, { status: 400 })

    const mpesaPhone = phone.replace(/\s/g, '').replace(/^0/, '254')
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)
    const shortCode = process.env.MPESA_SHORTCODE || '174379'
    const passkey = process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'
    const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64')
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://kikwetuconnect.vercel.app'}/api/payments/webhook`

    const stkPayload = {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(order.total_price),
      PartyA: mpesaPhone,
      PartyB: shortCode,
      PhoneNumber: mpesaPhone,
      CallBackURL: callbackUrl,
      AccountReference: `ORDER-${order_id.slice(0, 8)}`,
      TransactionDesc: `Payment for order ${order_id.slice(0, 8)}`,
    }

    // Safaricom API call — stubbed if credentials not set
    let mpesaResult: MpesaStkResponse
    if (process.env.MPESA_CONSUMER_KEY && process.env.MPESA_CONSUMER_SECRET) {
      const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64')
      const tokenRes = await fetch('https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
        headers: { Authorization: `Basic ${auth}` },
      })
      const { access_token } = await tokenRes.json()

      const stkRes = await fetch('https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stkPayload),
      })
      mpesaResult = await stkRes.json()
    } else {
      // Sandbox stub — simulate successful response
      mpesaResult = {
        MerchantRequestID: `MR-${Date.now()}`,
        CheckoutRequestID: `CR-${Date.now()}`,
        ResponseCode: '0',
        ResponseDescription: 'Success. Request accepted for processing',
        CustomerMessage: 'Success. Request accepted for processing',
      }
    }

    if (mpesaResult.ResponseCode !== '0') {
      return NextResponse.json({ error: mpesaResult.ResponseDescription || 'Payment initiation failed' }, { status: 400 })
    }

    // Store checkout request ID on order
    await supabase.from('marketplace_orders')
      .update({
        payment_provider: 'mpesa',
        payment_reference: mpesaResult.CheckoutRequestID,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order_id)

    return NextResponse.json({
      success: true,
      checkout_request_id: mpesaResult.CheckoutRequestID,
      message: 'STK push sent. Check your phone to complete payment.',
    })
  } catch (e: any) {
    console.error('Payment error:', e)
    return NextResponse.json({ error: 'Payment service error' }, { status: 500 })
  }
}
