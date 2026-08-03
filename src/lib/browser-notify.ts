'use client'

/**
 * Shows a native OS notification while the tab is running in the background.
 * In-app toasts/sounds already cover the foreground, so we only notify when
 * the page is hidden or unfocused. Requires the service worker + Notification
 * permission (set up by PwaSetup / usePushNotifications).
 */
export async function showNativeNotification(opts: {
  title: string
  body?: string
  url?: string
  tag?: string
}) {
  if (typeof window === 'undefined') return
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return
  if (Notification.permission !== 'granted') return
  try {
    if (document.visibilityState === 'visible' && document.hasFocus()) return
    const reg = await navigator.serviceWorker.ready
    await reg.showNotification(opts.title, {
      body: opts.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: opts.tag,
      data: { url: opts.url || '/' },
      vibrate: [200, 100, 200],
    } as unknown as NotificationOptions)
  } catch { /* notifications are non-critical */ }
}

/** Small module-level cache so we don't re-fetch sender names for each message. */
const senderNameCache = new Map<string, string>()

export async function getSenderName(supabase: any, senderId: string): Promise<string> {
  const cached = senderNameCache.get(senderId)
  if (cached) return cached
  try {
    const { data } = await supabase.from('profiles').select('full_name, username').eq('id', senderId).maybeSingle()
    const name = data?.full_name || data?.username || 'Someone'
    senderNameCache.set(senderId, name)
    return name
  } catch {
    return 'Someone'
  }
}
