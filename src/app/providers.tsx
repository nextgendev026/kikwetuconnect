'use client'
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { usePathname } from 'next/navigation'

type SupabaseClient = ReturnType<typeof createBrowserClient>

const SupabaseCtx = createContext<SupabaseClient | undefined>(undefined)
const UserCtx = createContext<{ user: any; profile: any; loading: boolean; refreshProfile: () => void }>({ user: null, profile: null, loading: true, refreshProfile: () => {} })
const ThemeCtx = createContext<{ theme: string; toggleTheme: () => void }>({ theme: 'light', toggleTheme: () => {} })

// Notification context
interface Notification {
  id: string
  type: string
  title: string
  body: string
  data: Record<string, any>
  is_read: boolean
  created_at: string
}

const NotifCtx = createContext<{
  notifications: Notification[]
  unreadCount: number
  fetchNotifications: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  subscribe: () => void
  unsubscribe: () => void
}>({
  notifications: [],
  unreadCount: 0,
  fetchNotifications: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  subscribe: () => {},
  unsubscribe: () => {},
})

export function toast(msg: string, type?: 'info' | 'success' | 'error') {
  if (typeof window !== 'undefined') {
    const el = document.getElementById('global-toast')
    if (el) {
      el.textContent = msg
      el.className = 'toast'
      if (type && type !== 'info') el.classList.add(type)
      el.classList.add('show')
      setTimeout(() => el.classList.remove('show'), 2400)
    }
  }
}

const publicPaths = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/auth/callback', '/onboarding']

export function ShellRouter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isPublic = publicPaths.some(p => pathname === p || pathname.startsWith(p + '/')) || pathname.startsWith('/admin')
  if (!mounted) return <div style={{ minHeight: '100vh', background: 'var(--bg)' }} />
  return <>{isPublic ? children : <AppShell>{children}</AppShell>}</>
}

import AppShell from './AppShell'

export function Providers({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createBrowserClient())
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState('light')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const notifChannelRef = useRef<any>(null)
  const heshimaChannelRef = useRef<any>(null)
  const profileChannelRef = useRef<any>(null)

  useEffect(() => {
    const saved = localStorage.getItem('kikwetu-theme') || 'light'
    setTheme(saved)
    document.body.setAttribute('data-theme', saved)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('kikwetu-theme', next)
      document.body.setAttribute('data-theme', next)
      return next
    })
  }, [])

  const fetchProfile = useCallback(async (id: string) => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
      if (data) setProfile(data)
      return data
    } catch (e) {
      console.error('fetchProfile error:', e)
      return null
    }
  }, [supabase])

  const refreshProfile = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (u) { setUser(u); await fetchProfile(u.id) }
  }, [supabase, fetchProfile])

  // Notifications
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

  const subscribeToNotifications = useCallback(() => {
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'heshima_earnings', filter: `user_id=eq.${user.id}` }, (payload: any) => {
        const e = payload.new
        toast(`+${e.amount} Heshima${e.description ? ' — ' + e.description : ''}`)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_badges', filter: `user_id=eq.${user.id}` }, () => {
        toast('Badge unlocked 🎉')
      })
      .subscribe()
    heshimaChannelRef.current = channel
  }, [supabase, user])

  const unsubscribeFromHeshima = useCallback(() => {
    if (heshimaChannelRef.current) {
      supabase.removeChannel(heshimaChannelRef.current)
      heshimaChannelRef.current = null
    }
  }, [supabase])

  const unsubscribeFromNotifications = useCallback(() => {
    if (notifChannelRef.current) {
      supabase.removeChannel(notifChannelRef.current)
      notifChannelRef.current = null
    }
  }, [supabase])

  const subscribeToProfile = useCallback(() => {
    if (!user || profileChannelRef.current) return
    const channel = supabase.channel(`profile-${user.id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload: any) => {
          setProfile((payload.new as any) || null)
        }
      )
      .subscribe()
    profileChannelRef.current = channel
  }, [supabase, user])

  const unsubscribeFromProfile = useCallback(() => {
    if (profileChannelRef.current) {
      supabase.removeChannel(profileChannelRef.current)
      profileChannelRef.current = null
    }
  }, [supabase])

  useEffect(() => {
    let cancelled = false
    const timeout = setTimeout(() => { if (!cancelled) setLoading(false) }, 8000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return
      setUser(session?.user ?? null)
      if (session?.user) {
        const p = await fetchProfile(session.user.id)
        if (!cancelled) {
          if (!p) console.warn('No profile found for user', session.user.id)
          setLoading(false)
        }
      } else {
        setProfile(null)
        setLoading(false)
      }
      clearTimeout(timeout)
    })
    return () => { cancelled = true; subscription.unsubscribe() }
  }, [supabase, fetchProfile])

  useEffect(() => {
    if (user) {
      fetchNotifications()
      subscribeToNotifications()
      subscribeToHeshima()
      subscribeToProfile()
    } else {
      setNotifications([])
      setUnreadCount(0)
      unsubscribeFromNotifications()
      unsubscribeFromHeshima()
      unsubscribeFromProfile()
    }
    return () => { unsubscribeFromNotifications(); unsubscribeFromHeshima(); unsubscribeFromProfile() }
  }, [user, fetchNotifications, subscribeToNotifications, unsubscribeFromNotifications, subscribeToHeshima, unsubscribeFromHeshima, subscribeToProfile, unsubscribeFromProfile])

  // Admin activity logging helper
  const logAdminActivity = useCallback(async (action: string, targetType?: string, targetId?: string, details?: Record<string, any>) => {
    if (!user) return
    await supabase.rpc('admin_log_activity', {
      p_action: action,
      p_target_type: targetType,
      p_target_id: targetId,
      p_details: details || {},
    })
  }, [supabase, user])

  return (
    <SupabaseCtx.Provider value={supabase}>
      <ThemeCtx.Provider value={{ theme, toggleTheme }}>
        <UserCtx.Provider value={{ user, profile, loading, refreshProfile }}>
          <NotifCtx.Provider value={{ notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead, subscribe: subscribeToNotifications, unsubscribe: unsubscribeFromNotifications }}>
            {children}
            <div className="toast" id="global-toast"></div>
          </NotifCtx.Provider>
        </UserCtx.Provider>
      </ThemeCtx.Provider>
    </SupabaseCtx.Provider>
  )
}

export const useSupabase = () => { const c = useContext(SupabaseCtx); if (!c) throw new Error('Missing SupabaseProvider'); return c }
export const useUser = () => useContext(UserCtx)
export const useTheme = () => useContext(ThemeCtx)
export const useNotifications = () => useContext(NotifCtx)
export const useAdminActivity = () => ({ logAdminActivity: () => {} }) // placeholder, use inside components with supabase
