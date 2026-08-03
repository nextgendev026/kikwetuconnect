const SANDBOX_BASE = 'https://sandbox.safaricom.co.ke'
const PRODUCTION_BASE = 'https://api.safaricom.co.ke'

function isSandbox() {
  return process.env.MPESA_ENV !== 'production'
}

function baseUrl() {
  return isSandbox() ? SANDBOX_BASE : PRODUCTION_BASE
}

function shortCode() {
  const sc = process.env.MPESA_SHORTCODE
  if (!sc) throw new Error('MPESA_SHORTCODE must be set')
  return sc
}

function passkey() {
  const pk = process.env.MPESA_PASSKEY
  if (!pk) throw new Error('MPESA_PASSKEY must be set')
  return pk
}

function timestamp() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  return `${y}${m}${d}${h}${min}${s}`
}

let _token: { access_token: string; expires_at: number } | null = null

async function getAccessToken(): Promise<string> {
  if (_token && Date.now() < _token.expires_at) return _token.access_token

  const key = process.env.MPESA_CONSUMER_KEY
  const secret = process.env.MPESA_CONSUMER_SECRET
  if (!key || !secret) throw new Error('MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET must be set')

  const auth = Buffer.from(`${key}:${secret}`).toString('base64')
  const res = await fetch(`${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`MPESA auth failed (${res.status}): ${text}`)
  }
  const data = await res.json()
  _token = { access_token: data.access_token, expires_at: Date.now() + (data.expires_in - 60) * 1000 }
  return data.access_token
}

function apiHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

export interface StkPushResponse {
  MerchantRequestID: string
  CheckoutRequestID: string
  ResponseCode: string
  ResponseDescription: string
  CustomerMessage: string
}

/** STK Push (Lipa Na MPESA Online) */
export async function stkPush(params: {
  amount: number
  phone: string
  accountReference: string
  transactionDesc?: string
  callbackUrl: string
}): Promise<StkPushResponse> {
  const token = await getAccessToken()
  const sc = shortCode()
  const ts = timestamp()
  const password = Buffer.from(`${sc}${passkey()}${ts}`).toString('base64')

  const phone = params.phone.replace(/\s+/g, '').replace(/^0/, '254')

  const body = {
    BusinessShortCode: sc,
    Password: password,
    Timestamp: ts,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.round(params.amount),
    PartyA: phone,
    PartyB: sc,
    PhoneNumber: phone,
    CallBackURL: params.callbackUrl,
    AccountReference: params.accountReference.slice(0, 12),
    TransactionDesc: (params.transactionDesc || 'Payment').slice(0, 13),
  }

  const res = await fetch(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: apiHeaders(token),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`STK push failed (${res.status}): ${text}`)
  }
  return res.json()
}

/** Query STK Push status */
export async function stkQuery(checkoutRequestID: string): Promise<{
  ResultCode: string
  ResultDesc: string
  Amount?: number
  MpesaReceiptNumber?: string
  PhoneNumber?: string
  TransactionDate?: string
}> {
  const token = await getAccessToken()
  const sc = shortCode()
  const ts = timestamp()
  const password = Buffer.from(`${sc}${passkey()}${ts}`).toString('base64')

  const body = {
    BusinessShortCode: sc,
    Password: password,
    Timestamp: ts,
    CheckoutRequestID: checkoutRequestID,
  }

  const res = await fetch(`${baseUrl()}/mpesa/stkpushquery/v1/query`, {
    method: 'POST',
    headers: apiHeaders(token),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`STK query failed (${res.status}): ${text}`)
  }
  return res.json()
}

/** C2B Register URLs — register validation and confirmation URLs for paybill */
export async function c2bRegisterURLs(params: {
  confirmationURL: string
  validationURL: string
  responseType?: 'Completed' | 'Cancelled'
}): Promise<{ ResponseDescription: string; OriginatorCoversationID?: string }> {
  const token = await getAccessToken()

  const body = {
    ShortCode: shortCode(),
    ResponseType: params.responseType || 'Completed',
    ConfirmationURL: params.confirmationURL,
    ValidationURL: params.validationURL,
  }

  const res = await fetch(`${baseUrl()}/mpesa/c2b/v2/registerurl`, {
    method: 'POST',
    headers: apiHeaders(token),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`C2B register failed (${res.status}): ${text}`)
  }
  return res.json()
}

/** B2C Payment — send money to a customer (withdrawal/payout) */
export async function b2cPayment(params: {
  amount: number
  phone: string
  occasion?: string
  remarks?: string
  commandID?: 'BusinessPayment' | 'SalaryPayment' | 'PromotionPayment'
  initiatorName: string
  securityCredential: string
  queueTimeOutURL: string
  resultURL: string
}): Promise<{
  ResponseCode: string
  ResponseDescription: string
  ConversationID?: string
  OriginatorConversationID?: string
}> {
  const token = await getAccessToken()
  const phone = params.phone.replace(/\s+/g, '').replace(/^0/, '254')

  const body = {
    InitiatorName: params.initiatorName,
    SecurityCredential: params.securityCredential,
    CommandID: params.commandID || 'BusinessPayment',
    Amount: Math.round(params.amount),
    PartyA: shortCode(),
    PartyB: phone,
    Remarks: (params.remarks || 'Payment').slice(0, 100),
    QueueTimeOutURL: params.queueTimeOutURL,
    ResultURL: params.resultURL,
    Occasion: (params.occasion || '').slice(0, 100),
  }

  const res = await fetch(`${baseUrl()}/mpesa/b2c/v3/paymentrequest`, {
    method: 'POST',
    headers: apiHeaders(token),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`B2C payment failed (${res.status}): ${text}`)
  }
  return res.json()
}

/** Transaction Status Query */
export async function transactionStatus(params: {
  transactionID: string
  partyA?: string
  identifierType?: '1' | '2' | '4'  // 1=MSISDN, 2=Till, 4=Shortcode
  queueTimeOutURL: string
  resultURL: string
  remarks?: string
  occasion?: string
}): Promise<{
  ResponseCode: string
  ResponseDescription: string
  ConversationID?: string
  OriginatorConversationID?: string
}> {
  const token = await getAccessToken()
  const ts = timestamp()
  const password = Buffer.from(`${shortCode()}${passkey()}${ts}`).toString('base64')

  const body = {
    Initiator: process.env.MPESA_INITIATOR_NAME || 'testapi',
    SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL || password,
    CommandID: 'TransactionStatusQuery',
    TransactionID: params.transactionID,
    PartyA: params.partyA || shortCode(),
    IdentifierType: params.identifierType || '4',
    ResultURL: params.resultURL,
    QueueTimeOutURL: params.queueTimeOutURL,
    Remarks: (params.remarks || 'Status query').slice(0, 100),
    Occasion: (params.occasion || '').slice(0, 100),
  }

  const res = await fetch(`${baseUrl()}/mpesa/transactionstatus/v1/query`, {
    method: 'POST',
    headers: apiHeaders(token),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Transaction status query failed (${res.status}): ${text}`)
  }
  return res.json()
}

/** Account Balance Query */
export async function accountBalance(params: {
  queueTimeOutURL: string
  resultURL: string
  remarks?: string
}): Promise<{
  ResponseCode: string
  ResponseDescription: string
  ConversationID?: string
  OriginatorConversationID?: string
}> {
  const token = await getAccessToken()
  const ts = timestamp()
  const password = Buffer.from(`${shortCode()}${passkey()}${ts}`).toString('base64')

  const body = {
    Initiator: process.env.MPESA_INITIATOR_NAME || 'testapi',
    SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL || password,
    CommandID: 'AccountBalance',
    PartyA: shortCode(),
    IdentifierType: '4',
    ResultURL: params.resultURL,
    QueueTimeOutURL: params.queueTimeOutURL,
    Remarks: (params.remarks || 'Balance query').slice(0, 100),
  }

  const res = await fetch(`${baseUrl()}/mpesa/accountbalance/v1/query`, {
    method: 'POST',
    headers: apiHeaders(token),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Account balance query failed (${res.status}): ${text}`)
  }
  return res.json()
}

/** Utility: format a Kenyan phone number to international format */
export function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, '').replace(/^0/, '254').replace(/^\+/, '')
}
