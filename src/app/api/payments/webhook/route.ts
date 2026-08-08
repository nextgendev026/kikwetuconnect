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
  if (!secret) return false
  if (!signature) return false
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64')
  if (expected.length !== signature.length) return false
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

/** Match the caller against the configured Safaricom source IP allowlist. */
function isAllowedSource(request: NextRequest): boolean {
  const allowlist = (process.env.MPESA_WEBHOOK_ALLOWED_IPS || '')
    .split(',').map(s => s.trim()).filter(Boolean)
  if (allowlist.length === 0) return false
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || ''
  return allowlist.includes(ip)
}

export async function POST(request: NextRequest) {
  if (!checkRateLimit('webhook-mpesa', 120, 60_000)) {
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Rate limited' }, { status: 429 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get('x-mpesa-signature')

  // Fail closed: require a known source IP or a valid HMAC signature.
  // Previously an unset secret silently disabled verification entirely.
  const sourceOk = isAllowedSource(request)
  const signatureOk = verifyMpesaSignature(rawBody, signature)
  if (!sourceOk && !signatureOk) {
    const allowlist = process.env.MPESA_WEBHOOK_ALLOWED_IPS
    const secret = process.env.MPESA_WEBHOOK_SECRET
    if (!allowlist && !secret) {
      return NextResponse.json(
        { ResultCode: 1, ResultDesc: 'Webhook not configured (set MPESA_WEBHOOK_ALLOWED_IPS or MPESA_WEBHOOK_SECRET)' },
        { status: 503 }
      )
    }
    console.error('M-Pesa webhook rejected: source IP not allowlisted and signature invalid')
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Unauthorized' }, { status: 403 })
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
          let paidAmount: number | null = null

          if (CallbackMetadata?.Item) {
            for (const item of CallbackMetadata.Item) {
              if (item.Name === 'MpesaReceiptNumber') mpesaReceipt = item.Value
              if (item.Name === 'PhoneNumber') phoneNumber = item.Value
              if (item.Name === 'TransactionDate') transactionDate = item.Value
              if (item.Name === 'Amount') paidAmount = Number(item.Value)
            }
          }

          // Cross-check the paid amount against the order total before confirming.
          if (paidAmount !== null && order.total_price != null && paidAmount !== order.total_price) {
            console.error(`M-Pesa amount mismatch for order ${order.id}: expected ${order.total_price}, got ${paidAmount}`)
            return NextResponse.json({ ResultCode: 1, ResultDesc: 'Amount mismatch' }, { status: 400 })
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

          // Cross-check the paid amount against the requested top-up amount.
          if (amount !== null && topup.amount != null && amount !== topup.amount) {
            console.error(`M-Pesa amount mismatch for top-up ${topup.id}: expected ${topup.amount}, got ${amount}`)
            return NextResponse.json({ ResultCode: 1, ResultDesc: 'Amount mismatch' }, { status: 400 })
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
        // Cross-check the C2B payment amount against the order total.
        if (order.total_price != null && Number(TransAmount) !== order.total_price) {
          console.error(`M-Pesa C2B amount mismatch for order ${order.id}: expected ${order.total_price}, got ${TransAmount}`)
          return NextResponse.json({ ResultCode: 1, ResultDesc: 'Amount mismatch' }, { status: 400 })
        }

        await supabase.rpc('confirm_order_payment', {
          p_order_id: order.id,
          p_payment_provider: 'mpesa_c2b',
          p_payment_reference: TransID,
        })

        await supabase.from('tips').insert({
          sender_id: order.buyer_id,
          professional_id: order.buyer_id,
          session_id: null,
          amount: Number(TransAmount),
          fee: 0,
          net_amount: Number(TransAmount),
          currency: 'KES',
          mpesa_reference: TransID,
          status: 'completed',
        })
      }

      if (BillRefNumber && BillRefNumber.startsWith('WALLET-')) {
        const { data: topup } = await supabase
          .from('wallet_topups')
          .select('id, status, amount, checkout_request_id')
          .eq('account_reference', BillRefNumber)
          .maybeSingle()

        if (topup) {
          // Cross-check the C2B payment amount against the requested top-up.
          if (topup.amount != null && Number(TransAmount) !== topup.amount) {
            console.error(`M-Pesa C2B amount mismatch for top-up ${topup.id}: expected ${topup.amount}, got ${TransAmount}`)
            return NextResponse.json({ ResultCode: 1, ResultDesc: 'Amount mismatch' }, { status: 400 })
          }

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
