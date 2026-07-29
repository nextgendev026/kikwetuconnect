import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim()
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim()

export function createApiClient(request: NextRequest, response?: NextResponse) {
  const res = response ?? NextResponse.next()
  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll().map(function(c: any) {
            return { name: c.name, value: c.value }
          })
        },
        setAll(cookiesToSet: any[]) {
          cookiesToSet.forEach(({ name, value, options }: any) => {
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
          return request.cookies.getAll().map(function(c: any) {
            return { name: c.name, value: c.value }
          })
        },
        setAll(cookiesToSet: any[]) {
          cookiesToSet.forEach(({ name, value, options }: any) => {
            request.cookies.set(name, value)
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )
}
