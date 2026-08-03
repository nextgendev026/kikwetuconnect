'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSupabase, useUser, toast } from '@/app/providers'
import {
  Bell, ThumbsUp, MessageSquare, AtSign, Users, Star, Coins, Wallet,
  CalendarCheck, CheckCircle, AlertTriangle, Settings, Reply, Award
} from 'lucide-react'

type TabType = 'all' | 'replies' | 'sessions' | 'wallet'

const replyTypes = ['reply', 'answer', 'mention']
const sessionTypes = ['session_request', 'session_assigned', 'session_accept', 'session_ended', 'session_complete']
const walletTypes = ['tip', 'payout']

interface Actor {
  id: string
  full_name: string
  username: string
}

interface Notification {
  id: string
  type: string
  actor_id: string | null
  content: string
  target_id: string | null
  target_type: string | null
  is_read: boolean
  created_at: string
  profiles: Actor | null
}

export default function NotificationsPage() {
  const { user, profile, loading: userLoading } = useUser()
  const supabase = useSupabase()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [activeTab, setActiveTab] = useState<TabType>('all')

  useEffect(() => {
    if (profile) {
      fetchNotifications()
      subscribe()
    }
    return () => {
      supabase.removeAllChannels()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  const fetchNotifications = async () => {
    if (!profile) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*, profiles:actor_id(id, full_name, username)')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50)

      setNotifications((data as Notification[]) || [])
      setUnreadCount((data || []).filter((n: Notification) => !n.is_read).length)
    } catch (err) {
      console.error('Error fetching notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  const subscribe = () => {
    if (!profile) return
    const channel = supabase
      .channel(`notifications:${profile.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${profile.id}`,
      }, (payload: any) => {
        setNotifications(prev => [payload.new as Notification, ...prev])
        setUnreadCount(prev => prev + 1)
      })
      .subscribe()
  }

  const markAsRead = async (id: string) => {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Error marking as read:', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      if (!profile) return
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false)
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
      toast('All notifications marked as read')
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }

  const getTargetHref = (n: Notification): string | null => {
    if ((n as any).meta?.link) return (n as any).meta.link
    if (n.target_id) {
      if (n.target_type === 'post' || n.type === 'answer' || n.type === 'new_answer' || n.type === 'reply' || n.type === 'upvote') {
        return `/posts/${n.target_id}`
      }
      if (n.target_type === 'profile' || n.type === 'follow') {
        return `/profile/${n.profiles?.username || n.actor_id}`
      }
      if (n.type.startsWith('session')) {
        return '/sessions'
      }
    }
    if (n.profiles?.username) return `/profile/${n.profiles.username}`
    return null
  }

  const handleClick = (n: Notification) => {
    if (!n.is_read) markAsRead(n.id)
    const href = getTargetHref(n)
    if (href) window.location.href = href
  }

  const notificationIcon = (type: string) => {
    switch (type) {
      case 'upvote': return <ThumbsUp className="w-4 h-4 text-green" />
      case 'downvote': return <ThumbsUp className="w-4 h-4 text-red rotate-180" />
      case 'answer':
      case 'new_answer': return <MessageSquare className="w-4 h-4 text-blue" />
      case 'reply': return <Reply className="w-4 h-4 text-blue" />
      case 'mention': return <AtSign className="w-4 h-4 text-gold" />
      case 'follow': return <Users className="w-4 h-4 text-green" />
      case 'session_request': return <CalendarCheck className="w-4 h-4 text-gold" />
      case 'session_assigned':
      case 'session_accept': return <CheckCircle className="w-4 h-4 text-green" />
      case 'session_ended':
      case 'session_complete': return <Star className="w-4 h-4 text-gold" />
      case 'tip': return <Coins className="w-4 h-4 text-gold" />
      case 'payout': return <Wallet className="w-4 h-4 text-green" />
      case 'badge': return <Award className="w-4 h-4 text-gold" />
      case 'alert': return <AlertTriangle className="w-4 h-4 text-red" />
      case 'system': return <Settings className="w-4 h-4 text-muted" />
      default: return <Bell className="w-4 h-4 text-muted" />
    }
  }

  const formatTimeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return new Date(date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })
  }

  const filterByTab = (items: Notification[]): Notification[] => {
    switch (activeTab) {
      case 'replies': return items.filter(n => replyTypes.includes(n.type))
      case 'sessions': return items.filter(n => sessionTypes.includes(n.type))
      case 'wallet': return items.filter(n => walletTypes.includes(n.type))
      default: return items
    }
  }

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-green border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-muted mb-4">Sign in to see notifications</p>
        <Link href="/login" className="btn btn-primary">Sign in</Link>
      </div>
    )
  }

  const filtered = filterByTab(notifications)

  return (
    <>
      <section className="page-head flex items-center justify-between">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="text-muted text-sm">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className="btn btn-secondary btn-sm">
            Mark all read
          </button>
        )}
      </section>

      {/* Tabs */}
      <div className="card section mb-6">
        <div className="flex gap-1">
          {([
            { id: 'all' as TabType, label: 'All', icon: Bell },
            { id: 'replies' as TabType, label: 'Replies', icon: MessageSquare },
            { id: 'sessions' as TabType, label: 'Sessions', icon: CalendarCheck },
            { id: 'wallet' as TabType, label: 'Wallet', icon: Wallet },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-green text-night' : 'text-muted hover:text-cream'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-green border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card section text-center py-12">
          <Bell className="w-12 h-12 text-muted mx-auto mb-4 opacity-30" />
          <p className="text-muted mb-1">No notifications</p>
          <p className="text-xs text-muted">
            {activeTab === 'all' ? 'When people interact with your posts, you\'ll see them here' :
             activeTab === 'replies' ? 'Reply and mention notifications will appear here' :
             activeTab === 'sessions' ? 'Session-related notifications will appear here' :
             'Tip and payout notifications will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(n => (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              className={`card section cursor-pointer transition-all ${
                !n.is_read
                  ? 'border-green/30 bg-green/[0.02]'
                  : 'hover:bg-night2'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-night2 border border-[var(--line)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  {notificationIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm">
                        {n.profiles?.full_name ? (
                          <span
                            className="font-bold hover:underline cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              window.location.href = `/profile/${n.profiles!.username}`
                            }}
                          >
                            {n.profiles.full_name}
                          </span>
                        ) : null}
                        {n.profiles?.full_name ? ' ' : ''}
                        <span className="text-muted">{n.content}</span>
                      </p>
                      <p className="text-xs text-muted mt-1">{formatTimeAgo(n.created_at)}</p>
                    </div>
                    {!n.is_read && (
                      <div className="w-2 h-2 rounded-full bg-green flex-shrink-0 mt-2" />
                    )}
                  </div>
                  {n.target_id && (
                    <span className="inline-block mt-2 text-xs px-2 py-1 rounded bg-night2 text-muted hover:text-cream transition-colors">
                      View &rarr;
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
