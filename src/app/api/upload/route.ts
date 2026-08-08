import { withAuth } from '@/lib/server-supabase'
import { NextResponse } from 'next/server'

/** Reject path traversal and verify the caller owns the storage path
 *  (paths are always {folder}/{userId}/... or public/{folder}/{userId}/...). */
function isOwnedPath(path: string, userId: string): boolean {
  const segments = path.split('/').filter(Boolean)
  if (segments.some(s => s === '..')) return false
  if (segments[0] === 'public') segments.shift()
  return segments.length >= 2 && segments[1] === userId
}

/** Sanitize a user-supplied folder name: no traversal, no leading slash. */
function sanitizeFolder(folder: string): string {
  const clean = folder.replace(/\\/g, '/').split('/').filter(s => s && s !== '.' && s !== '..').join('/')
  return clean || 'uploads'
}

export const POST = withAuth(async (request, { supabase, user }) => {
  try {
    const body = await request.json()
    const { action } = body

    // Generate signed upload URL for any file type
    if (action === 'signed-url') {
      const { folder = 'uploads', contentType = 'image/jpeg', fileSize } = body
      const safeFolder = sanitizeFolder(folder)

      const maxSize = 10 * 1024 * 1024
      if (fileSize && fileSize > maxSize) {
        return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
      }

      const ext = contentType.split('/').pop() || 'jpg'
      const path = `${safeFolder}/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { data, error } = await supabase.storage
        .from('media')
        .createSignedUploadUrl(path)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      return NextResponse.json({ url: data.signedUrl, path, token: data.token })
    }

    // Finalize: confirm upload, optionally make public
    if (action === 'finalize') {
      const { path, makePublic = true } = body
      if (!path) return NextResponse.json({ error: 'Missing path' }, { status: 400 })
      if (!isOwnedPath(path, user.id)) {
        return NextResponse.json({ error: 'Not your file' }, { status: 403 })
      }

      if (makePublic) {
        const publicPath = `public/${path}`
        const { error: copyErr } = await supabase.storage
          .from('media')
          .copy(path, publicPath)

        if (copyErr) return NextResponse.json({ error: copyErr.message }, { status: 500 })

        const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(publicPath)
        return NextResponse.json({ url: publicUrl, path: publicPath })
      }

      // Private file: return signed read URL (7 days)
      const { data, error } = await supabase.storage
        .from('media')
        .createSignedUrl(path, 60 * 60 * 24 * 7)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      return NextResponse.json({ url: data.signedUrl, path })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
})
