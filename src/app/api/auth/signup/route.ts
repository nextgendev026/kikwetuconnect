import { createApiClient } from '@/lib/server-supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, fullName, username, county, bio, language, role, interests } = body

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    if (!email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const res = NextResponse.json({})
    const supabase = createApiClient(request, res)

    // Create the auth user (this will also set auth cookies on the response)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, username },
        emailRedirectTo: `${new URL(request.url).origin}/auth/callback`,
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const userId = data.user?.id
    // If the user object is not immediately available (magic link flows), attempt to return created message
    if (!userId) {
      return NextResponse.json({ message: 'User created. Please verify your email.' })
    }

    // Create or update profile server-side so client doesn't need an active server-session cookie
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      username: username || null,
      full_name: fullName,
      county_hub: county || null,
      bio: bio || null,
      preferred_language: language || null,
      role: role || 'general',
      interests: interests || [],
    })

    if (profileError) {
      console.error('Profile upsert error:', profileError)
      // don't fail the whole request — return success but include warning
      return NextResponse.json({ user: data.user, warning: 'User created but profile upsert failed' })
    }

    if (Array.isArray(interests) && interests.length > 0) {
      const rows = interests.map((t: any) => ({ user_id: userId, topic_id: t }))
      const { error: topicsErr } = await supabase.from('user_topics').upsert(rows)
      if (topicsErr) console.error('user_topics upsert error:', topicsErr)
    }

    return NextResponse.json({ user: data.user, message: 'User created successfully. Please verify your email.' })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
