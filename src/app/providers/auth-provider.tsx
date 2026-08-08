'use client'
import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { getJwtSessionId } from '@/lib/session'
import { toast } from './toast-provider'

type SupabaseClient = ReturnType<typeof createBrowserClient>
type AuthUser = { id: string; email?: string | null }
type AuthProfile = Record<string, unknown> & {
  id: string
  full_name: string | null
  username: string
  avatar_url: string | null
  heshima_rating: number
  is_verified_expert: boolean
  county_hub: string | null
  role: string
  active_session_id: string | null
}

interface AuthContextValue {
  user: AuthUser | null
  profile: AuthProfile | null
  loading: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
})

export function AuthProvider({ children, supabase }: { children: ReactNode; supabase: SupabaseClient }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const activeUserIdRef = useRef<string | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const signedOutRef = useRef(false)
  const claimInFlightRef = useRef(false)

  const fetchProfile = useCallback(async (id: string) => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
      if (data && activeUserIdRef.current === id) setProfile(data as AuthProfile)
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

  const forceSignOut = useCallback(async (reason: string) => {
    if (signedOutRef.current) return
    signedOutRef.current = true
    try { await supabase.auth.signOut() } catch { /* ignore */ }
    toast(reason)
    setTimeout(() => {
      const url = new URL('/signup', window.location.origin)
      url.searchParams.set('mode', 'login')
      url.searchParams.set('reason', 'elsewhere')
      window.location.href = url.toString()
    }, 250)
  }, [supabase])

  const checkSession = useCallback(async () => {
    if (claimInFlightRef.current) return
    try {
      const r = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check' }),
      })
      const d = await r.json()
      if (d && d.ok === false) void forceSignOut('Signed out — you logged in on another device')
    } catch { /* non-fatal */ }
  }, [forceSignOut])

  const claimSession = useCallback(async () => {
    claimInFlightRef.current = true
    try {
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim' }),
      })
    } catch { /* non-fatal */ }
    claimInFlightRef.current = false
    void checkSession()
  }, [checkSession])

  useEffect(() => {
    if (!user) return
    void checkSession()
    const onVisible = () => { if (document.visibilityState === 'visible') void checkSession() }
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      void checkSession()
    }, 60_000)
    return () => {
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(id)
    }
  }, [user, checkSession])

  useEffect(() => {
    let cancelled = false
    const timeout = setTimeout(() => { if (!cancelled) setLoading(false) }, 8000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return
      activeUserIdRef.current = session?.user?.id ?? null
      setUser(session?.user ?? null)
      if (session?.user) {
        const sid = getJwtSessionId(session.access_token)
        sessionIdRef.current = sid
        if (sid && event === 'SIGNED_IN') void claimSession()
        const p = await fetchProfile(session.user.id)
        if (!cancelled) {
          if (!p) console.warn('No profile found for user', session.user.id)
          setLoading(false)
        }
      } else {
        sessionIdRef.current = null
        signedOutRef.current = false
        setProfile(null)
        setLoading(false)
      }
      clearTimeout(timeout)
    })
    return () => { cancelled = true; subscription.unsubscribe() }
  }, [supabase, fetchProfile, claimSession])

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useUser = () => useContext(AuthContext)
