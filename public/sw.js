const CACHE = 'kikwetu-v1'
const DYNAMIC_CACHE = 'kikwetu-dynamic-v1'
const STATIC_ASSETS = [
  '/',
  '/feed',
  '/explore',
  '/messages',
  '/notifications',
  '/profile',
  '/site.webmanifest',
  '/favicon.svg',
]

// Install: precache static shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('Static precache partial failure:', err)
      })
    )
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE && k !== DYNAMIC_CACHE).map(k => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// Push event: show notification
self.addEventListener('push', event => {
  if (!event.data) return
  try {
    const data = event.data.json()
    const { title = 'KikwetuConnect', body = '', icon = '/icons/icon-192x192.png', badge = '/icons/icon-72x72.png', tag, data: extraData, actions, requireInteraction, silent, ...rest } = data

    const options = {
      body,
      icon,
      badge,
      tag,
      data: extraData || {},
      actions,
      requireInteraction,
      silent,
      vibrate: [200, 100, 200],
      ...rest,
    }

    event.waitUntil(
      self.registration.showNotification(title, options)
    )
  } catch {
    // If not JSON, show raw text
    event.waitUntil(
      self.registration.showNotification('KikwetuConnect', {
        body: event.data.text(),
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
      })
    )
  }
})

// Notification click: open app and navigate
self.addEventListener('notificationclick', event => {
  event.notification.close()

  const data = event.notification.data || {}
  const url = data.url || '/'

  // If action button clicked
  if (event.action && data.actions?.[event.action]) {
    const actionUrl = data.actions[event.action]
    event.waitUntil(
      clients.openWindow(actionUrl)
    )
    return
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NAVIGATE', url })
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})

// Fetch: network-first with cache fallback
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET
  if (request.method !== 'GET') return

  // Skip non-HTTP(S)
  if (!url.protocol.startsWith('http')) return

  const isSameOrigin = url.origin === self.location.origin
  const isSupabase = url.origin.includes('.supabase.co')

  // Only cache same-origin and supabase requests
  if (!isSameOrigin && !isSupabase) return

  // API: network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request))
    return
  }

  // Images/Supabase storage: stale-while-revalidate
  if (request.destination === 'image' || url.pathname.match(/\.(jpg|jpeg|png|gif|webp|avif|svg|ico)$/)) {
    event.respondWith(staleWhileRevalidate(request))
    return
  }

  // Navigation: network first, cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
    return
  }

  // Everything else: network first
  event.respondWith(networkFirst(request))
})

async function networkFirst(request) {
  try {
    const res = await fetch(request)
    if (res.ok) {
      const clone = res.clone()
      caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, clone))
    }
    return res
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    // Fallback to root for navigations
    if (request.mode === 'navigate') return caches.match('/')
    return new Response('Offline', { status: 503 })
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE)
  const cached = await cache.match(request)
  const fetchPromise = fetch(request).then(res => {
    if (res.ok) cache.put(request, res.clone())
    return res
  }).catch(() => cached)
  return cached || (await fetchPromise)
}

// Message handler for client communication
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.delete(DYNAMIC_CACHE)
  }
})
