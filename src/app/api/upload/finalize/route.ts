import { withAuth } from '@/lib/server-supabase'
import { NextResponse } from 'next/server'

export const POST = withAuth(async (request, { supabase, user }) => {
  try {
    const { path, visibility = 'private' } = await request.json()
    if (!path) return NextResponse.json({ error: 'Missing path' }, { status: 400 })

    // Verify the file exists
    const { data: fileInfo, error: statError } = await supabase.storage
      .from('media')
      .list(path.split('/').slice(0, -1).join('/'), {
        search: path.split('/').pop(),
        limit: 1,
      })

    if (statError || !fileInfo?.length) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    if (visibility === 'public') {
      // Copy to public bucket for permanent public access
      const { error: copyErr } = await supabase.storage
        .from('media')
        .copy(path, `public/${path}`)

      if (copyErr) return NextResponse.json({ error: copyErr.message }, { status: 500 })

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(`public/${path}`)

      return NextResponse.json({ url: publicUrl, path: `public/${path}` })
    }

    // Return signed URL for private access (expires in 7 days)
    const { data, error } = await supabase.storage
      .from('media')
      .createSignedUrl(path, 60 * 60 * 24 * 7)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ url: data.signedUrl, path })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Finalize error' }, { status: 500 })
  }
})
