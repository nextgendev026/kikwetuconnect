import { createApiClient } from '@/lib/server-supabase'
import { NextRequest, NextResponse } from 'next/server'
import { stkPush, stkQuery, c2bRegisterURLs, b2cPayment, transactionStatus, accountBalance, normalizePhone } from '@/lib/mpesa'

export async function POST(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { action } = body

    // --- STK Push (Lipa Na MPESA) ---
    if (action === 'stk-push') {
      const { order_id, phone } = body
      if (!order_id || !phone) return NextResponse.json({ error: 'Missing order_id or phone' }, { status: 400 })

      const { data: order, error: orderErr } = await supabase
        .from('marketplace_orders')
        .select('id, total_price, status, buyer_id')
        .eq('id', order_id)
        .maybeSingle()

      if (orderErr || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      if (order.buyer_id !== user.id) return NextResponse.json({ error: 'Not your order' }, { status: 403 })
      if (order.status !== 'pending') return NextResponse.json({ error: 'Order is not pending' }, { status: 400 })

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kikwetuconnect.vercel.app'

      const result = await stkPush({
        amount: order.total_price,
        phone: normalizePhone(phone),
        accountReference: `ORDER-${order_id.slice(0, 8)}`,
        transactionDesc: `Payment for order ${order_id.slice(0, 8)}`,
        callbackUrl: `${appUrl}/api/payments/webhook`,
      })

      if (result.ResponseCode !== '0') {
        return NextResponse.json({ error: result.ResponseDescription || 'Payment initiation failed' }, { status: 400 })
      }

      await supabase.from('marketplace_orders')
        .update({
          payment_provider: 'mpesa',
          payment_reference: result.CheckoutRequestID,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order_id)

      return NextResponse.json({
        success: true,
        checkout_request_id: result.CheckoutRequestID,
        message: 'STK push sent. Check your phone to complete payment.',
      })
    }

    // --- STK Query ---
    if (action === 'stk-query') {
      const { checkout_request_id } = body
      if (!checkout_request_id) return NextResponse.json({ error: 'Missing checkout_request_id' }, { status: 400 })
      const result = await stkQuery(checkout_request_id)
      return NextResponse.json(result)
    }

    // --- C2B Register URLs ---
    if (action === 'c2b-register') {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kikwetuconnect.vercel.app'
      const result = await c2bRegisterURLs({
        confirmationURL: `${appUrl}/api/payments/webhook`,
        validationURL: `${appUrl}/api/payments/validate`,
      })
      return NextResponse.json(result)
    }

    // --- B2C Payment (payout to user) ---
    if (action === 'b2c-payment') {
      const { amount, phone, command_id, remarks } = body
      if (!amount || !phone) return NextResponse.json({ error: 'Missing amount or phone' }, { status: 400 })

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kikwetuconnect.vercel.app'

      const result = await b2cPayment({
        amount,
        phone: normalizePhone(phone),
        commandID: command_id || 'BusinessPayment',
        initiatorName: process.env.MPESA_INITIATOR_NAME || 'testapi',
        securityCredential: process.env.MPESA_SECURITY_CREDENTIAL || '',
        queueTimeOutURL: `${appUrl}/api/payments/b2c-timeout`,
        resultURL: `${appUrl}/api/payments/b2c-result`,
        remarks: remarks || 'Payout',
      })
      return NextResponse.json(result)
    }

    // --- Transaction Status ---
    if (action === 'transaction-status') {
      const { transaction_id } = body
      if (!transaction_id) return NextResponse.json({ error: 'Missing transaction_id' }, { status: 400 })

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kikwetuconnect.vercel.app'
      const result = await transactionStatus({
        transactionID: transaction_id,
        queueTimeOutURL: `${appUrl}/api/payments/timeout`,
        resultURL: `${appUrl}/api/payments/status-result`,
      })
      return NextResponse.json(result)
    }

    // --- Account Balance ---
    if (action === 'account-balance') {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kikwetuconnect.vercel.app'
      const result = await accountBalance({
        queueTimeOutURL: `${appUrl}/api/payments/timeout`,
        resultURL: `${appUrl}/api/payments/balance-result`,
      })
      return NextResponse.json(result)
    }

    // Fallback: keep existing order-payment shortcut (action omitted)
    if (!action) {
      const { order_id, phone } = body
      if (!order_id || !phone) return NextResponse.json({ error: 'Missing order_id or phone' }, { status: 400 })

      const { data: order, error: orderErr } = await supabase
        .from('marketplace_orders')
        .select('id, total_price, status, buyer_id')
        .eq('id', order_id)
        .maybeSingle()

      if (orderErr || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      if (order.buyer_id !== user.id) return NextResponse.json({ error: 'Not your order' }, { status: 403 })
      if (order.status !== 'pending') return NextResponse.json({ error: 'Order is not pending' }, { status: 400 })

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kikwetuconnect.vercel.app'
      const result = await stkPush({
        amount: order.total_price,
        phone: normalizePhone(phone),
        accountReference: `ORDER-${order_id.slice(0, 8)}`,
        callbackUrl: `${appUrl}/api/payments/webhook`,
      })

      if (result.ResponseCode !== '0') {
        return NextResponse.json({ error: result.ResponseDescription || 'Payment initiation failed' }, { status: 400 })
      }

      await supabase.from('marketplace_orders')
        .update({ payment_provider: 'mpesa', payment_reference: result.CheckoutRequestID, updated_at: new Date().toISOString() })
        .eq('id', order_id)

      return NextResponse.json({ success: true, checkout_request_id: result.CheckoutRequestID, message: 'STK push sent. Check your phone.' })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    console.error('Payment error:', e)
    return NextResponse.json({ error: e.message || 'Payment service error' }, { status: 500 })
  }
}
