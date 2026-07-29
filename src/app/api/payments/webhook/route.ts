import { createApiClient } from '@/lib/server-supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { Body: { stkCallback } } = body

    if (!stkCallback) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback

    // Find the order by payment_reference (CheckoutRequestID)
    const supabase = createApiClient(request)
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
      // Payment successful
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

      // Record the transaction
      await supabase.from('tips').insert({
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

      console.log(`Payment confirmed: Order ${order.id}, Receipt ${mpesaReceipt}`)
    } else {
      console.warn(`Payment failed for order ${order.id}: ${ResultDesc}`)
    }

    // Safaricom expects ResultCode 0 to acknowledge receipt
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Success' })
  } catch (e: any) {
    console.error('Webhook error:', e)
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'mpesa-webhook' })
}
