const CACHE_PREFIX = 'kc_'
const DEFAULTS = { profiles: 120_000, topics: 300_000, feed: 30_000 }
type CacheKey = keyof typeof DEFAULTS

interface CacheEntry<T> {
  data: T
  expiry: number
}

export function getCached<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const entry: CacheEntry<T> = JSON.parse(raw)
    if (Date.now() < entry.expiry) return entry.data
    localStorage.removeItem(CACHE_PREFIX + key)
  } catch { /* ignore */ }
  return null
}

export function setCache<T>(key: string, data: T, ttl?: number) {
  try {
    const entry: CacheEntry<T> = { data, expiry: Date.now() + (ttl || 60_000) }
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry))
  } catch { /* ignore */ }
}

export function clearCache(pattern?: string) {
  try {
    const prefix = CACHE_PREFIX + (pattern || '')
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (k?.startsWith(prefix)) localStorage.removeItem(k)
    }
  } catch { /* ignore */ }
}

export function cacheable<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
  const cached = getCached<T>(key)
  if (cached !== null) return Promise.resolve(cached)
  return fetcher().then(data => {
    setCache(key, data, ttl)
    return data
  })
}
