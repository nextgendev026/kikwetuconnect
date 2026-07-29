import { createApiClient } from '@/lib/server-supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { folder = 'uploads', contentType = 'image/jpeg', fileSize } = await request.json()

    const maxSize = 10 * 1024 * 1024
    if (fileSize > maxSize) return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })

    const ext = contentType.split('/').pop() || 'jpg'
    const fileName = `${folder}/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { data, error } = await supabase.storage
      .from('media')
      .createSignedUploadUrl(fileName)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      url: data.signedUrl,
      path: fileName,
      token: data.token,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Upload error' }, { status: 500 })
  }
}
