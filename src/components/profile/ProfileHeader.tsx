'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { Edit3, Settings, MapPin, Globe, MessageCircle, Heart, Users, BookOpen, Award, Sparkles, Camera, X, Check, Shield, Calendar } from 'lucide-react'
import { toast } from '@/app/providers'

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
  isFollowing?: boolean
  postCount?: number
  onFollow?: () => void
  onMessage?: () => void
  onBook?: () => void
  onAvatarChange?: (file: File) => void
  onCoverChange?: (file: File) => void
}

export default function ProfileHeader({
  profile,
  isOwn,
  isFollowing = false,
  postCount = 0,
  onFollow,
  onMessage,
  onBook,
  onAvatarChange,
  onCoverChange,
}: ProfileHeaderProps) {
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [coverUploading, setCoverUploading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [showCropModal, setShowCropModal] = useState(false)
  const [cropType, setCropType] = useState<'avatar' | 'cover'>('avatar')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

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

    const preview = URL.createObjectURL(file)
    if (type === 'avatar') setAvatarPreview(preview)
    else setCoverPreview(preview)
    setShowCropModal(true)
    e.target.value = ''
  }

  const handleConfirmUpload = async () => {
    if (!pendingFile) return
    const uploading = cropType === 'avatar' ? setAvatarUploading : setCoverUploading
    uploading(true)
    try {
      const type = cropType
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upload-url', type, mimeType: pendingFile.type }),
      })
      if (!res.ok) throw new Error('Failed to get upload URL')
      const { signedUrl, path } = await res.json()

      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        body: pendingFile,
        headers: { 'Content-Type': pendingFile.type },
      })
      if (!uploadRes.ok) throw new Error('Upload failed')

      const confirmRes = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm-upload', type, path }),
      })
      if (!confirmRes.ok) throw new Error('Confirmation failed')
      const { url } = await confirmRes.json()

      if (type === 'avatar') {
        profile.avatar_url = url
      } else {
        profile.cover_url = url
      }
      setShowCropModal(false)
      setAvatarPreview(null)
      setCoverPreview(null)
      setPendingFile(null)
      toast(`${type === 'avatar' ? 'Profile photo' : 'Cover image'} updated!`)
    } catch {
      toast('Upload failed. Please try again.')
    } finally {
      uploading(false)
    }
  }

  const handleCancelPreview = () => {
    setShowCropModal(false)
    setAvatarPreview(null)
    setCoverPreview(null)
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
        <div style={{
          height: 200,
          position: 'relative',
          background: profile.cover_url ? `url(${profile.cover_url}) center/cover no-repeat` : defaultCover,
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
          {/* Gradient overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 50%)',
          }} />
        </div>

        {/* Avatar + Action Bar */}
        <div style={{ padding: '0 20px 20px', marginTop: -48, position: 'relative', zIndex: 1 }}>
          <div className="flex items-end gap-4 mb-4">
            {/* Avatar */}
            <div className="relative group flex-shrink-0">
              <div style={{
                width: 96, height: 96, borderRadius: 20,
                background: 'var(--surface)',
                border: '4px solid var(--surface)',
                overflow: 'hidden',
                display: 'grid', placeItems: 'center',
                fontSize: 28, fontWeight: 800, color: 'var(--gold)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              }}>
                {(avatarPreview || profile.avatar_url) ? (
                  <img src={avatarPreview || profile.avatar_url!} alt={`${profile.full_name || profile.username}'s avatar`}
                    className="w-full h-full object-cover" />
                ) : initials}
              </div>
              {isOwn && (
                <label style={{
                  position: 'absolute', inset: 0, borderRadius: 20,
                  background: 'rgba(0,0,0,0.5)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: 0, transition: 'opacity .2s',
                }}
                  className="group-hover:opacity-100"
                  aria-label="Change profile photo">
                  {avatarUploading ? (
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
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
                <button onClick={onMessage}
                  style={{
                    padding: '8px 18px', borderRadius: 11, fontWeight: 600, fontSize: 12,
                    background: 'var(--raised)', color: 'var(--ink)',
                    border: '1px solid var(--line)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
                  <MessageCircle className="w-3.5 h-3.5" /> Message
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
        </div>
      </div>

      {/* Crop/Confirm Modal */}
      {showCropModal && pendingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'color-mix(in oklab, var(--night) 80%, transparent)' }}
          onClick={e => { if (e.target === e.currentTarget) handleCancelPreview() }}
          role="dialog" aria-modal="true" aria-labelledby="upload-preview-title">
          <div className="animate-rise" style={{
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 18, padding: 24, width: 'min(420px, 100%)',
          }}>
            <div className="flex items-center justify-between mb-4">
              <h2 id="upload-preview-title" style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)', margin: 0 }}>
                {cropType === 'avatar' ? 'Profile Photo' : 'Cover Image'}
              </h2>
              <button onClick={handleCancelPreview}
                style={{ background: 'var(--raised)', border: 0, borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div style={{
              borderRadius: cropType === 'avatar' ? 16 : 8,
              overflow: 'hidden', marginBottom: 16,
              background: 'var(--raised)', maxHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <img src={cropType === 'avatar' ? avatarPreview! : coverPreview!} alt="Preview"
                style={{
                  width: '100%',
                  height: cropType === 'avatar' ? 200 : 160,
                  objectFit: cropType === 'avatar' ? 'cover' : 'cover',
                }} />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={handleCancelPreview}
                style={{
                  padding: '8px 16px', borderRadius: 11, fontWeight: 600, fontSize: 12,
                  background: 'var(--raised)', color: 'var(--muted)',
                  border: '1px solid var(--line)', cursor: 'pointer',
                }}>
                Cancel
              </button>
              <button onClick={handleConfirmUpload}
                style={{
                  padding: '8px 16px', borderRadius: 11, fontWeight: 700, fontSize: 12,
                  background: 'var(--gold)', color: 'var(--night)',
                  border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                }}>
                <Check className="w-3.5 h-3.5" /> Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
