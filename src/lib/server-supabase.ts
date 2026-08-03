import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ''

/** Server-only privileged client (bypasses RLS). NEVER expose to the browser. */
export function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || ''
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export function createApiClient(request: NextRequest, response?: NextResponse) {
  const res = response ?? NextResponse.next()
  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )
}

export function createApiClientTyped(request: NextRequest, response?: NextResponse) {
  const res = response ?? NextResponse.next()
  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )
}

/** Require authenticated user in API routes — returns 401 JSON if missing */
export async function requireUser(request: NextRequest): Promise<{ supabase: ReturnType<typeof createApiClient>; user: { id: string; email?: string | null } } | NextResponse> {
  const supabase = createApiClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) as any
  return { supabase, user: { id: user.id, email: user.email } }
}

type AuthenticatedHandler = (
  request: NextRequest,
  ctx: { supabase: ReturnType<typeof createApiClient>; user: { id: string; email?: string | null } }
) => Promise<NextResponse>

/**
 * Wrapper for authenticated API routes that properly forwards Supabase
 * session-refresh cookies to the client. Without this, refreshed tokens
 * are silently dropped because createApiClient writes to an internal
 * NextResponse that is never returned.
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest, ctx?: any) => {
    const res = NextResponse.next()
    const supabase = createApiClient(request, res)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const result = await handler(request, { supabase, user: { id: user.id, email: user.email } })
    res.cookies.getAll().forEach(c => result.cookies.set(c.name, c.value))
    return result
  }
}


