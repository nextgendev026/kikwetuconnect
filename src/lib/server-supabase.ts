import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest } from 'next/server'

export function createApiClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: makeCookies(request) }
  )
}

import type { Database } from './database.types'

function makeCookies(request: NextRequest) {
  return {
    getAll() {
      return request.cookies.getAll().map(function(c: any) {
        return { name: c.name, value: c.value }
      })
    },
    setAll: function() {}
  }
}

export function createApiClientTyped(request: NextRequest) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: makeCookies(request) }
  )
}
