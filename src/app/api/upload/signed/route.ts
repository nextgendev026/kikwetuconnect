import { withAuth } from '@/lib/server-supabase'
import { NextResponse } from 'next/server'

export const POST = withAuth(async (request, { supabase, user }) => {
  try {
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const { folder = 'uploads', contentType = 'image/jpeg', fileSize } = body as {
      folder?: string; contentType?: string; fileSize?: number
    }
    const safeFolder = folder.replace(/\\/g, '/').split('/').filter(s => s && s !== '.' && s !== '..').join('/') || 'uploads'

    const maxSize = 10 * 1024 * 1024
    if (fileSize && fileSize > maxSize) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    const ext = (contentType || 'image/jpeg').split('/').pop() || 'jpg'
    const fileName = `${safeFolder}/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { data, error } = await supabase.storage
      .from('media')
      .createSignedUploadUrl(fileName)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      url: data.signedUrl,
      path: fileName,
      token: data.token,
    })
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
})
