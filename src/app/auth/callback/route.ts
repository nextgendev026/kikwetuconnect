import { createApiClient } from '@/lib/server-supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next')

  if (code) {
    const destination = next && next.startsWith('/') && !next.startsWith('//') ? next : '/feed'
    const response = NextResponse.redirect(new URL(destination, request.url))
    const supabase = createApiClient(request, response)
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) console.error('Auth callback error:', error.message)
    return response
  }

  return NextResponse.redirect(new URL('/signup?mode=login', request.url))
}
