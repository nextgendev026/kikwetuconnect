'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useSupabase } from '@/app/providers'

export default function VerifyEmailPage() {
  const supabase = useSupabase()
  const [resent, setResent] = useState(false)

  const resend = async () => {
    setResent(true)
    setTimeout(() => setResent(false), 3000)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: 'minmax(300px,.78fr) minmax(520px,1.22fr)' }}>
      <aside style={{ background: 'oklch(16% .035 151)', color: 'oklch(95% .012 91)', padding: 'clamp(28px,6vw,80px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 15% 18%,oklch(43% .08 151),transparent 33%),radial-gradient(circle at 85% 27%,oklch(38% .08 84),transparent 28%)', opacity: .62 }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'oklch(72% .15 84)', color: 'oklch(16% .035 151)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 19, transform: 'rotate(-8deg)' }}>K</div>
            <div><b style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-.05em' }}>KikwetuConnect</b></div>
          </div>
        </div>
      </aside>
      <main style={{ padding: 'clamp(20px,4vw,70px)', display: 'grid', placeItems: 'center', background: 'oklch(96% .025 91)' }}>
        <div style={{ width: 'min(480px,100%)', textAlign: 'center' }}>
          <div style={{ width: 68, height: 68, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'oklch(90% .055 151)', color: 'oklch(52% .14 151)', fontSize: 30, margin: '0 auto 16px' }}>✓</div>
          <h1 style={{ fontWeight: 800, fontSize: 28, letterSpacing: '-.06em', margin: '0 0 10px' }}>Check your email</h1>
          <p style={{ fontSize: 13, lineHeight: 1.55, color: 'oklch(52% .035 151)', maxWidth: '42ch', margin: '0 auto 24px' }}>
            We sent a verification link to your email address. Click it to confirm your account and get started.
          </p>
          <div style={{ border: '1px solid oklch(85% .035 91)', borderRadius: 14, padding: 20, background: 'oklch(99% .008 91)', marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 4px' }}>Didn&apos;t receive it?</p>
            <p style={{ fontSize: 11, color: 'oklch(52% .035 151)', marginBottom: 14 }}>Check your spam folder or request a new link.</p>
            <button onClick={resend} style={{ width: '100%', height: 46, borderRadius: 11, background: 'oklch(99% .008 91)', border: '1px solid oklch(85% .035 91)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
              {resent ? 'Sent!' : 'Resend verification email'}
            </button>
          </div>
          <Link href="/signup?mode=login" style={{ color: 'oklch(52% .14 151)', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
            Back to sign in
          </Link>
        </div>
      </main>
    </div>
  )
}
