import { createApiClient } from '@/lib/server-supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { action } = body

    // Generate signed upload URL for avatar or cover
    if (action === 'upload-url') {
      const { type, mimeType } = body
      if (!type || !['avatar', 'cover'].includes(type)) {
        return NextResponse.json({ error: 'Invalid type (avatar or cover)' }, { status: 400 })
      }
      const ext = (mimeType?.split('/')[1] || 'jpg').replace(/[^a-zA-Z0-9]/g, '')
      const path = `${type}s/${user.id}-${Date.now()}.${ext}`
      const bucket = 'public-media'

      const { data: signedData, error: signedError } = await supabase.storage
        .from(bucket)
        .createSignedUploadUrl(path)
      if (signedError) throw signedError

      return NextResponse.json({
        signedUrl: signedData.signedUrl,
        path,
        fullPath: `${bucket}/${path}`,
        token: signedData.token,
      })
    }

    // Confirm upload: verify file exists, update profile
    if (action === 'confirm-upload') {
      const { type, path } = body
      if (!type || !['avatar', 'cover'].includes(type)) {
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
      }

      const { data: { publicUrl } } = supabase.storage.from('public-media').getPublicUrl(path)

      const updateField = type === 'avatar' ? 'avatar_url' : 'cover_url'
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [updateField]: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id)
      if (updateError) throw updateError

      return NextResponse.json({ url: publicUrl })
    }

    // Follow/unfollow a user
    if (action === 'follow') {
      const { target_user_id } = body
      if (!target_user_id) return NextResponse.json({ error: 'target_user_id required' }, { status: 400 })
      if (target_user_id === user.id) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })

      const { data: existing } = await supabase
        .from('follows').select('id').eq('follower_id', user.id).eq('following_id', target_user_id).maybeSingle()

      if (existing) {
        const { error: delError } = await supabase
          .from('follows').delete().eq('id', existing.id)
        if (delError) throw delError

        // Decrement counts
        await supabase.rpc('decrement_follower_count', { user_id: target_user_id })
        await supabase.rpc('decrement_following_count', { user_id: user.id })

        return NextResponse.json({ following: false })
      }

      const { error: insError } = await supabase
        .from('follows').insert({ follower_id: user.id, following_id: target_user_id })
      if (insError) throw insError

      // Increment counts
      await supabase.rpc('increment_follower_count', { user_id: target_user_id })
      await supabase.rpc('increment_following_count', { user_id: user.id })

      return NextResponse.json({ following: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    console.error('Profile API error:', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
