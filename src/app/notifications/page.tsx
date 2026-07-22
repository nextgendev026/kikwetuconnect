'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Bell,
  TrendingUp,
  Coins,
  AtSign,
  MessageSquare,
  CheckCircle,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/form'
import { useUser, useSupabase } from '@/providers/supabase-provider'

interface Profile {
  id: string
  full_name: string
  username: string
}

interface Notification {
  id: string
  type: 'upvote' | 'answer' | 'mention' | 'token' | 'follow' | 'expert'
  actor_id: string | null
  content: string
  target_id: string | null
  target_type: string | null
  is_read: boolean
  created_at: string
  profiles?: Profile | null
}

export default function NotificationsPage() {
  const { profile, loading: userLoading } = useUser()
  const supabase = useSupabase()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (profile) {
      fetchNotifications()
      subscribeToNotifications()
    }
  }, [profile])

  const fetchNotifications = async () => {
    if (!profile) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          profiles:actor_id (
            id,
            full_name,
            username
          )
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      setNotifications((data || []) as Notification[])
      const unread = (data || []).filter((n: Notification) => !n.is_read).length
      setUnreadCount(unread)
    } catch (err) {
      console.error('Error fetching notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  const subscribeToNotifications = () => {
    if (!profile) return

    const channel = supabase
      .channel(`notifications:${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev])
          setUnreadCount((prev) => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      })

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      })

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'upvote':
        return <TrendingUp className="w-5 h-5 text-green" />
      case 'answer':
        return <MessageSquare className="w-5 h-5 text-blue" />
      case 'mention':
        return <AtSign className="w-5 h-5 text-gold" />
      case 'token':
        return <Coins className="w-5 h-5 text-gold" />
      case 'follow':
        return <Users className="w-5 h-5 text-green" />
      case 'expert':
        return <CheckCircle className="w-5 h-5 text-green" />
      default:
        return <Bell className="w-5 h-5 text-muted" />
    }
  }

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'upvote':
        return 'Upvote'
      case 'answer':
        return 'Answer'
      case 'mention':
        return 'Mention'
      case 'token':
        return 'Token'
      case 'follow':
        return 'Follow'
      case 'expert':
        return 'Verification'
      default:
        return 'Notification'
    }
  }

  const formatTimeAgo = (date: string) => {
    const now = new Date()
    const then = new Date(date)
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return then.toLocaleDateString('en-KE')
  }

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-green border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <>
      <section className="page-head flex items-center justify-between">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="text-muted text-sm">
            {unreadCount} new {unreadCount === 1 ? 'update' : 'updates'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleMarkAllAsRead}
          >
            Mark all as read
          </Button>
        )}
      </section>

      {notifications.length === 0 ? (
        <div className="card section text-center py-12">
          <Bell className="w-12 h-12 text-quiet mx-auto mb-4 opacity-50" />
          <p className="text-muted mb-2">No notifications yet</p>
          <p className="text-xs text-quiet">
            When people interact with your posts, you'll see them here
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => {
                if (!notification.is_read) {
                  handleMarkAsRead(notification.id)
                }
              }}
              className={`card section cursor-pointer transition-all ${
                !notification.is_read
                  ? 'bg-surface-2 border-green/50'
                  : 'hover:bg-surface-2'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {getNotificationIcon(notification.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm">
                        {notification.profiles?.full_name && (
                          <Link
                            href={`/profile/${notification.profiles.username}`}
                            className="font-bold hover:underline"
                          >
                            {notification.profiles.full_name}
                          </Link>
                        )}
                        {notification.profiles?.full_name && ' '}
                        <span className="text-text">{notification.content}</span>
                      </p>
                      <p className="text-xs text-quiet mt-1">
                        {formatTimeAgo(notification.created_at)}
                      </p>
                    </div>

                    {!notification.is_read && (
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-green mt-1.5" />
                    )}
                  </div>

                  {notification.target_id && (
                    <Link
                      href={`/posts/${notification.target_id}`}
                      className="inline-block mt-2 text-xs px-2 py-1 rounded bg-surface hover:bg-surface-2 transition-colors text-muted hover:text-text"
                    >
                      View →
                    </Link>
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
