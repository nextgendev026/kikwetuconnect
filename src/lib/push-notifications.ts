import { createClient } from '@supabase/supabase-js'

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY?.trim()
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
const vapidEmail = process.env.VAPID_EMAIL || 'noreply@kikwetuconnect.com'

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: Record<string, any>
  url?: string
  actions?: { action: string; title: string }[]
  requireInteraction?: boolean
}

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey || supabaseUrl)
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!vapidPrivateKey || !vapidPublicKey || !supabaseServiceKey) {
    console.warn('VAPID keys or service role key not configured, skipping push notification')
    return false
  }

  const supabase = getSupabase()
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)

  if (error || !subscriptions?.length) return false

  let sentCount = 0
  const webpush = await import('web-push')
  webpush.default.setVapidDetails(`mailto:${vapidEmail}`, vapidPublicKey, vapidPrivateKey)

  for (const sub of subscriptions) {
    try {
      await webpush.default.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh_key, auth: sub.auth_key } },
        JSON.stringify({
          ...payload,
          icon: payload.icon || '/icons/icon-192x192.png',
          badge: payload.badge || '/icons/icon-72x72.png',
        }),
      )
      sentCount++
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      }
    }
  }

  return sentCount > 0
}

export async function sendPushToMultipleUsers(userIds: string[], payload: PushPayload) {
  const results = await Promise.allSettled(userIds.map(id => sendPushToUser(id, payload)))
  return results.filter(r => r.status === 'fulfilled' && r.value).length
}
