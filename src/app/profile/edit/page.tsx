'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Input, Textarea } from '@/components/ui/form'
import { ArrowLeft, User, MapPin, FileText } from 'lucide-react'
import { useUser, useSupabase } from '@/providers/supabase-provider'

const COUNTIES = [
  'Nairobi',
  'Mombasa',
  'Kisumu',
  'Eldoret',
  'Kitale',
  'Nakuru',
  'Thika',
  'Kericho',
  'Isiolo',
  'Garissa',
  'Lamu',
  'Wajir',
  'Mandera',
  'Kilifi',
  'Kwale',
  'Taita-Taveta',
  'Makueni',
  'Kajiado',
  'Narok',
  'Bomet',
  'Nyamira',
  'Kisii',
  'Homa Bay',
  'Siaya',
  'Bungoma',
  'Busia',
  'Kakamega',
  'Vihiga',
  'Nandi',
  'Baringo',
  'West Pokot',
  'Samburu',
  'Laikipia',
  'Embu',
  'Meru',
  'Tharaka-Nithi',
  'Nyeri',
  'Murang\'a',
  'Kirinyaga',
  'Machakos',
  'Kiambu',
  'Turkana',
  'Trans Nzoia',
  'Uasin Gishu',
]

export default function EditProfilePage() {
  const router = useRouter()
  const { user, profile, loading } = useUser()
  const supabase = useSupabase()
  const [fullName, setFullName] = useState('')
  const [countyHub, setCountyHub] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setCountyHub(profile.county_hub || '')
      // Bio is stored in auth user metadata for now
    }
  }, [profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      if (!profile) throw new Error('Profile not found')

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          county_hub: countyHub,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)

      if (updateError) {
        setError(updateError.message)
      } else {
        setSuccess('Profile updated successfully!')
        setTimeout(() => {
          router.push('/profile')
        }, 1500)
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-green border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-muted mb-4">Profile not found</p>
        <Link href="/profile" className="btn btn-primary">
          Back to profile
        </Link>
      </div>
    )
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
          <h1 className="page-title">Edit Profile</h1>
          <p className="text-xs text-muted">Update your profile information</p>
        </div>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-bg/20 border border-red/30 text-red text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 rounded-xl bg-green-bg/20 border border-green/30 text-green text-sm">
              {success}
            </div>
          )}

          <div className="card section">
            <h3 className="card-title mb-4">Basic Information</h3>

            <Input
              label="Full Name"
              placeholder="Your full name"
              icon={User}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={saving}
              required
            />

            <div className="mb-4">
              <label className="block text-xs font-semibold mb-1.5 text-muted">
                County/Region
              </label>
              <select
                value={countyHub}
                onChange={(e) => setCountyHub(e.target.value)}
                disabled={saving}
                className="input w-full"
              >
                <option value="">Select your county</option>
                {COUNTIES.map((county) => (
                  <option key={county} value={county}>
                    {county}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bio/About */}
          <div className="card section">
            <h3 className="card-title mb-4">Bio</h3>
            <Textarea
              label="About you"
              placeholder="Tell us about yourself. What are you passionate about?"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={saving}
              rows={4}
              helper="Max 500 characters"
            />
          </div>

          {/* Display Info */}
          <div className="card section">
            <h3 className="card-title mb-4">Display Information</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted block mb-1">
                  Email Address
                </label>
                <p className="text-sm p-3 rounded-lg bg-surface border border-line">
                  {user?.email}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted block mb-1">
                  Username
                </label>
                <p className="text-sm p-3 rounded-lg bg-surface border border-line">
                  @{profile.username}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted block mb-1">
                  Member Since
                </label>
                <p className="text-sm p-3 rounded-lg bg-surface border border-line">
                  {new Date(profile.created_at).toLocaleDateString('en-KE', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              loading={saving}
              disabled={saving}
            >
              Save Changes
            </Button>
            <Link
              href="/profile"
              className="btn btn-secondary flex-1"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </>
  )
}
