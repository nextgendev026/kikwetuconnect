import { withAuth } from '@/lib/server-supabase'
import { NextResponse } from 'next/server'

export const PATCH = withAuth(async (request, { supabase, user }) => {
  const url = new URL(request.url)
  const id = url.pathname.split('/').pop()!

  const { data: post } = await supabase.from('posts').select('user_id').eq('id', id).maybeSingle()
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (post.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const allowed = ['title', 'content', 'post_type', 'county_tag', 'media_url', 'is_hidden']
  const updates: Record<string, any> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key]
  }
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'No valid fields' }, { status: 400 })

  const { data: updated, error } = await supabase.from('posts').update(updates).eq('id', id).select().maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ post: updated })
})

export const DELETE = withAuth(async (request, { supabase, user }) => {
  const url = new URL(request.url)
  const id = url.pathname.split('/').pop()!

  const { data: post } = await supabase.from('posts').select('user_id').eq('id', id).maybeSingle()
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (post.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('posts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
})
