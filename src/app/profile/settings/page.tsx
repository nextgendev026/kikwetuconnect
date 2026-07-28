'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Button, Input } from '@/components/ui/form'
import { ArrowLeft, Lock, Bell, Shield, Camera, Upload, CheckCircle, XCircle } from 'lucide-react'
import { useSupabase, useUser, toast } from '@/app/providers'

export default function SettingsPage() {
  const supabase = useSupabase()
  const { profile, refreshProfile } = useUser()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    digestEmails: true,
  })

  const handleAvatarUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast('Please select an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('Image must be less than 5MB')
      return
    }

    setAvatarUploading(true)
    setError('')
    setSuccess('')

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile?.id || 'user'}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('public-media')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('public-media')
        .getPublicUrl(filePath)

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile?.id)

      if (updateError) throw updateError

      // Refresh profile context
      await refreshProfile()
      
      setAvatarPreview(publicUrl)
      setSuccess('Profile photo updated successfully!')
      toast('Profile photo updated!')
    } catch (err: any) {
      console.error('Avatar upload error:', err)
      setError(err.message || 'Failed to upload avatar')
      toast('Failed to upload avatar')
    } finally {
      setAvatarUploading(false)
    }
  }, [supabase, profile?.id, refreshProfile])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleAvatarUpload(file)
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      if (newPassword.length < 8) {
        setError('Password must be at least 8 characters')
        return
      }

      if (newPassword !== confirmPassword) {
        setError('Passwords do not match')
        return
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        setError(updateError.message)
      } else {
        setSuccess('Password updated successfully!')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/profile"
          className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-surface hover:bg-surface-2 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="text-xs text-muted">Manage your account preferences</p>
        </div>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Profile Photo */}
        <div className="card section animate-fade-in-up">
          <div className="flex items-center gap-3 mb-6">
            <Camera className="w-5 h-5 text-green" />
            <h2 className="card-title">Profile Photo</h2>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-bg/20 border border-red/30 text-red text-sm flex items-center gap-2">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-xl bg-green-bg/20 border border-green/30 text-green text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {success}
            </div>
          )}

          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green/20 to-gold/20 flex items-center justify-center overflow-hidden ring-2 ring-green/30">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Current avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-green">
                    {(profile?.full_name || profile?.username || 'U').slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted mb-3">Upload a new profile photo (JPG, PNG, WebP • Max 5MB)</p>
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-line text-sm font-medium cursor-pointer hover:bg-surface-2 transition-colors">
                <Upload className="w-4 h-4" />
                Choose Photo
                <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" disabled={avatarUploading} />
              </label>
              {avatarUploading && <span className="ml-3 text-xs text-muted animate-pulse">Uploading...</span>}
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="card section animate-fade-in-up">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-5 h-5 text-green" />
            <h2 className="card-title">Security</h2>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-bg/20 border border-red/30 text-red text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-xl bg-green-bg/20 border border-green/30 text-green text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              placeholder="Enter your current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={saving}
            />

            <Input
              label="New Password"
              type="password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={saving}
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={saving}
            />

            <Button
              type="submit"
              variant="primary"
              loading={saving}
              disabled={saving}
            >
              Update Password
            </Button>
          </form>
        </div>

        {/* Notifications */}
        <div className="card section animate-fade-in-up">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-5 h-5 text-gold" />
            <h2 className="card-title">Notifications</h2>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface transition-colors cursor-pointer group">
              <input
                type="checkbox"
                checked={preferences.emailNotifications}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    emailNotifications: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded accent-green"
              />
              <div className="flex-1">
                <p className="text-sm font-medium">Email Notifications</p>
                <p className="text-xs text-quiet">Receive updates about your activity</p>
              </div>
              <div className="w-10 h-5 bg-line rounded-full relative group-has-[:checked]:bg-green group-has-[:checked]:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-4 after:h-4 after:bg-cream after:rounded-full after:transition-transform" />
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface transition-colors cursor-pointer group">
              <input
                type="checkbox"
                checked={preferences.pushNotifications}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    pushNotifications: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded accent-green"
              />
              <div className="flex-1">
                <p className="text-sm font-medium">Push Notifications</p>
                <p className="text-xs text-quiet">Get instant notifications on your device</p>
              </div>
              <div className="w-10 h-5 bg-line rounded-full relative group-has-[:checked]:bg-green group-has-[:checked]:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-4 after:h-4 after:bg-cream after:rounded-full after:transition-transform" />
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface transition-colors cursor-pointer group">
              <input
                type="checkbox"
                checked={preferences.digestEmails}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    digestEmails: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded accent-green"
              />
              <div className="flex-1">
                <p className="text-sm font-medium">Weekly Digest</p>
                <p className="text-xs text-quiet">Receive a summary of your week</p>
              </div>
              <div className="w-10 h-5 bg-line rounded-full relative group-has-[:checked]:bg-green group-has-[:checked]:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-4 after:h-4 after:bg-cream after:rounded-full after:transition-transform" />
            </label>
          </div>
        </div>

        {/* Privacy */}
        <div className="card section animate-fade-in-up">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5 text-blue" />
            <h2 className="card-title">Privacy</h2>
          </div>

          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-surface border border-line">
              <p className="text-sm font-medium mb-1">Profile Visibility</p>
              <select className="input w-full text-sm bg-night border-line">
                <option>Public</option>
                <option>Private</option>
                <option>Friends Only</option>
              </select>
            </div>

            <div className="p-3 rounded-lg bg-surface border border-line">
              <p className="text-sm font-medium mb-1">Show Activity Status</p>
              <select className="input w-full text-sm bg-night border-line">
                <option>Everyone</option>
                <option>Followers Only</option>
                <option>Nobody</option>
              </select>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card section border border-red/20 animate-fade-in-up">
          <h2 className="card-title text-red mb-4">Danger Zone</h2>
          <div className="space-y-3">
            <Button variant="secondary" className="w-full justify-center">
              Download My Data
            </Button>
            <Button variant="danger" className="w-full justify-center">
              Delete Account
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
