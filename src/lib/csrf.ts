import crypto from 'crypto'

const CSRF_SECRET = process.env.CSRF_SECRET || process.env.NEXTAUTH_SECRET || 'kikwetu-csrf-fallback'
const TOKEN_EXPIRY = 3600_000

export function generateCsrfToken(sessionId: string): string {
  const payload = `${sessionId}:${Date.now()}`
  const signature = crypto.createHmac('sha256', CSRF_SECRET).update(payload).digest('hex')
  return Buffer.from(`${payload}:${signature}`).toString('base64url')
}

export function validateCsrfToken(token: string, sessionId: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString()
    const parts = decoded.split(':')
    if (parts.length !== 3) return false
    const [ts, , sig] = parts
    const payload = `${sessionId}:${ts}`
    const expected = crypto.createHmac('sha256', CSRF_SECRET).update(payload).digest('hex')
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false
    const age = Date.now() - Number(ts)
    return age >= 0 && age < TOKEN_EXPIRY
  } catch {
    return false
  }
}

export function getCsrfTokenFromRequest(request: Request): string | null {
  return request.headers.get('x-csrf-token')
}
