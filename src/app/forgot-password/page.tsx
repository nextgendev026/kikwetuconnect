'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useSupabase } from '@/app/providers'

export default function ForgotPasswordPage() {
  const supabase = useSupabase()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim()) { setError('Enter your email address'); return }
    setLoading(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/reset-password`,
      })
      if (resetError) setError(resetError.message)
      else setSent(true)
    } catch (err: any) { setError(err.message || 'An error occurred') }
    finally { setLoading(false) }
  }

  return (
    <div className="shell" style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: 'minmax(300px,.78fr) minmax(520px,1.22fr)' }}>
      <aside className="story" style={{ background: 'oklch(16% .035 151)', color: 'oklch(95% .012 91)', padding: 'clamp(28px,6vw,80px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 15% 18%,oklch(43% .08 151),transparent 33%),radial-gradient(circle at 85% 27%,oklch(38% .08 84),transparent 28%)', opacity: .62 }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'oklch(72% .15 84)', color: 'oklch(16% .035 151)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 19, transform: 'rotate(-8deg)' }}>K</div>
            <div><b style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-.05em' }}>KikwetuConnect</b></div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h1 style={{ fontWeight: 800, fontSize: 'clamp(2.5rem,4vw,4rem)', lineHeight: .95, letterSpacing: '-.08em', margin: 0, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Reset your password.</h1>
            <p style={{ color: 'oklch(77% .025 151)', fontSize: 15, lineHeight: 1.65, marginTop: 16 }}>Enter your email and we&apos;ll send you a link to create a new one.</p>
          </div>
        </div>
      </aside>
      <main style={{ padding: 'clamp(20px,4vw,70px)', display: 'grid', placeItems: 'center', background: 'oklch(96% .025 91)' }}>
        <div style={{ width: 'min(480px,100%)' }}>
          <Link href="/signup?mode=login" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: 'oklch(52% .035 151)', fontSize: 11, textDecoration: 'none', marginBottom: 30 }}>
            ← Back to sign in
          </Link>

          {sent ? (
            <div style={{ border: '1px solid oklch(52% .14 151)', borderRadius: 14, padding: 24, textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'oklch(90% .055 151)', display: 'grid', placeItems: 'center', margin: '0 auto 16px', color: 'oklch(52% .14 151)', fontSize: 24 }}>✉</div>
              <h2 style={{ fontWeight: 700, fontSize: 18, margin: '0 0 10px' }}>Check your email</h2>
              <p style={{ fontSize: 13, color: 'oklch(52% .035 151)', marginBottom: 20 }}>We sent a password reset link to <strong>{email}</strong>.</p>
              <button onClick={() => setSent(false)} style={{ width: '100%', height: 46, borderRadius: 11, background: 'oklch(72% .15 84)', color: 'oklch(16% .035 151)', fontWeight: 700, fontSize: 12, border: 0, cursor: 'pointer' }}>
                Send another email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && <div style={{ padding: '12px 15px', borderRadius: 11, background: 'oklch(90% .16 28)', color: 'oklch(56% .16 28)', fontSize: 11, fontWeight: 700, marginBottom: 15 }}>{error}</div>}
              <div style={{ display: 'grid', gap: 7, marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: 'oklch(52% .035 151)', fontWeight: 600 }}>Email address</label>
                <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)}
                  style={{ height: 46, width: '100%', background: 'oklch(99% .008 91)', border: '1px solid oklch(85% .035 91)', borderRadius: 11, padding: '0 12px', fontSize: 12 }} />
              </div>
              <button type="submit" disabled={loading} style={{ width: '100%', height: 46, borderRadius: 11, background: 'oklch(72% .15 84)', color: 'oklch(16% .035 151)', fontWeight: 700, fontSize: 12, border: 0, cursor: 'pointer', opacity: loading ? .5 : 1 }}>
                {loading ? <span style={{ width: 16, height: 16, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin .6s linear infinite' }} /> : null}
                Send reset link
              </button>
            </form>
          )}

          <p style={{ textAlign: 'center', color: 'oklch(52% .035 151)', fontSize: 11, marginTop: 18 }}>
            Remember your password?{' '}
            <Link href="/signup?mode=login" style={{ color: 'oklch(52% .14 151)', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </main>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:850px){.shell{grid-template-columns:1fr!important}.story{min-height:260px!important;padding:20px!important}}`}</style>
    </div>
  )
}
