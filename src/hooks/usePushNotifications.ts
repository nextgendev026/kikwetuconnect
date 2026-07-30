'use client'
import { useState, useCallback, useEffect } from 'react'
import { useSupabase, useUser, toast } from '@/app/providers'

export function usePushNotifications() {
  const [permitted, setPermitted] = useState<NotificationPermission | null>(null)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = useSupabase()
  const { user } = useUser()

  const urlBase64ToUint8Array = (base64: string) => {
    const padding = '='.repeat((4 - base64.length % 4) % 4)
    const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
    const raw = atob(b64)
    const arr = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
    return arr
  }

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      toast('Notifications not supported')
      return
    }
    const result = await Notification.requestPermission()
    setPermitted(result)
    return result
  }, [])

  const subscribe = useCallback(async () => {
    if (permitted !== 'granted') {
      const result = await requestPermission()
      if (result !== 'granted') { toast('Notification permission required'); return }
    }
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      if (existing) {
        await existing.unsubscribe()
      }

      // Get VAPID public key from server
      const keyRes = await fetch('/api/push/vapid-public-key')
      if (!keyRes.ok) throw new Error('Failed to get VAPID key')
      const { publicKey } = await keyRes.json()

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      // Send subscription to server
      const subJson = sub.toJSON()
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          p256dhKey: subJson.keys!.p256dh,
          authKey: subJson.keys!.auth,
          deviceType: /Android/i.test(navigator.userAgent) ? 'android' :
                      /iPhone|iPad/i.test(navigator.userAgent) ? 'ios' : 'web',
          userAgent: navigator.userAgent,
        }),
      })
      if (!res.ok) throw new Error('Failed to save subscription')
      setSubscribed(true)
      toast('Notifications enabled!')
    } catch (err: any) {
      toast(err.message || 'Failed to subscribe')
    } finally {
      setLoading(false)
    }
  }, [permitted, requestPermission])

  const unsubscribe = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) await sub.unsubscribe()
      await fetch('/api/push/subscribe', { method: 'DELETE' })
      setSubscribed(false)
    } catch {}
  }, [])

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return
    setPermitted(Notification.permission)
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(s => setSubscribed(!!s))
    ).catch(() => {})
  }, [])

  return { permitted, subscribed, loading, requestPermission, subscribe, unsubscribe }
}
