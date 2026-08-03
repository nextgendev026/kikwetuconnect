const CACHE = 'kikwetu-v3'
const DYNAMIC_CACHE = 'kikwetu-dynamic-v3'
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

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(STATIC_ASSETS).catch(() => {})
    )
  )
  self.skipWaiting()
})

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

self.addEventListener('push', event => {
  if (!event.data) return

  // If the app is open and focused, the realtime client already shows in-app
  // toasts/sounds — skip so we don't duplicate with the native notification.
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const anyFocused = clients.some(c => c.focused)
      if (anyFocused) return
      try {
        const data = event.data.json()
        const { title = 'KikwetuConnect', body = '', icon = '/icons/icon-192x192.png', badge = '/icons/icon-72x72.png', tag, data: extraData, actions, requireInteraction, silent, ...rest } = data
        return self.registration.showNotification(title, {
          body, icon, badge, tag,
          data: extraData || {},
          actions,
          requireInteraction,
          silent,
          vibrate: [200, 100, 200],
          ...rest,
        })
      } catch {
        return self.registration.showNotification('KikwetuConnect', {
          body: event.data.text(),
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
        })
      }
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const data = event.notification.data || {}
  const url = data.url || '/'

  if (event.action && data.actions?.[event.action]) {
    event.waitUntil(clients.openWindow(data.actions[event.action]))
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

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET') return
  if (!url.protocol.startsWith('http')) return

  const isSameOrigin = url.origin === self.location.origin
  const isSupabase = url.origin.includes('.supabase.co')

  if (!isSameOrigin && !isSupabase) return

  if (request.destination === 'document' && !url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithRefresh(request))
    return
  }

  if (request.destination === 'style' || request.destination === 'script' || request.destination === 'font') {
    event.respondWith(staleWhileRevalidate(request))
    return
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithTimeout(request, 5000))
    return
  }

  if (request.destination === 'image' || url.pathname.match(/\.(jpg|jpeg|png|gif|webp|avif|svg|ico)$/)) {
    event.respondWith(staleWhileRevalidate(request))
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithRefresh(request))
    return
  }

  event.respondWith(networkFirstWithTimeout(request, 5000))
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const res = await fetch(request)
    if (res.ok) {
      const clone = res.clone()
      caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, clone))
    }
    return res
  } catch {
    return new Response('', { status: 200 })
  }
}

async function networkFirstWithRefresh(request) {
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
    return caches.match('/')
  }
}

async function networkFirstWithTimeout(request, timeout) {
  const timeoutPromise = new Promise(resolve => setTimeout(resolve, timeout))
  try {
    const res = await Promise.race([
      fetch(request),
      timeoutPromise.then(() => { throw new Error('timeout') }),
    ])
    if (res && res.ok) {
      const clone = res.clone()
      caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, clone))
    }
    return res
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    if (request.mode === 'navigate') return caches.match('/')
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
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

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.delete(DYNAMIC_CACHE)
  }
})
