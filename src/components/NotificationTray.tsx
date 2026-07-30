'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase, useUser, toast } from '@/app/providers'

interface Notification {
  id: string
  user_id: string
  actor_id: string | null
  type: string
  target_id: string | null
  target_type: string | null
  content: string | null
  title: string | null
  body: string | null
  data: any
  is_read: boolean
  created_at: string
  actor?: { username: string; full_name: string; avatar_url: string | null }
}

const ICONS: Record<string, string> = {
  upvote: '\uD83D\uDC4D', new_answer: '\uD83D\uDCDD', follow: '\uD83D\uDC65',
  session_assigned: '\uD83D\uDCC5', session_ended: '\u2714\uFE0F',
  heshima_earning: '\u2B50', badge_awarded: '\uD83C\uDFC6',
  message: '\uD83D\uDCAC', reply: '\uD83D\uDCE9', mention: '@',
  tip: '\uD83E\uDE99', payout: '\uD83D\uDCB0', system: '\u2699\uFE0F',
  alert: '\u26A0\uFE0F',
}

const LINKS: Record<string, string> = {
  upvote: '/posts/', new_answer: '/posts/', follow: '/profile/',
  session_assigned: '/sessions', session_ended: '/sessions',
}

export default function NotificationTray({ onClose }: { onClose: () => void }) {
  const { user, profile } = useUser()
  const supabase = useSupabase()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  useEffect(() => {
    if (!user) return
    supabase.from('notifications').select('*, actor:profiles!notifications_actor_id_fkey(username, full_name, avatar_url)')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => { if (data) setNotifications(data as Notification[]); setLoading(false) })
    const channel = supabase.channel('notif-tray')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (p: any) => {
        setNotifications(prev => [p.new as Notification, ...prev.slice(0, 19)])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, supabase])

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const markAllRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user?.id).eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    toast('All marked as read')
  }

  const handleClick = async (n: Notification) => {
    if (!n.is_read) await markRead(n.id)
    if (n.data?.link) router.push(n.data.link)
    else if (n.target_id && LINKS[n.type]) router.push(LINKS[n.type] + (n.type === 'follow' ? n.actor?.username || n.actor_id : n.target_id))
    else if (n.type === 'message') router.push(`/messages?conversation_id=${n.target_id}`)
    onClose()
  }

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime()
    if (diff < 60000) return 'now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`
    return new Date(d).toLocaleDateString([], { day: 'numeric', month: 'short' })
  }

  const unread = notifications.filter(n => !n.is_read).length

  return (
    <div ref={ref} className="absolute top-full right-0 mt-2 w-[380px] max-w-[95vw] rounded-2xl shadow-lg z-50 overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--line)' }}>
        <div>
          <strong className="text-sm" style={{ color: 'var(--ink)' }}>Notifications</strong>
          {unread > 0 && <span className="ml-2 text-[10px] font-bold" style={{ color: 'var(--green)' }}>{unread} new</span>}
        </div>
        <div className="flex gap-2">
          {unread > 0 && <button onClick={markAllRead} className="text-[10px] font-bold border-0 cursor-pointer" style={{ color: 'var(--gold)' }}>Mark all read</button>}
          <button onClick={() => { router.push('/notifications'); onClose() }} className="text-[10px] font-bold border-0 cursor-pointer" style={{ color: 'var(--gold)' }}>View all</button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-[480px] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-[20px] h-[20px] rounded-full animate-spin" style={{ border: '2px solid var(--gold)', borderTopColor: 'transparent' }} /></div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-2xl mb-2">{'\uD83D\uDCED'}</div>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>No notifications yet</p>
          </div>
        ) : notifications.map(n => (
          <button key={n.id} onClick={() => handleClick(n)}
            className="w-full text-left flex gap-3 px-4 py-3 border-0 cursor-pointer transition-colors hover:opacity-90"
            style={{ background: n.is_read ? 'none' : 'var(--raised)', borderBottom: '1px solid var(--line)' }}>
            <div className="w-[36px] h-[36px] rounded-full flex-shrink-0 grid place-items-center text-base overflow-hidden" style={{ background: n.actor?.avatar_url ? 'none' : 'var(--night)' }}>
              {n.actor?.avatar_url ? <img src={n.actor.avatar_url} alt="" className="w-full h-full object-cover" /> : <span>{ICONS[n.type] || '\uD83D\uDD14'}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs leading-relaxed" style={{ color: 'var(--ink)' }}>
                {n.actor && <b>{n.actor.full_name || n.actor.username}</b>}{' '}
                {n.content || n.title || n.body || 'New notification'}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px]" style={{ color: 'var(--muted)' }}>{timeAgo(n.created_at)}</span>
                {!n.is_read && <span className="w-[6px] h-[6px] rounded-full" style={{ background: 'var(--gold)' }} />}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
