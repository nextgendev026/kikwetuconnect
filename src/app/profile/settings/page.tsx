'use client'
import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Button, Input } from '@/components/ui/form'
import { ArrowLeft, Lock, Bell, Shield, Camera, Upload, CheckCircle, XCircle, User, MapPin, Globe, Moon, Sun, Monitor, Eye, EyeOff } from 'lucide-react'
import { useSupabase, useUser, useTheme, toast } from '@/app/providers'

const style = {
  card: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20, boxShadow: 'var(--card-shadow)' },
  input: { width: '100%', background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: 11, padding: '10px 14px', fontSize: 13, color: 'var(--ink)', outline: 'none' },
}

export default function SettingsPage() {
  const supabase = useSupabase()
  const { profile, refreshProfile } = useUser()
  const { theme, toggleTheme } = useTheme()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState(String(profile?.full_name || ''))
  const [bio, setBio] = useState(String(profile?.bio || ''))
  const [county, setCounty] = useState(String(profile?.county_hub || ''))
  const [savingProfile, setSavingProfile] = useState(false)
  const [preferences, setPreferences] = useState({
    emailNotifications: true, pushNotifications: false, digestEmails: true,
    showOnlineStatus: true, showLocation: true,
  })

  const handleAvatarUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { toast('Please select an image file'); return }
    if (file.size > 5 * 1024 * 1024) { toast('Image must be less than 5MB'); return }
    setAvatarUploading(true); setError(''); setSuccess('')
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile?.id || 'user'}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`
      const { error: uploadError } = await supabase.storage.from('public-media').upload(filePath, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('public-media').getPublicUrl(filePath)
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile?.id)
      if (updateError) throw updateError
      await refreshProfile()
      setAvatarPreview(publicUrl)
      setSuccess('Profile photo updated!'); toast('Profile photo updated!')
    } catch (err: any) { setError(err.message || 'Failed to upload avatar'); toast('Failed to upload avatar') }
    finally { setAvatarUploading(false) }
  }, [supabase, profile?.id, refreshProfile])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) handleAvatarUpload(file) }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return }
      if (newPassword !== confirmPassword) { setError('Passwords do not match'); return }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) setError(updateError.message)
      else { setSuccess('Password updated!'); setCurrentPassword(''); setNewPassword(''); setConfirmPassword('') }
    } catch (err: any) { setError(err.message || 'An error occurred') }
    finally { setSaving(false) }
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true); setError(''); setSuccess('')
    try {
      const { error: upErr } = await supabase.from('profiles').update({ full_name: displayName, bio, county_hub: county }).eq('id', profile?.id)
      if (upErr) throw upErr
      await refreshProfile(); setSuccess('Profile updated!'); toast('Profile updated!')
    } catch { toast('Failed to update profile') }
    finally { setSavingProfile(false) }
  }

  const initials = (profile?.full_name || profile?.username || 'U').slice(0, 2).toUpperCase()

  return (
    <div className="pb-8 animate-fade-in-up">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/profile" className="inline-flex items-center justify-center w-10 h-10 rounded-lg transition-colors" style={{ background: 'var(--raised)', color: 'var(--muted)' }}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="page-title" style={{ color: 'var(--ink)' }}>Settings</h1>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Manage your account and preferences</p>
        </div>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Profile Photo */}
        <div style={style.card}>
          <div className="flex items-center gap-3 mb-4">
            <Camera className="w-5 h-5" style={{ color: 'var(--green)' }} />
            <h2 style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>Profile Photo</h2>
          </div>
          {error && <div className="mb-4 p-3 rounded-xl flex items-center gap-2 text-sm" style={{ background: 'color-mix(in oklab, var(--red) 15%, var(--surface))', border: '1px solid color-mix(in oklab, var(--red) 30%, transparent)', color: 'var(--red)' }}><XCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
          {success && <div className="mb-4 p-3 rounded-xl flex items-center gap-2 text-sm" style={{ background: 'color-mix(in oklab, var(--green) 15%, var(--surface))', border: '1px solid color-mix(in oklab, var(--green) 30%, transparent)', color: 'var(--green)' }}><CheckCircle className="w-4 h-4 flex-shrink-0" />{success}</div>}
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden relative" style={{ border: '3px solid color-mix(in oklab, var(--green) 30%, transparent)', background: 'linear-gradient(135deg, var(--green), var(--gold))' }}>
                {avatarPreview || profile?.avatar_url ? (
                  <img src={avatarPreview || profile?.avatar_url || undefined} alt="Avatar" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none'; const fb = e.currentTarget.parentElement!.querySelector('.af-st'); if (fb) (fb as HTMLElement).style.display = 'flex' }} />
                ) : null}
                <span className="af-st" style={{ position: 'absolute', inset: 0, display: avatarPreview || profile?.avatar_url ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800 }}>{initials}</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>Upload a new profile photo (JPG, PNG, WebP • Max 5MB)</p>
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors text-sm font-medium" style={{ background: 'var(--raised)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
                <Upload className="w-4 h-4" /> Choose Photo
                <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" disabled={avatarUploading} />
              </label>
              {avatarUploading && <span className="ml-3 text-xs animate-pulse" style={{ color: 'var(--muted)' }}>Uploading...</span>}
            </div>
          </div>
        </div>

        {/* Profile Info */}
        <div style={style.card}>
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5" style={{ color: 'var(--gold)' }} />
            <h2 style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>Profile Information</h2>
          </div>
          <div className="mb-3">
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>Display Name</label>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} style={style.input} placeholder="Your full name" />
          </div>
          <div className="mb-3">
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>Bio</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} style={{ ...style.input, resize: 'none', minHeight: 80 }} placeholder="Tell us about yourself..." />
          </div>
          <div className="mb-4">
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>County</label>
            <input type="text" value={county} onChange={e => setCounty(e.target.value)} style={style.input} placeholder="Your home county" />
          </div>
          <Button onClick={handleSaveProfile} loading={savingProfile} disabled={savingProfile}>Save Profile</Button>
        </div>

        {/* Theme */}
        <div style={style.card}>
          <div className="flex items-center gap-3 mb-4">
            {theme === 'dark' ? <Moon className="w-5 h-5" style={{ color: 'var(--gold)' }} /> : <Sun className="w-5 h-5" style={{ color: 'var(--gold)' }} />}
            <h2 style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>Appearance</h2>
          </div>
          <div className="flex gap-2">
            {['light', 'dark'].map(t => (
              <button key={t} onClick={() => { if (theme !== t) toggleTheme() }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-[11px] text-sm font-medium transition-all"
                style={theme === t ? { background: 'var(--gold)', color: 'var(--night)' } : { background: 'var(--raised)', color: 'var(--muted)', border: '1px solid var(--line)' }}>
                {t === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {t === 'light' ? 'Light' : 'Dark'}
              </button>
            ))}
          </div>
        </div>

        {/* Security */}
        <div style={style.card}>
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-5 h-5" style={{ color: 'var(--green)' }} />
            <h2 style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>Security</h2>
          </div>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <Input label="New Password" type="password" placeholder="At least 8 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} disabled={saving} />
            <Input label="Confirm Password" type="password" placeholder="Repeat your password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={saving} />
            <Button type="submit" variant="primary" loading={saving} disabled={saving}>Update Password</Button>
          </form>
        </div>

        {/* Notifications */}
        <div style={style.card}>
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5" style={{ color: 'var(--gold)' }} />
            <h2 style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>Notifications</h2>
          </div>
          <div className="space-y-3">
            {[
              { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive updates about your activity' },
              { key: 'pushNotifications', label: 'Push Notifications', desc: 'Get instant notifications on your device' },
              { key: 'digestEmails', label: 'Weekly Digest', desc: 'Receive a summary of your week' },
            ].map(item => (
              <label key={item.key} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors" style={{ background: 'var(--raised)' }}>
                <input type="checkbox" checked={(preferences as any)[item.key]} onChange={e => setPreferences({ ...preferences, [item.key]: e.target.checked })} className="w-4 h-4" style={{ accentColor: 'var(--green)' }} />
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{item.label}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{item.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Privacy */}
        <div style={style.card}>
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5" style={{ color: 'var(--earth)' }} />
            <h2 style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>Privacy</h2>
          </div>
          <div className="space-y-4">
            <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors" style={{ background: 'var(--raised)' }}>
              <Eye className="w-4 h-4" style={{ color: 'var(--muted)' }} />
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Show Online Status</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>Let others see when you are active</p>
              </div>
              <input type="checkbox" checked={preferences.showOnlineStatus} onChange={e => setPreferences({ ...preferences, showOnlineStatus: e.target.checked })} className="w-4 h-4" style={{ accentColor: 'var(--green)' }} />
            </label>
            <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors" style={{ background: 'var(--raised)' }}>
              <MapPin className="w-4 h-4" style={{ color: 'var(--muted)' }} />
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Show Location</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>Display your county on your profile</p>
              </div>
              <input type="checkbox" checked={preferences.showLocation} onChange={e => setPreferences({ ...preferences, showLocation: e.target.checked })} className="w-4 h-4" style={{ accentColor: 'var(--green)' }} />
            </label>
          </div>
        </div>

        {/* Danger Zone */}
        <div style={{ ...style.card, borderColor: 'color-mix(in oklab, var(--red) 30%, transparent)' }}>
          <h2 style={{ fontWeight: 800, fontSize: 14, color: 'var(--red)', marginBottom: 12 }}>Danger Zone</h2>
          <div className="space-y-3">
            <button className="w-full py-2.5 rounded-[11px] text-sm font-medium transition-colors" style={{ background: 'var(--raised)', border: '1px solid var(--line)', color: 'var(--ink)' }}>Download My Data</button>
            <button className="w-full py-2.5 rounded-[11px] text-sm font-bold transition-colors" style={{ background: 'color-mix(in oklab, var(--red) 15%, var(--surface))', color: 'var(--red)', border: '1px solid color-mix(in oklab, var(--red) 30%, transparent)' }}>Delete Account</button>
          </div>
        </div>
      </div>
    </div>
  )
}
