'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button, Input } from '@/components/ui/form'
import { ArrowLeft, Lock, Bell, Shield } from 'lucide-react'
import { useSupabase } from '@/providers/supabase-provider'

export default function SettingsPage() {
  const supabase = useSupabase()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    digestEmails: true,
  })

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
        {/* Security */}
        <div className="card section">
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
        <div className="card section">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-5 h-5 text-gold" />
            <h2 className="card-title">Notifications</h2>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.emailNotifications}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    emailNotifications: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded"
              />
              <div className="flex-1">
                <p className="text-sm font-medium">Email Notifications</p>
                <p className="text-xs text-quiet">Receive updates about your activity</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.pushNotifications}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    pushNotifications: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded"
              />
              <div className="flex-1">
                <p className="text-sm font-medium">Push Notifications</p>
                <p className="text-xs text-quiet">Get instant notifications on your device</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.digestEmails}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    digestEmails: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded"
              />
              <div className="flex-1">
                <p className="text-sm font-medium">Weekly Digest</p>
                <p className="text-xs text-quiet">Receive a summary of your week</p>
              </div>
            </label>
          </div>
        </div>

        {/* Privacy */}
        <div className="card section">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5 text-blue" />
            <h2 className="card-title">Privacy</h2>
          </div>

          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-surface border border-line">
              <p className="text-sm font-medium mb-1">Profile Visibility</p>
              <select className="input w-full text-sm">
                <option>Public</option>
                <option>Private</option>
                <option>Friends Only</option>
              </select>
            </div>

            <div className="p-3 rounded-lg bg-surface border border-line">
              <p className="text-sm font-medium mb-1">Show Activity Status</p>
              <select className="input w-full text-sm">
                <option>Everyone</option>
                <option>Followers Only</option>
                <option>Nobody</option>
              </select>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card section border border-red/20">
          <h2 className="card-title text-red mb-4">Danger Zone</h2>
          <div className="space-y-3">
            <Button variant="danger" className="w-full justify-center">
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
