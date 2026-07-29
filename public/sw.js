const CACHE = 'kikwetu-v1'
const STATIC_ASSETS = [
  '/',
  '/feed',
  '/explore',
  '/site.webmanifest',
  '/favicon.svg',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and external requests
  if (request.method !== 'GET') return
  if (!url.origin.includes(location.host) && !url.origin.includes('supabase')) return

  // API requests: network first with fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    )
    return
  }

  // Images: stale-while-revalidate
  if (request.destination === 'image' || url.pathname.match(/\.(jpg|jpeg|png|gif|webp|avif|svg)$/)) {
    event.respondWith(staleWhileRevalidate(request))
    return
  }

  // Static assets: network first
  event.respondWith(
    fetch(request)
      .then(res => {
        const clone = res.clone()
        caches.open(CACHE).then(cache => cache.put(request, clone))
        return res
      })
      .catch(() => caches.match(request).then(cached => cached || caches.match('/')))
  )
})

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(request)
  const fetchPromise = fetch(request).then(res => {
    cache.put(request, res.clone())
    return res
  }).catch(() => cached)
  return cached || fetchPromise
}
