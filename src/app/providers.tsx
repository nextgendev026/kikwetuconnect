'use client'
import { createContext, useContext, useState, type ReactNode } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { usePathname } from 'next/navigation'
import { AuthProvider, useUser } from './providers/auth-provider'
import { ThemeProvider } from './providers/theme-provider'
import { NotificationProvider } from './providers/notification-provider'
import { ToastProvider, toast } from './providers/toast-provider'
import AppShell from './AppShell'

export { toast } from './providers/toast-provider'
export { useUser } from './providers/auth-provider'
export { useTheme } from './providers/theme-provider'
export { useNotifications } from './providers/notification-provider'

type SupabaseClient = ReturnType<typeof createBrowserClient>
const SupabaseCtx = createContext<SupabaseClient | undefined>(undefined)

export const useSupabase = () => {
  const c = useContext(SupabaseCtx)
  if (!c) throw new Error('Missing SupabaseProvider')
  return c
}

const publicPaths = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/auth/callback', '/onboarding', '/welcome']

function ShellRouter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useUser()
  const isPublic = publicPaths.some(p => pathname === p || pathname.startsWith(p + '/')) || pathname.startsWith('/admin')
  const isAnonymousSharedPost = !user && pathname.startsWith('/posts')
  if (isPublic || isAnonymousSharedPost) return <>{children}</>
  return <AppShell>{children}</AppShell>
}

export function Providers({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createBrowserClient())

  return (
    <SupabaseCtx.Provider value={supabase}>
      <ToastProvider>
        <AuthProvider supabase={supabase}>
          <ThemeProvider>
            <NotificationProvider>
              <ShellRouter>
                {children}
              </ShellRouter>
            </NotificationProvider>
          </ThemeProvider>
        </AuthProvider>
      </ToastProvider>
    </SupabaseCtx.Provider>
  )
}
