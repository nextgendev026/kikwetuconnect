/**
 * Shared JWT helpers for single-active-session enforcement.
 * Works on the client and the server (no Node-only APIs).
 */

export function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1]
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const json =
      typeof window === 'undefined'
        ? Buffer.from(padded, 'base64').toString('utf8')
        : atob(padded)
    return JSON.parse(json)
  } catch {
    return null
  }
}

/** Extracts the `session_id` claim from a Supabase access token. */
export function getJwtSessionId(token: string | null | undefined): string | null {
  if (!token) return null
  const payload = decodeJwtPayload(token)
  return payload?.session_id ?? null
}
