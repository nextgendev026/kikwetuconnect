import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll().map(c => ({ name: c.name, value: c.value }))
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  const publicPaths = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/auth/callback']
  const isPublicPath = publicPaths.some(p => req.nextUrl.pathname.startsWith(p))
  const isLanding = req.nextUrl.pathname === '/' || req.nextUrl.pathname === ''

  if (!session && !isPublicPath && !isLanding) return NextResponse.redirect(new URL('/login', req.url))
  if (session && (isPublicPath || isLanding)) return NextResponse.redirect(new URL('/feed', req.url))

  return res
}

export const config = { matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|.*\\.svg).*)'] }
