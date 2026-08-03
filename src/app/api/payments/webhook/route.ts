import { createServiceClient } from '@/lib/server-supabase'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const RATE_LIMIT_STORE = new Map<string, { count: number; resetAt: number }>()
function checkRateLimit(key: string, maxRequests = 60, windowMs = 60_000): boolean {
  const now = Date.now()
  const entry = RATE_LIMIT_STORE.get(key)
  if (!entry || now > entry.resetAt) {
    RATE_LIMIT_STORE.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= maxRequests) return false
  entry.count++
  return true
}

function verifyMpesaSignature(body: string, signature: string | null): boolean {
  const secret = process.env.MPESA_WEBHOOK_SECRET
  if (!secret) return true
  if (!signature) return false
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64')
  if (expected.length !== signature.length) return false
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

export async function POST(request: NextRequest) {
  if (!checkRateLimit('webhook-mpesa', 120, 60_000)) {
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Rate limited' }, { status: 429 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get('x-mpesa-signature') || request.headers.get('x-mpesa-signature')

  if (process.env.MPESA_WEBHOOK_SECRET && !verifyMpesaSignature(rawBody, signature)) {
    console.error('M-Pesa webhook signature verification failed')
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Invalid signature' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Invalid JSON' }, { status: 400 })
  }

  try {
    const supabase = createServiceClient()

    if ((body as any).Body?.stkCallback) {
      const { stkCallback } = (body as any).Body
      const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback

      const { data: order } = await supabase
        .from('marketplace_orders')
        .select('id, status, buyer_id, total_price')
        .eq('payment_reference', CheckoutRequestID)
        .maybeSingle()

      if (order) {
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

      const { data: topup } = await supabase
        .from('wallet_topups')
        .select('id, status, amount')
        .eq('checkout_request_id', CheckoutRequestID)
        .maybeSingle()

      if (topup) {
        if (ResultCode === 0) {
          let mpesaReceipt = ''
          let amount = null
          if (CallbackMetadata?.Item) {
            for (const item of CallbackMetadata.Item) {
              if (item.Name === 'MpesaReceiptNumber') mpesaReceipt = item.Value
              if (item.Name === 'Amount') amount = Number(item.Value)
            }
          }
          await supabase.rpc('complete_wallet_topup', {
            p_checkout_request_id: CheckoutRequestID,
            p_mpesa_reference: mpesaReceipt || CheckoutRequestID,
            p_amount: amount,
          })
          console.log(`Wallet top-up confirmed: ${topup.id}, Receipt ${mpesaReceipt}`)
        } else {
          await supabase.rpc('fail_wallet_topup', {
            p_checkout_request_id: CheckoutRequestID,
            p_error: ResultDesc,
          })
          console.warn(`Wallet top-up failed for ${topup.id}: ${ResultDesc}`)
        }

        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Success' })
      }

      console.error(`No order or top-up found for CheckoutRequestID: ${CheckoutRequestID}`)
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }

    if ((body as any).TransactionType === 'Pay Bill' || (body as any).BillRefNumber) {
      const {
        TransID, TransTime, TransAmount, BillRefNumber,
        MSISDN, FirstName, MiddleName, LastName,
      } = body as any

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

      if (BillRefNumber && BillRefNumber.startsWith('WALLET-')) {
        const { data: topup } = await supabase
          .from('wallet_topups')
          .select('id, status, checkout_request_id')
          .eq('account_reference', BillRefNumber)
          .maybeSingle()

        if (topup) {
          await supabase.rpc('complete_wallet_topup', {
            p_checkout_request_id: topup.checkout_request_id,
            p_mpesa_reference: TransID,
            p_amount: Number(TransAmount) || null,
          })
          console.log(`Wallet top-up confirmed via C2B: ${topup.id}, Receipt ${TransID}`)
        }
      }

      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Success' })
    }

    if ((body as any).ValidationRequest) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Success' })
    }

    if ((body as any).Result?.ResultParameters) {
      console.log('B2C result received:', JSON.stringify(body))
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Success' })
    }

    console.log('Unhandled webhook payload:', JSON.stringify(body))
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    console.error('Webhook error:', message)
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'mpesa-webhook',
    environment: process.env.MPESA_ENV || 'sandbox',
  })
}
