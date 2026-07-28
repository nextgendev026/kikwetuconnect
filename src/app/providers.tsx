'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import { usePathname } from 'next/navigation'

type SupabaseClient = ReturnType<typeof createBrowserClient>

const SupabaseCtx = createContext<SupabaseClient | undefined>(undefined)
const UserCtx = createContext<{ user: any; profile: any; loading: boolean; refreshProfile: () => void }>({ user: null, profile: null, loading: true, refreshProfile: () => {} })
const ThemeCtx = createContext<{ theme: string; toggleTheme: () => void }>({ theme: 'light', toggleTheme: () => {} })

export function toast(msg: string) {
  if (typeof window !== 'undefined') {
    const el = document.getElementById('global-toast')
    if (el) { el.textContent = msg; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2200) }
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
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ))
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState('light')

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
    const { data } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
    if (data) setProfile(data)
    return data
  }, [supabase])

  const refreshProfile = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (u) { setUser(u); await fetchProfile(u.id) }
  }, [supabase, fetchProfile])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u)
      if (u) fetchProfile(u.id)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) await fetchProfile(session.user.id)
      else setProfile(null)
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [supabase, fetchProfile])

  return (
    <SupabaseCtx.Provider value={supabase}>
      <ThemeCtx.Provider value={{ theme, toggleTheme }}>
        <UserCtx.Provider value={{ user, profile, loading, refreshProfile }}>
          {children}
          {/* Toast element rendered once at root level */}
        </UserCtx.Provider>
      </ThemeCtx.Provider>
    </SupabaseCtx.Provider>
  )
}

export const useSupabase = () => { const c = useContext(SupabaseCtx); if (!c) throw new Error('Missing SupabaseProvider'); return c }
export const useUser = () => useContext(UserCtx)
export const useTheme = () => useContext(ThemeCtx)
