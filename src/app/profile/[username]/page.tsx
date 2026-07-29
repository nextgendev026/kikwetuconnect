'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSupabase, toast } from '@/app/providers'
import ProfileHeader from '@/components/profile/ProfileHeader'

export default function UserProfilePage() {
  const params = useParams()
  const username = params.username as string
  const supabase = useSupabase()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!username) return
    supabase.from('profiles')
      .select('*')
      .eq('username', username)
      .maybeSingle()
      .then(({ data, error }: { data: any; error: any }) => {
        if (error) { toast(error.message); return }
        if (!data) { setNotFound(true); return }
        setProfile(data)
      })
      .finally(() => setLoading(false))
  }, [username, supabase])

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ width: 30, height: 30, border: '3px solid var(--line)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
  </div>

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <h2 style={{ fontWeight: 800, fontSize: 28, color: 'var(--ink)' }}>Profile not found</h2>
      <p style={{ color: 'var(--muted)' }}>@{username} doesn't exist on KikwetuConnect</p>
    </div>
  )

  return (
    <section className="page active" style={{ paddingTop: 33, paddingBottom: 94 }}>
      <ProfileHeader profile={profile} isOwn={false} />
    </section>
  )
}
