'use client'
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import { Toaster } from 'react-hot-toast'
import { usePathname } from 'next/navigation'
import AppShell from './AppShell'

type SupabaseClient = ReturnType<typeof createBrowserClient>

const SupabaseCtx = createContext<SupabaseClient | undefined>(undefined)
const UserCtx = createContext<{ user: any; profile: any; loading: boolean; refreshProfile: () => void }>({ user: null, profile: null, loading: true, refreshProfile: () => {} })

export function toast(msg: string) {
  if (typeof window !== 'undefined') {
    const el = document.getElementById('custom-toast')
    if (el) { el.textContent = msg; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2300) }
  }
}

const publicPaths = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/auth/callback', '/onboarding']

export function ShellRouter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isPublic = publicPaths.some(p => pathname === p || pathname.startsWith(p + '/')) || pathname.startsWith('/admin')
  if (!mounted) return <div className="min-h-screen bg-night" />

  return <>{isPublic ? children : <AppShell>{children}</AppShell>}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ))
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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
      <UserCtx.Provider value={{ user, profile, loading, refreshProfile }}>
        {children}
        <Toaster position="bottom-center" toastOptions={{ duration: 2300, style: { background: 'oklch(18% .028 151)', color: '#C6A860', border: '1px solid oklch(30% .025 151)', fontSize: '12px', borderRadius: '11px' } }} />
        <div id="custom-toast" className="fixed z-30 bottom-[87px] left-[17px] right-[17px] bg-gold text-night rounded-[11px] px-[13px] py-[10px] text-center text-[11px] font-bold opacity-0 translate-y-[16px] pointer-events-none transition-all duration-250" style={{ transitionTimingFunction: 'cubic-bezier(.16,1,.3,1)' }}></div>
      </UserCtx.Provider>
    </SupabaseCtx.Provider>
  )
}

export const useSupabase = () => { const c = useContext(SupabaseCtx); if (!c) throw new Error('Missing SupabaseProvider'); return c }
export const useUser = () => useContext(UserCtx)
