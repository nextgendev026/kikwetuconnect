const stores = new Map<string, Map<string, { count: number; resetAt: number }>>()

export function checkRateLimit(
  scope: string,
  key: string,
  maxRequests: number = 30,
  windowMs: number = 60_000
): boolean {
  const now = Date.now()
  let store = stores.get(scope)
  if (!store) {
    store = new Map()
    stores.set(scope, store)
  }
  const entry = store.get(key)
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= maxRequests) return false
  entry.count++
  return true
}

export function getRateLimitHeaders(
  scope: string,
  key: string,
  maxRequests: number = 30,
  windowMs: number = 60_000
): Record<string, string> {
  const store = stores.get(scope)
  const entry = store?.get(key)
  if (!entry) return {}
  const remaining = Math.max(0, maxRequests - entry.count)
  const resetAt = Math.ceil(entry.resetAt / 1000)
  return {
    'X-RateLimit-Limit': String(maxRequests),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(resetAt),
  }
}
