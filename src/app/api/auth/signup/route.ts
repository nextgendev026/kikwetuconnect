import { createApiClient } from '@/lib/server-supabase'
import { NextRequest, NextResponse } from 'next/server'

type PendingSignup = { at: number }

const pendingByEmail = new Map<string, PendingSignup>()
const RATE_LIMIT_MS = 14_000

function rateLimited(email: string) {
  const now = Date.now()
  const prev = pendingByEmail.get(email.toLowerCase())
  if (prev) {
    const elapsed = now - prev.at
    if (elapsed < RATE_LIMIT_MS) return RATE_LIMIT_MS - elapsed
    pendingByEmail.delete(email.toLowerCase())
  }
  pendingByEmail.set(email.toLowerCase(), { at: now })
  return 0
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, username, phone, county, area, language, role, device, referrer } = await request.json()

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    if (!email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    const wait = rateLimited(email)
    if (wait > 0) {
      return NextResponse.json(
        { error: `Too many attempts. Please try again in ${Math.ceil(wait / 1000)} seconds.`, retryAfter: Math.ceil(wait / 1000) },
        { status: 429 }
      )
    }

    const res = NextResponse.json({})
    const supabase = createApiClient(request, res)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          username: username || null,
          phone: phone || null,
          county_hub: county || null,
          area: area || null,
          preferred_language: language || null,
          role: role || null,
          device: device || null,
          signup_referrer: referrer || null,
        },
      },
    })

    if (error) {
      pendingByEmail.delete(email.toLowerCase())
      const msg = error.message.toLowerCase()
      if (msg.includes('security purposes') || msg.includes('14 seconds') || msg.includes('rate')) {
        return NextResponse.json(
          { error: 'Too many attempts. Please wait a few seconds before trying again.', retryAfter: 14 },
          { status: 429 }
        )
      }
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      user: data.user,
      message: 'User created successfully. Please verify your email.',
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
