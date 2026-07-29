import { createApiClient } from '@/lib/server-supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createApiClient(request)

    // --- STK Push Callback (Lipa Na MPESA) ---
    if (body.Body?.stkCallback) {
      const { stkCallback } = body.Body
      const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback

      const { data: order } = await supabase
        .from('marketplace_orders')
        .select('id, status, buyer_id, total_price')
        .eq('payment_reference', CheckoutRequestID)
        .single()

      if (!order) {
        console.error(`No order found for CheckoutRequestID: ${CheckoutRequestID}`)
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
      }

      if (ResultCode === 0) {
        let mpesaReceipt = ''
        let phoneNumber = ''
        let transactionDate = ''

        if (CallbackMetadata?.Item) {
          for (const item of CallbackMetadata.Item) {
            if (item.Name === 'MpesaReceiptNumber') mpesaReceipt = item.Value
            if (item.Name === 'PhoneNumber') phoneNumber = item.Value
            if (item.Name === 'TransactionDate') transactionDate = item.Value
          }
        }

        await supabase.rpc('confirm_order_payment', {
          p_order_id: order.id,
          p_payment_provider: 'mpesa',
          p_payment_reference: mpesaReceipt || CheckoutRequestID,
        })

        // Record transaction
        const { error: txErr } = await supabase.from('tips').insert({
          sender_id: order.buyer_id,
          professional_id: order.buyer_id,
          session_id: null,
          amount: order.total_price,
          fee: 0,
          net_amount: order.total_price,
          currency: 'KES',
          mpesa_reference: mpesaReceipt || CheckoutRequestID,
          status: 'completed',
        })
        if (txErr) console.error('Failed to record transaction:', txErr)

        console.log(`Payment confirmed: Order ${order.id}, Receipt ${mpesaReceipt}`)
      } else {
        console.warn(`Payment failed for order ${order.id}: ${ResultDesc}`)
      }

      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Success' })
    }

    // --- C2B Confirmation (paybill payment received) ---
    if (body.TransactionType === 'Pay Bill' || body.BillRefNumber) {
      const {
        TransID, TransTime, TransAmount, BillRefNumber,
        MSISDN, FirstName, MiddleName, LastName,
      } = body

      // Try to find order by BillRefNumber
      const { data: order } = await supabase
        .from('marketplace_orders')
        .select('id, status, buyer_id, total_price')
        .eq('payment_reference', BillRefNumber)
        .maybeSingle()

      if (order && order.status === 'pending') {
        await supabase.rpc('confirm_order_payment', {
          p_order_id: order.id,
          p_payment_provider: 'mpesa_c2b',
          p_payment_reference: TransID,
        })

        await supabase.from('tips').insert({
          sender_id: order.buyer_id,
          professional_id: order.buyer_id,
          session_id: null,
          amount: TransAmount,
          fee: 0,
          net_amount: TransAmount,
          currency: 'KES',
          mpesa_reference: TransID,
          status: 'completed',
        })
      }

      // C2B expects empty 200 with "Success"
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Success' })
    }

    // --- C2B Validation ---
    if (body.ValidationRequest) {
      // Accept all validations by default
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Success' })
    }

    // --- B2C Result ---
    if (body.Result?.ResultParameters) {
      console.log('B2C result received:', JSON.stringify(body))
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Success' })
    }

    console.log('Unhandled webhook payload:', JSON.stringify(body))
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  } catch (e: any) {
    console.error('Webhook error:', e)
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }
}

export async function GET(request: NextRequest) {
  const supabase = createApiClient(request)
  const { data: recent } = await supabase
    .from('marketplace_orders')
    .select('id, total_price, status, payment_provider, payment_reference, updated_at')
    .not('payment_provider', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(10)

  return NextResponse.json({
    status: 'ok',
    service: 'mpesa-webhook',
    environment: process.env.MPESA_ENV || 'sandbox',
    recent_payments: recent || [],
  })
}
