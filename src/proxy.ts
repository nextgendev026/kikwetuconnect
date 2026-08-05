import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ROLES } from '@/lib/roles'

export async function proxy(req: NextRequest) {
  const res = NextResponse.next()
  const { pathname } = req.nextUrl

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '',
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

  if (pathname.startsWith('/admin')) {
    if (!user) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (!profile || profile.role !== ROLES.ADMIN) {
      return NextResponse.redirect(new URL('/feed', req.url))
    }
    return res
  }

  // Static legal documents must be readable by everyone (and indexed), so they
  // are exempt from both the anonymous->/login and the logged-in->/feed bounces.
  if (pathname.startsWith('/legal')) return res

  const publicPaths = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/auth/callback', '/onboarding', '/welcome']
  const isPublicPath = publicPaths.some(p => pathname.startsWith(p))
  const isLanding = pathname === '/' || pathname === ''
  // Shared posts must be readable by anyone (anonymous read-only), while
  // logged-in users stay on the post without being bounced back to /feed.
  const isSharedPostRead = pathname.startsWith('/posts')

  if (!user && !isPublicPath && !isLanding && !isSharedPostRead) return NextResponse.redirect(new URL('/login', req.url))
  if (user && (isPublicPath || isLanding)) return NextResponse.redirect(new URL('/feed', req.url))

  return res
}

export const config = { matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|icons|sw.js|site.webmanifest|.*\\.(?:svg|png|ico|webmanifest|json|xml|txt|woff2?|ttf)$).*)'] }
