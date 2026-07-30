import webPush from 'web-push'

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails(
    'mailto:support@kikwetuconnect.com',
    vapidPublicKey,
    vapidPrivateKey,
  )
}

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  data?: Record<string, unknown>
  tag?: string
  actions?: { action: string; title: string }[]
}

export async function sendPushNotification(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: PushPayload,
) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('VAPID keys not configured, skipping push')
    return { success: false, error: 'VAPID not configured' }
  }

  try {
    await webPush.sendNotification(
      subscription,
      JSON.stringify(payload),
      { TTL: 86400 },
    )
    return { success: true }
  } catch (err: any) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      return { success: false, expired: true, error: err.message }
    }
    console.error('Push send error:', err)
    return { success: false, error: err.message }
  }
}

export async function sendPushToUser(
  supabase: any,
  userId: string,
  payload: PushPayload,
) {
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh_key, auth_key')
    .eq('user_id', userId)

  if (!subs?.length) return { sent: 0, failed: 0 }

  let sent = 0
  let failed = 0
  const expiredEndpoints: string[] = []

  for (const sub of subs) {
    const result = await sendPushNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh_key, auth: sub.auth_key } },
      payload,
    )
    if (result.success) sent++
    else {
      failed++
      if (result.expired) expiredEndpoints.push(sub.endpoint)
    }
  }

  // Clean up expired subscriptions
  if (expiredEndpoints.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('endpoint', expiredEndpoints)
  }

  return { sent, failed }
}
