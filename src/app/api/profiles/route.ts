import { withAuth } from '@/lib/server-supabase'
import { NextResponse } from 'next/server'

export const GET = withAuth(async (request, { supabase, user }) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    return NextResponse.json({ profile })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const PUT = withAuth(async (request, { supabase, user }) => {
  try {
    const body = await request.json()
    const { full_name, avatar_url, county_hub } = body
    const { data: profile, error } = await supabase
      .from('profiles')
      .update({ full_name, avatar_url, county_hub, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single()
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ profile })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
