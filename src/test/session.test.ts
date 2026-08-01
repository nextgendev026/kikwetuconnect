import { describe, it, expect } from 'vitest'
import { decodeJwtPayload, getJwtSessionId } from '@/lib/session'

function b64url(input: string): string {
  const utf8 = new TextEncoder().encode(input)
  let bin = ''
  utf8.forEach(b => { bin += String.fromCharCode(b) })
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function makeToken(payload: Record<string, any>): string {
  const header = b64url(JSON.stringify({ alg: 'none', typ: 'JWT' }))
  const body = b64url(JSON.stringify(payload))
  return `${header}.${body}.sig`
}

describe('session JWT helpers', () => {
  it('decodes a payload and extracts the session_id claim', () => {
    const token = makeToken({
      sub: '00000000-0000-0000-0000-000000000001',
      session_id: '11111111-2222-3333-4444-555555555555',
      role: 'authenticated',
    })
    expect(getJwtSessionId(token)).toBe('11111111-2222-3333-4444-555555555555')
    expect(decodeJwtPayload(token)?.sub).toBe('00000000-0000-0000-0000-000000000001')
  })

  it('returns null for tokens without a session_id claim', () => {
    const token = makeToken({ sub: 'u1' })
    expect(getJwtSessionId(token)).toBeNull()
  })

  it('returns null for malformed tokens', () => {
    expect(getJwtSessionId('')).toBeNull()
    expect(getJwtSessionId('not.a.jwt')).toBeNull()
    expect(getJwtSessionId('a.b.c.d')).toBeNull()
    expect(getJwtSessionId(null)).toBeNull()
  })
})
