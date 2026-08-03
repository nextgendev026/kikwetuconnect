'use client'
import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { useUser } from './auth-provider'
import { createBrowserClient } from '@/lib/supabase'
import { toast } from './toast-provider'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  data: Record<string, unknown>
  is_read: boolean
  created_at: string
}

interface NotificationContextValue {
  notifications: Notification[]
  unreadCount: number
  fetchNotifications: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  subscribe: () => void
  unsubscribe: () => void
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  fetchNotifications: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  subscribe: () => {},
  unsubscribe: () => {},
})

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useUser()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const notifChannelRef = useRef<ReturnType<ReturnType<typeof createBrowserClient>['channel']> | null>(null)
  const heshimaChannelRef = useRef<ReturnType<ReturnType<typeof createBrowserClient>['channel']> | null>(null)
  const profileChannelRef = useRef<ReturnType<ReturnType<typeof createBrowserClient>['channel']> | null>(null)
  const supabase = createBrowserClient()

  const fetchNotifications = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) {
      setNotifications(data as Notification[])
      setUnreadCount(data.filter((n: Notification) => !n.is_read).length)
    }
  }, [supabase, user])

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [supabase])

  const markAllAsRead = useCallback(async () => {
    if (!user) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }, [supabase, user])

  const subscribe = useCallback(() => {
    if (!user || notifChannelRef.current) return
    const channel = supabase.channel('notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
        const notif = payload.new as Notification
        setNotifications(prev => [notif, ...prev])
        setUnreadCount(prev => prev + 1)
        if (notif.type === 'message') toast(`New message from ${notif.data?.sender_name || 'someone'}`)
        else toast(notif.title)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
        const notif = payload.new as Notification
        setNotifications(prev => prev.map(n => n.id === notif.id ? notif : n))
        setUnreadCount(prev => Math.max(0, prev - (notif.is_read ? 1 : 0)))
      })
      .subscribe()
    notifChannelRef.current = channel
  }, [supabase, user])

  const subscribeToHeshima = useCallback(() => {
    if (!user || heshimaChannelRef.current) return
    const channel = supabase.channel('heshima')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'heshima_earnings', filter: `user_id=eq.${user.id}` }, (payload: { new: { amount: number; description?: string } }) => {
        const e = payload.new
        toast(`+${e.amount} Heshima${e.description ? ' — ' + e.description : ''}`)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_badges', filter: `user_id=eq.${user.id}` }, () => {
        toast('Badge unlocked!')
      })
      .subscribe()
    heshimaChannelRef.current = channel
  }, [supabase, user])

  const unsubscribe = useCallback(() => {
    if (notifChannelRef.current) {
      supabase.removeChannel(notifChannelRef.current)
      notifChannelRef.current = null
    }
  }, [supabase])

  const unsubscribeFromHeshima = useCallback(() => {
    if (heshimaChannelRef.current) {
      supabase.removeChannel(heshimaChannelRef.current)
      heshimaChannelRef.current = null
    }
  }, [supabase])

  useEffect(() => {
    if (user) {
      fetchNotifications()
      subscribe()
      subscribeToHeshima()
    } else {
      setNotifications([])
      setUnreadCount(0)
      unsubscribe()
      unsubscribeFromHeshima()
    }
    return () => { unsubscribe(); unsubscribeFromHeshima() }
  }, [user, fetchNotifications, subscribe, unsubscribe, subscribeToHeshima, unsubscribeFromHeshima])

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead, subscribe, unsubscribe }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)
