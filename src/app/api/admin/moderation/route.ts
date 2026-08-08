import { withAuth } from '@/lib/server-supabase'
import { NextResponse } from 'next/server'

/** Server-side admin moderation. The acting admin id is resolved from the
 *  verified session and role-checked here — never trusted from the client. */
export const POST = withAuth(async (request, { supabase, user }) => {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'moderator')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const adminId = user.id

  const action = body.action as string
  const notes = body.notes ? String(body.notes).slice(0, 500) : null

  if (action === 'moderate') {
    const itemId = body.item_id as string
    const status = body.status as string
    if (!itemId || !['pending', 'dismissed', 'action_taken', 'reviewed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid arguments' }, { status: 400 })
    }
    const { error } = await supabase.rpc('admin_moderate_item', {
      p_admin_id: adminId,
      p_item_id: itemId,
      p_status: status,
      p_notes: notes,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'bulk_moderate') {
    const ids = body.item_ids as string[] | undefined
    const status = body.status as string
    if (!Array.isArray(ids) || ids.length === 0 || !['pending', 'dismissed', 'action_taken', 'reviewed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid arguments' }, { status: 400 })
    }
    if (ids.length > 200) {
      return NextResponse.json({ error: 'Too many items' }, { status: 400 })
    }
    const { data: jobId, error } = await supabase.rpc('admin_bulk_moderate', {
      p_admin_id: adminId,
      p_item_ids: ids,
      p_status: status,
      p_notes: notes,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!jobId) return NextResponse.json({ error: 'Bulk action did not start' }, { status: 500 })
    return NextResponse.json({ job_id: jobId })
  }

  if (action === 'bulk_job') {
    const jobId = body.job_id as string
    if (!jobId) return NextResponse.json({ error: 'Missing job id' }, { status: 400 })
    const { data, error } = await supabase.rpc('get_admin_bulk_job', { p_job_id: jobId })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ job: data })
  }

  if (action === 'delete_content') {
    const itemType = body.item_type as string
    const itemId = body.item_id as string
    if (!['post', 'answer', 'listing', 'alert', 'space'].includes(itemType)) {
      return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })
    }
    if (!itemId) return NextResponse.json({ error: 'Missing item id' }, { status: 400 })
    const { error } = await supabase.rpc('admin_delete_content', {
      p_item_type: itemType,
      p_item_id: itemId,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
})
