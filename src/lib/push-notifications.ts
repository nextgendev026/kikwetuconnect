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

const PUSH_TITLES: Record<string, string> = {
  upvote: 'New upvote',
  downvote: 'New reaction',
  new_answer: 'New answer',
  answer: 'New answer',
  reply: 'New reply',
  mention: 'You were mentioned',
  follow: 'New follower',
  session_request: 'Session request',
  session_assigned: 'Session assigned',
  session_accept: 'Session accepted',
  session_complete: 'Session completed',
  session_ended: 'Session completed',
  tip: 'New tip',
  payout: 'Payout received',
  badge: 'New badge',
  alert: 'Alert',
  system: 'KikwetuConnect',
}

function notificationUrl(row: { meta?: Record<string, any> | null; target_type?: string | null; target_id?: string | null }) {
  if (row.meta?.link) return row.meta.link
  if (row.target_type === 'post' && row.target_id) return `/posts/${row.target_id}`
  if (row.target_type === 'answer' && row.target_id) return `/answers/${row.target_id}`
  if (row.target_type === 'session') return '/sessions'
  if (row.target_type === 'message') return '/messages'
  return '/notifications'
}

export async function dispatchPushForNotification(row: {
  user_id?: string | null
  actor_id?: string | null
  type?: string | null
  content?: string | null
  meta?: Record<string, any> | null
  target_type?: string | null
  target_id?: string | null
}) {
  try {
    if (!row?.user_id) return
    if (row.actor_id && row.actor_id === row.user_id) return
    const title = PUSH_TITLES[row.type || ''] || 'KikwetuConnect'
    const body = (row.content || '').slice(0, 140) || 'You have a new notification'
    await sendPushToUser(row.user_id, {
      title,
      body,
      data: { url: notificationUrl(row) },
      tag: row.type || 'notification',
    })
  } catch (err) {
    console.error('dispatchPushForNotification error:', err)
  }
}
