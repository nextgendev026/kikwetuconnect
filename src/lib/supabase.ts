import { createBrowserClient as createSSRBrowserClient, createServerClient as createSSRServerClient } from '@supabase/ssr'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ''

const REALTIME_CONFIG = {
  realtime: {
    params: { eventsPerSecond: 10 },
  },
}

// Browser client MUST persist the session in cookies (not localStorage) so that
// proxy.ts can see it on server-side navigation. Otherwise login appears to
// "refresh" the page and bounce back because the proxy never finds a session.
export const createBrowserClient = () =>
  createSSRBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    REALTIME_CONFIG
  )

export const createServerClient = async () => {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  return createSSRServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}
