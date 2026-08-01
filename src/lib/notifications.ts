import { createServerClient } from '@supabase/ssr'
import { dispatchPushForNotification } from '@/lib/push-notifications'
import { NextRequest, NextResponse } from 'next/server'

interface NotifyOptions {
  recipients: string[]
  actorId?: string | null
  type: string
  targetId?: string | null
  targetType?: string | null
  content?: string
  meta?: Record<string, any>
}

export async function sendNotification(request: NextRequest, options: NotifyOptions) {
  const { recipients, actorId, type, targetId, targetType, content, meta } = options
  if (!recipients.length) return

  const response = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '',
    {
      cookies: {
        getAll: () => request.cookies.getAll().map(c => ({ name: c.name, value: c.value })),
        setAll: (cookiesToSet: any[]) => cookiesToSet.forEach(({ name, value, options: opts }: any) => response.cookies.set(name, value, opts)),
      },
    }
  )

  const now = new Date().toISOString()
  const rows = recipients.map(userId => ({
    user_id: userId,
    actor_id: actorId || null,
    type,
    target_id: targetId || null,
    target_type: targetType || null,
    content: content || '',
    meta: meta || {},
    created_at: now,
  }))

  const { data: inserted, error } = await supabase.from('notifications').insert(rows).select()
  if (error) console.error('sendNotification error:', error)
  if (inserted?.length) {
    for (const row of inserted) await dispatchPushForNotification(row)
  }
}
