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
    const mine = searchParams.get('mine')

    const { data: { user } } = await supabase.auth.getUser()

    if (mine === 'true' && user) {
      const { data: adminRows } = await supabase
        .from('page_admins').select('page_id').eq('user_id', user.id)
      if (!adminRows || adminRows.length === 0) {
        return NextResponse.json({ data: [], count: 0, nextCursor: null, userFollows: [], userAdmins: [] })
      }
      const pageIds = adminRows.map(r => r.page_id)
      let query = supabase.from('pages').select('*', { count: 'exact' }).in('id', pageIds)
      if (cursor) query = query.lt('followers_count', cursor)
      query = query.order('followers_count', { ascending: false }).limit(limit)
      const { data, count } = await query
      return NextResponse.json({
        data: data || [], count, nextCursor: data && data.length === limit ? data[data.length - 1].followers_count : null,
        userFollows: [], userAdmins: pageIds,
      })
    }

    let query = supabase.from('pages').select('*', { count: 'exact' })
    if (category && category !== 'All') query = query.eq('category', category)
    if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    if (cursor) query = query.lt('followers_count', cursor)
    query = query.order('followers_count', { ascending: false }).limit(limit)

    const { data, count, error } = await query
    if (error) throw error

    let userFollows: string[] = []
    let userAdmins: string[] = []
    if (user) {
      const [{ data: follows }, { data: admins }] = await Promise.all([
        supabase.from('page_follows').select('page_id').eq('user_id', user.id),
        supabase.from('page_admins').select('page_id').eq('user_id', user.id),
      ])
      if (follows) userFollows = follows.map(f => f.page_id)
      if (admins) userAdmins = admins.map(a => a.page_id)
    }

    const nextCursor = data && data.length === limit ? data[data.length - 1].followers_count : null
    return NextResponse.json({ data: data || [], count, nextCursor, userFollows, userAdmins })
  } catch (e: any) {
    console.error('Pages GET error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const POST = withAuth(async (request, { supabase, user }) => {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'create') {
      const { name, description, category, cover_url, avatar_url, website, phone, email, address } = body
      if (!name?.trim() || !description?.trim()) {
        return NextResponse.json({ error: 'Name and description required' }, { status: 400 })
      }
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'page'

      const { data: existing } = await supabase.from('pages').select('id').eq('slug', slug).maybeSingle()
      if (existing) return NextResponse.json({ error: 'A page with this name already exists' }, { status: 409 })

      const { data: page, error: createError } = await supabase.from('pages').insert({
        name: name.trim(), slug, description: description.trim(),
        category: category || 'General', cover_url, avatar_url, website, phone, email, address,
        created_by: user.id,
      }).select().single()
      if (createError) throw createError

      const { error: adminError } = await supabase.from('page_admins').insert({
        page_id: page.id, user_id: user.id, role: 'owner', added_by: user.id,
      })
      if (adminError) throw adminError

      return NextResponse.json({ data: page })
    }

    if (action === 'follow') {
      const { page_id } = body
      if (!page_id) return NextResponse.json({ error: 'page_id required' }, { status: 400 })

      const { data: existing } = await supabase.from('page_follows')
        .select('id').eq('page_id', page_id).eq('user_id', user.id).maybeSingle()
      if (existing) return NextResponse.json({ success: true })

      const { error: followError } = await supabase.from('page_follows').insert({ page_id, user_id: user.id })
      if (followError) throw followError

      return NextResponse.json({ success: true })
    }

    if (action === 'unfollow') {
      const { page_id } = body
      if (!page_id) return NextResponse.json({ error: 'page_id required' }, { status: 400 })

      const { error: unfollowError } = await supabase.from('page_follows')
        .delete().eq('page_id', page_id).eq('user_id', user.id)
      if (unfollowError) throw unfollowError

      return NextResponse.json({ success: true })
    }

    if (action === 'post') {
      const { page_id, content, media_url, media_type, title } = body
      if (!page_id || !content?.trim()) {
        return NextResponse.json({ error: 'page_id and content required' }, { status: 400 })
      }

      const { data: admin } = await supabase.from('page_admins')
        .select('role').eq('page_id', page_id).eq('user_id', user.id).maybeSingle()
      if (!admin || !['owner', 'admin', 'editor'].includes(admin.role)) {
        return NextResponse.json({ error: 'Insufficient permissions to post as page' }, { status: 403 })
      }

      const { data: post, error: postError } = await supabase.from('posts').insert({
        user_id: user.id, post_type: 'baraza', content: content.trim(),
        title: title || content.split('\n')[0].slice(0, 100),
        media_url: media_url || null, media_type: media_type || null, page_id,
      }).select('*, profiles:user_id(id, full_name, username, avatar_url, heshima_rating, is_verified_expert, county_hub)').single()
      if (postError) throw postError

      return NextResponse.json({ data: post })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    console.error('Pages POST error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
