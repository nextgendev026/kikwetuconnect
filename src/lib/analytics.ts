import { createBrowserClient } from './supabase'

// Lightweight first-party analytics. Events are queued and flushed in batches
// (fire-and-forget) so tracking never blocks the UI or adds request overhead
// per click. See supabase/migrations/..._analytics_events.sql for the schema
// and admin-only read functions.

type EventProperty = string | number | boolean | null | undefined

interface PendingEvent {
  event_name: string
  event_properties: Record<string, EventProperty>
  page_path: string | null
  referrer: string | null
}

const FLUSH_INTERVAL_MS = 3000
const MAX_BATCH_SIZE = 20
const SESSION_KEY = 'kikwetu-analytics-session'

let queue: PendingEvent[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
let client: ReturnType<typeof createBrowserClient> | null = null

function getClient() {
  if (!client && typeof window !== 'undefined') {
    client = createBrowserClient()
  }
  return client
}

function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr'
  try {
    let sid = sessionStorage.getItem(SESSION_KEY)
    if (!sid) {
      sid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
      sessionStorage.setItem(SESSION_KEY, sid)
    }
    return sid
  } catch {
    return `anon-${Math.random().toString(36).slice(2, 10)}`
  }
}

function currentPath(): string | null {
  if (typeof window === 'undefined') return null
  return window.location.pathname + window.location.search
}

function flush() {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  if (queue.length === 0) return
  const batch = queue
  queue = []
  const supabase = getClient()
  if (!supabase) return
  // Fire-and-forget: never await, never surface errors.
  supabase.auth.getUser().then(({ data }) => {
    const rows = batch.map(e => ({
      event_name: e.event_name,
      event_properties: e.event_properties,
      user_id: data.user?.id ?? null,
      session_id: getSessionId(),
      page_path: e.page_path,
      referrer: e.referrer,
    }))
    supabase.from('analytics_events').insert(rows).then(() => {}, () => {})
  }).catch(() => {})
}

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(flush, FLUSH_INTERVAL_MS)
}

/**
 * Record a client-side event. Safe to call anywhere, including before auth
 * resolves — events are queued and flushed shortly after.
 */
export function track(eventName: string, properties: Record<string, EventProperty> = {}) {
  if (typeof window === 'undefined') return
  queue.push({
    event_name: eventName,
    event_properties: properties,
    page_path: currentPath(),
    referrer: document.referrer || null,
  })
  if (queue.length >= MAX_BATCH_SIZE) {
    flush()
  } else {
    scheduleFlush()
  }
}

/** Track a page view (call on route changes from a client component). */
export function trackPageView(path?: string) {
  track('page_view', { path: path ?? currentPath() ?? '' })
}

// Flush anything queued when the tab closes so short sessions aren't lost.
if (typeof window !== 'undefined') {
  const onUnload = () => {
    try {
      flush()
    } catch { /* ignore */ }
  }
  window.addEventListener('pagehide', onUnload)
}
