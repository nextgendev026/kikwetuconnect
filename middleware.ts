import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
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

  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))

  const publicPaths = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/auth/callback', '/onboarding']
  const isPublicPath = publicPaths.some(p => req.nextUrl.pathname.startsWith(p))
  const isLanding = req.nextUrl.pathname === '/' || req.nextUrl.pathname === ''

  if (!user && !isPublicPath && !isLanding) return NextResponse.redirect(new URL('/login', req.url))
  if (user && (isPublicPath || isLanding)) return NextResponse.redirect(new URL('/feed', req.url))

  return res
}

export const config = { matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|.*\\.svg).*)'] }
