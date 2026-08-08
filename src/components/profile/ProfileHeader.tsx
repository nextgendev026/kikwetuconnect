'use client'
import { useState, useRef, useCallback, useEffect, DragEvent } from 'react'
import Link from 'next/link'
import { Edit3, Settings, MapPin, Globe, MessageCircle, Heart, Users, BookOpen, Award, Calendar, Camera, Check, Upload, Trophy } from 'lucide-react'
import { toast } from '@/app/providers'
import MediaEditor from '@/components/MediaEditor'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

interface Profile {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  cover_url: string | null
  headline: string | null
  bio: string | null
  county_hub: string | null
  heshima_rating: number
  is_verified_expert: boolean
  follower_count: number
  following_count: number
  social_handles?: Record<string, string>
  website?: string | null
}

interface ProfileHeaderProps {
  profile: Profile
  isOwn: boolean
  supabase: SupabaseClient<Database>
  isFollowing?: boolean
  postCount?: number
  onFollow?: () => void
  onMessage?: () => void
  messaging?: boolean
  onBook?: () => void
  onAvatarChange?: (url: string) => void
  onCoverChange?: (url: string) => void
}

export default function ProfileHeader({
  profile,
  isOwn,
  supabase,
  isFollowing = false,
  postCount = 0,
  onFollow,
  onMessage,
  messaging = false,
  onBook,
  onAvatarChange,
  onCoverChange,
}: ProfileHeaderProps) {
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [coverUploading, setCoverUploading] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [cropType, setCropType] = useState<'avatar' | 'cover'>('avatar')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [coverDragOver, setCoverDragOver] = useState(false)
  const [avatarDragOver, setAvatarDragOver] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [userBadges, setUserBadges] = useState<{ id: string; icon: string; name: string; awarded_at: string }[]>([])

  useEffect(() => {
    let cancelled = false
    if (!profile?.id) return
    ;(async () => {
      try {
        const { data } = await supabase
          .from('user_badges')
          .select('awarded_at, badges:badge_id(id, name, icon)')
          .eq('user_id', profile.id)
          .order('awarded_at', { ascending: false })
          .limit(8)
        if (cancelled) return
        setUserBadges((data || []).map((b: any) => ({
          id: b.badges?.id,
          icon: b.badges?.icon || '🏅',
          name: b.badges?.name || '',
          awarded_at: b.awarded_at,
        })).filter(b => b.id))
      } catch { /* ignore badge load errors */ }
    })()
    return () => { cancelled = true }
  }, [supabase, profile?.id])

  const handleDragOver = useCallback((e: DragEvent, setter: (v: boolean) => void) => {
    e.preventDefault(); e.stopPropagation(); setter(true)
  }, [])
  const handleDragLeave = useCallback((e: DragEvent, setter: (v: boolean) => void) => {
    e.preventDefault(); e.stopPropagation(); setter(false)
  }, [])
  const handleDrop = useCallback((e: DragEvent, type: 'avatar' | 'cover') => {
    e.preventDefault(); e.stopPropagation()
    setCoverDragOver(false); setAvatarDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      toast('Please drop an image under 5MB')
      return
    }
    setPendingFile(file)
    setCropType(type)
    setShowEditor(true)
  }, [])

  const initials = (profile.full_name || profile.username || '?').slice(0, 2).toUpperCase()
  const gradientId = `cover-gradient-${profile.id.replace(/-/g, '')}`
  const defaultCover = `linear-gradient(135deg, oklch(55% .18 151) 0%, oklch(45% .14 261) 50%, oklch(35% .1 31) 100%)`

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast('Please select an image'); return }
    if (file.size > 5 * 1024 * 1024) { toast('Image must be under 5MB'); return }
    setPendingFile(file)
    setCropType(type)
    setShowEditor(true)
    e.target.value = ''
  }

  const handleCropComplete = async (editedFile: File) => {
    if (!pendingFile) return
    const uploading = cropType === 'avatar' ? setAvatarUploading : setCoverUploading
    uploading(true)
    try {
      const type = cropType
      const ext = (pendingFile.name.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '')
      const path = `${type}s/${profile.id}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: upErr } = await supabase.storage.from('public-media').upload(path, editedFile, { upsert: true })
      if (upErr) throw upErr

      const { data: { publicUrl } } = supabase.storage.from('public-media').getPublicUrl(path)
      const versionedUrl = publicUrl.includes('?') ? `${publicUrl}&t=${Date.now()}` : `${publicUrl}?t=${Date.now()}`

      const updateField = type === 'avatar' ? 'avatar_url' : 'cover_url'
      const { error: updateError } = await (supabase.from('profiles') as any)
        .update({ [updateField]: versionedUrl, updated_at: new Date().toISOString() })
        .eq('id', profile.id)
      if (updateError) throw updateError

      if (type === 'avatar') { onAvatarChange?.(versionedUrl) } else { onCoverChange?.(versionedUrl) }
      setShowEditor(false)
      setPendingFile(null)
      toast(`${type === 'avatar' ? 'Profile photo' : 'Cover image'} updated!`)
    } catch (e) {
      console.error('Upload error:', e)
      toast('Upload failed. Please try again.')
    } finally {
      uploading(false)
    }
  }

  const handleCancelEditor = () => {
    setShowEditor(false)
    setPendingFile(null)
  }

  return (
    <>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: 'var(--card-shadow)',
        marginBottom: 20,
      }}>
        {/* Cover */}
        <div
          onDragOver={e => isOwn && handleDragOver(e, setCoverDragOver)}
          onDragLeave={e => isOwn && handleDragLeave(e, setCoverDragOver)}
          onDrop={e => isOwn && handleDrop(e, 'cover')}
          style={{
            height: 200,
            position: 'relative',
            background: profile.cover_url ? `url(${profile.cover_url}) center/cover no-repeat` : defaultCover,
            transition: 'outline .2s',
            outline: coverDragOver ? '3px dashed var(--gold)' : '3px solid transparent',
            outlineOffset: -3,
          }}>
          {isOwn && (
            <label style={{
              position: 'absolute', top: 12, right: 12, zIndex: 2,
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
              display: 'grid', placeItems: 'center', cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.2)', transition: 'all .2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.7)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.5)' }}
              aria-label="Change cover photo">
              {coverUploading ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : <Camera className="w-4 h-4 text-white" />}
              <input ref={coverInputRef} type="file" accept="image/*" onChange={e => handleFileSelect(e, 'cover')} className="hidden" disabled={coverUploading} />
            </label>
          )}
          {isOwn && coverDragOver && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 3,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)',
              borderRadius: 16, color: '#fff', fontSize: 14, fontWeight: 700, gap: 8,
            }}>
              <Upload className="w-5 h-5" /> Drop cover photo here
            </div>
          )}
          {/* Gradient overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 50%)',
            pointerEvents: 'none',
          }} />
        </div>

        {/* Avatar + Action Bar */}
        <div style={{ padding: '0 20px 20px', marginTop: -48, position: 'relative', zIndex: 1 }}>
          <div className="flex items-end gap-4 mb-4">
            {/* Avatar */}
            <div
              onDragOver={e => isOwn && handleDragOver(e, setAvatarDragOver)}
              onDragLeave={e => isOwn && handleDragLeave(e, setAvatarDragOver)}
              onDrop={e => isOwn && handleDrop(e, 'avatar')}
              className="relative group flex-shrink-0"
              style={{ outline: avatarDragOver ? '3px dashed var(--gold)' : '3px solid transparent', outlineOffset: 2, borderRadius: 23, transition: 'outline .2s' }}>
              <div style={{
                width: 96, height: 96, borderRadius: 20,
                background: 'var(--surface)',
                border: '4px solid var(--surface)',
                overflow: 'hidden',
                display: 'grid', placeItems: 'center',
                fontSize: 28, fontWeight: 800, color: 'var(--gold)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                position: 'relative',
              }}>
                 {(profile.avatar_url) ? (
                   <img src={profile.avatar_url} alt={`${profile.full_name || profile.username}'s avatar`}
                     className="w-full h-full object-cover"
                     onError={e => { e.currentTarget.style.display = 'none'; const fb = e.currentTarget.parentElement!.querySelector('.af-ph'); if (fb) (fb as HTMLElement).style.display = 'flex' }} />
                 ) : null}
                 <span className="af-ph" style={{ position: 'absolute', inset: 0, display: profile.avatar_url ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: 'var(--gold)' }}>{initials}</span>
              </div>
              {isOwn && (
                <label style={{
                  position: 'absolute', inset: 0, borderRadius: 20,
                  background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(1px)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: avatarDragOver ? 1 : 0, transition: 'opacity .2s',
                }}
                  className={`${avatarDragOver ? '' : 'group-hover:opacity-100'}`}
                  aria-label="Change profile photo">
                  {avatarUploading ? (
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  ) : avatarDragOver ? (
                    <Upload className="w-6 h-6 text-white" />
                  ) : <Camera className="w-6 h-6 text-white" />}
                  <input ref={avatarInputRef} type="file" accept="image/*" onChange={e => handleFileSelect(e, 'avatar')} className="hidden" disabled={avatarUploading} />
                </label>
              )}
            </div>

            {/* Name + Headline */}
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 style={{ font: '800 22px var(--jakarta)', letterSpacing: '-.04em', color: 'var(--ink)', margin: 0 }}>
                  {profile.full_name || profile.username}
                </h1>
                {profile.is_verified_expert && (
                  <span style={{
                    background: 'var(--green)', color: '#fff', borderRadius: '50%',
                    width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, flexShrink: 0,
                  }}>
                    <Check className="w-3 h-3" />
                  </span>
                )}
              </div>
              {profile.headline && (
                <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>{profile.headline}</p>
              )}
              <p style={{ color: 'var(--muted)', fontSize: 11, marginTop: 4 }}>@{profile.username}</p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {isOwn ? (
              <>
                <Link href="/profile/edit"
                  style={{
                    padding: '8px 18px', borderRadius: 11, fontWeight: 700, fontSize: 12,
                    background: 'var(--gold)', color: 'var(--night)',
                    border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                    textDecoration: 'none',
                  }}>
                  <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                </Link>
                <Link href="/settings"
                  style={{
                    padding: '8px 18px', borderRadius: 11, fontWeight: 600, fontSize: 12,
                    background: 'var(--raised)', color: 'var(--muted)',
                    border: '1px solid var(--line)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                    textDecoration: 'none',
                  }}>
                  <Settings className="w-3.5 h-3.5" /> Settings
                </Link>
              </>
            ) : (
              <>
                <button onClick={onFollow}
                  style={{
                    padding: '8px 18px', borderRadius: 11, fontWeight: 700, fontSize: 12,
                    background: isFollowing ? 'var(--raised)' : 'var(--gold)',
                    color: isFollowing ? 'var(--ink)' : 'var(--night)',
                    border: isFollowing ? '1px solid var(--line)' : 0,
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                    transition: 'all .2s',
                  }}>
                  <Heart className={`w-3.5 h-3.5 ${isFollowing ? '' : 'fill-current'}`} />
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
                <button onClick={onMessage} disabled={messaging}
                  style={{
                    padding: '8px 18px', borderRadius: 11, fontWeight: 600, fontSize: 12,
                    background: 'var(--raised)', color: 'var(--ink)',
                    border: '1px solid var(--line)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                    opacity: messaging ? 0.6 : 1,
                  }}>
                  <MessageCircle className={`w-3.5 h-3.5 ${messaging ? 'animate-spin' : ''}`} /> {messaging ? 'Opening...' : 'Message'}
                </button>
                {onBook && (
                  <button onClick={onBook}
                    style={{
                      padding: '8px 18px', borderRadius: 11, fontWeight: 600, fontSize: 12,
                      background: 'var(--raised)', color: 'var(--ink)',
                      border: '1px solid var(--line)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}>
                    <Calendar className="w-3.5 h-3.5" /> Book
                  </button>
                )}
              </>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>
              {profile.bio}
            </p>
          )}

          {/* Location + Social */}
          <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--muted)', marginBottom: 12 }}>
            {profile.county_hub && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {profile.county_hub}
              </span>
            )}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--gold)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Globe className="w-3.5 h-3.5" /> {profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            {profile.social_handles && Object.entries(profile.social_handles).length > 0 && (
              <div className="flex gap-2">
                {Object.entries(profile.social_handles).map(([platform, handle]) => (
                  <span key={platform} style={{
                    padding: '2px 8px', borderRadius: 6,
                    background: 'var(--raised)', fontSize: 9, fontWeight: 600,
                    textTransform: 'capitalize',
                  }}>
                    {platform}: {handle}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Stat Row */}
          <div className="flex gap-4 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
            {[
              { label: 'Followers', value: profile.follower_count || 0, icon: Users },
              { label: 'Following', value: profile.following_count || 0, icon: Users },
              { label: 'Posts', value: postCount, icon: BookOpen },
              { label: 'Heshima', value: profile.heshima_rating || 0, icon: Award },
            ].map(stat => (
              <button key={stat.label} style={{
                flex: 1, padding: '8px 4px', borderRadius: 11,
                background: 'var(--raised)', border: '1px solid var(--line)',
                cursor: 'pointer', textAlign: 'center', transition: 'all .2s',
                minWidth: 0,
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--raised)' }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--ink)', lineHeight: 1.2 }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                  <stat.icon className="w-3 h-3" />
                  {stat.label}
                </div>
              </button>
            ))}
          </div>

          {/* Earned Badges */}
          {userBadges.length > 0 && (
            <div className="flex items-center gap-2 pt-3 mt-3 flex-wrap" style={{ borderTop: '1px solid var(--line)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 10, fontWeight: 700 }}>
                <Trophy className="w-3.5 h-3.5" style={{ color: 'var(--gold)' }} /> Badges
              </span>
              {userBadges.slice(0, 6).map(b => (
                <span key={b.id} title={b.name} style={{
                  width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center',
                  background: 'var(--raised)', border: '1px solid var(--line)', fontSize: 17,
                  cursor: 'default', transition: 'transform .15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}>
                  {b.icon}
                </span>
              ))}
              {isOwn && (
                <Link href="/profile/badges"
                  style={{ fontSize: 10, fontWeight: 700, color: 'var(--gold)', textDecoration: 'none', padding: '6px 10px', borderRadius: 8, background: 'color-mix(in oklab, var(--gold) 10%, var(--surface))' }}>
                  View all →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Manual crop editor — real crop region with drag handles + zoom */}
      {showEditor && pendingFile && (
        <MediaEditor
          file={pendingFile}
          type="image"
          aspect={cropType === 'cover' ? 'cover' : 'square'}
          onComplete={handleCropComplete}
          onCancel={handleCancelEditor}
        />
      )}
      </>
    )
}
