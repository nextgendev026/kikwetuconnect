import { withAuth, createApiClient } from '@/lib/server-supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const cursor = searchParams.get('cursor')
    const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 50)

    const { data: { user } } = await supabase.auth.getUser()

    let query = supabase.from('spaces').select('*', { count: 'exact' })

    if (category && category !== 'All') query = query.eq('category', category)
    if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    if (cursor) query = query.lt('member_count', cursor)
    query = query.order('member_count', { ascending: false }).limit(limit)

    const { data, count, error } = await query
    if (error) throw error

    let userMemberships: string[] = []
    if (user) {
      const { data: memberships } = await supabase
        .from('space_members').select('space_id').eq('user_id', user.id)
      if (memberships) userMemberships = memberships.map(m => m.space_id)
    }

    const nextCursor = data && data.length === limit ? data[data.length - 1].member_count : null

    return NextResponse.json({ data: data || [], count, nextCursor, userMemberships })
  } catch (e: any) {
    console.error('Spaces GET error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const POST = withAuth(async (request, { supabase, user }) => {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'create') {
      const { name, description, icon, category } = body
      if (!name?.trim() || !description?.trim()) {
        return NextResponse.json({ error: 'Name and description required' }, { status: 400 })
      }
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'space'

      const { data: existing } = await supabase.from('spaces').select('id').eq('slug', slug).maybeSingle()
      if (existing) return NextResponse.json({ error: 'A space with this name already exists' }, { status: 409 })

      const { data: space, error: createError } = await supabase.from('spaces').insert({
        name: name.trim(), slug, description: description.trim(),
        icon: icon || '\u{1F30D}', category: category || 'General', created_by: user.id, member_count: 1,
      }).select().single()
      if (createError) throw createError

      const { error: memberError } = await supabase.from('space_members').insert({
        space_id: space.id, user_id: user.id, role: 'admin',
      })
      if (memberError) throw memberError

      return NextResponse.json({ data: space })
    }

    if (action === 'join') {
      const { space_id } = body
      if (!space_id) return NextResponse.json({ error: 'space_id required' }, { status: 400 })

      const { data: membership } = await supabase.from('space_members')
        .select('id').eq('space_id', space_id).eq('user_id', user.id).maybeSingle()
      if (membership) return NextResponse.json({ success: true })

      const { error: joinError } = await supabase.from('space_members').insert({
        space_id, user_id: user.id, role: 'member',
      })
      if (joinError) throw joinError

      const { data: sp } = await supabase.from('spaces').select('member_count').eq('id', space_id).maybeSingle()
      if (sp) await supabase.from('spaces').update({ member_count: (sp.member_count || 0) + 1 }).eq('id', space_id)

      return NextResponse.json({ success: true })
    }

    if (action === 'leave') {
      const { space_id } = body
      if (!space_id) return NextResponse.json({ error: 'space_id required' }, { status: 400 })

      const { error: leaveError } = await supabase.from('space_members')
        .delete().eq('space_id', space_id).eq('user_id', user.id)
      if (leaveError) throw leaveError

      const { data: sp } = await supabase.from('spaces').select('member_count').eq('id', space_id).maybeSingle()
      if (sp) await supabase.from('spaces').update({ member_count: Math.max(0, (sp.member_count || 0) - 1) }).eq('id', space_id)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    console.error('Spaces POST error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
