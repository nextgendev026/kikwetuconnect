'use client'
import { useEffect } from 'react'
import { useSupabase } from '@/app/providers'
import { useRouter } from 'next/navigation'

export default function LogoutPage() {
  const supabase = useSupabase()
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    supabase.auth.signOut().then(() => {
      if (!cancelled) setTimeout(() => router.push('/'), 100)
    })
    return () => { cancelled = true }
  }, [supabase, router])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="animate-spin w-8 h-8 border-2" style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>Signing out...</p>
      </div>
    </div>
  )
}
