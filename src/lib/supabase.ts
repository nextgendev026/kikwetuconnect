import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim()
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim()

const REALTIME_CONFIG = {
  realtime: {
    params: { eventsPerSecond: 10 },
  },
}

export const createBrowserClient = () =>
  createSupabaseClient(
    supabaseUrl,
    supabaseAnonKey,
    REALTIME_CONFIG
  )

export const createServerClient = async () => {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  return createSSRServerClient(
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

export const supabase = createSupabaseClient(
  supabaseUrl,
  supabaseAnonKey,
  REALTIME_CONFIG
)
