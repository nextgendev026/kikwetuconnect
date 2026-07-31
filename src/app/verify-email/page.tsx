'use client'
import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSupabase, toast } from '@/app/providers'

function VerifyEmailContent() {
  const supabase = useSupabase()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (email) return
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email)
    })
  }, [supabase, email])

  const resend = async () => {
    if (!email) { toast('Enter your email address first'); return }
    if (sending) return
    setSending(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: `${location.origin}/auth/callback?next=/welcome` },
      })
      if (error) { toast(error.message); return }
      setSent(true)
      toast('Verification email sent')
      setTimeout(() => setSent(false), 5000)
    } catch (e: any) {
      toast(e.message || 'Something went wrong')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="shell" style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: 'minmax(300px,.78fr) minmax(520px,1.22fr)' }}>
      <aside className="story" style={{ background: 'oklch(16% .035 151)', color: 'oklch(95% .012 91)', padding: 'clamp(28px,6vw,80px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 15% 18%,oklch(43% .08 151),transparent 33%),radial-gradient(circle at 85% 27%,oklch(38% .08 84),transparent 28%)', opacity: .62 }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'oklch(72% .15 84)', color: 'oklch(16% .035 151)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 19, transform: 'rotate(-8deg)' }}>K</div>
            <div><b style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-.05em' }}>KikwetuConnect</b><small style={{ display: 'block', color: 'oklch(72% .025 151)', fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', marginTop: 2 }}>Tuko pamoja</small></div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', fontWeight: 800, color: 'oklch(72% .15 84)' }}>One step away</div>
            <h1 style={{ fontWeight: 800, fontSize: 'clamp(2.6rem,4.5vw,4.2rem)', lineHeight: 1, letterSpacing: '-.08em', margin: '18px 0 20px', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Your account is almost approved.</h1>
            <p style={{ color: 'oklch(77% .025 151)', fontSize: 14, lineHeight: 1.65, maxWidth: '40ch' }}>Clicking the link in your email is the final step. It confirms your account, approves you, and drops you straight onto your welcome page.</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 15, color: 'oklch(65% .025 151)', fontSize: 11 }}>
            <span>Free to join · 47 counties</span>
            <span>English · Kiswahili</span>
          </div>
        </div>
      </aside>

      <main className="auth-main" style={{ padding: 'clamp(20px,4vw,70px)', display: 'grid', placeItems: 'center', background: 'oklch(96% .025 91)' }}>
        <div style={{ width: 'min(480px,100%)', textAlign: 'center' }}>
          <div style={{ width: 68, height: 68, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'oklch(90% .055 151)', color: 'oklch(52% .14 151)', fontSize: 30, margin: '0 auto 16px', animation: 'rise .35s ease' }}>✉️</div>
          <h1 style={{ fontWeight: 800, fontSize: 'clamp(1.8rem,4vw,2.6rem)', letterSpacing: '-.06em', margin: '0 0 10px', color: 'oklch(16% .035 151)', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Confirm &amp; verify your account</h1>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: 'oklch(52% .035 151)', maxWidth: '44ch', margin: '0 auto 22px' }}>
            Approval is granted by email verification. We sent a confirmation link to <b style={{ color: 'oklch(20% .04 151)' }}>{email || 'your inbox'}</b> — click it to activate your account.
          </p>

          <div style={{ border: '1px solid oklch(85% .035 91)', borderRadius: 16, padding: 22, background: 'oklch(99% .008 91)', marginBottom: 18, textAlign: 'left' }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '-.02em', color: 'oklch(20% .04 151)', marginBottom: 14 }}>How approval works</div>
            {[
              { n: '1', t: 'Check your inbox', d: `Look for an email from KikwetuConnect sent to ${email || 'your address'}.` },
              { n: '2', t: 'Click the confirm link', d: 'The link verifies your email and approves your account instantly.' },
              { n: '3', t: 'Land on your welcome page', d: 'You will be taken to your profile area to complete your setup.' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 11, padding: '10px 0', borderBottom: i < 2 ? '1px solid oklch(85% .035 91)' : 'none' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'oklch(90% .055 151)', color: 'oklch(52% .14 151)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{s.n}</div>
                <div>
                  <b style={{ fontSize: 12, color: 'oklch(20% .04 151)', display: 'block' }}>{s.t}</b>
                  <small style={{ fontSize: 11, color: 'oklch(52% .035 151)', lineHeight: 1.45, display: 'block' }}>{s.d}</small>
                </div>
              </div>
            ))}
          </div>

          <div style={{ border: '1px solid oklch(85% .035 91)', borderRadius: 14, padding: 18, background: 'oklch(99% .008 91)', marginBottom: 18 }}>
            <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 5px', color: 'oklch(20% .04 151)' }}>Didn&apos;t receive the email?</p>
            <p style={{ fontSize: 11, color: 'oklch(52% .035 151)', margin: '0 0 12px' }}>Check your spam folder, or resend to <b>{email || 'your address'}</b>.</p>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{ width: '100%', height: 44, background: 'oklch(99% .008 91)', border: '1px solid oklch(85% .035 91)', borderRadius: 11, padding: '0 12px', fontSize: 12, marginBottom: 10, boxSizing: 'border-box' }}
            />
            <button onClick={resend} disabled={sending || !email} style={{ width: '100%', height: 46, borderRadius: 11, background: 'oklch(72% .15 84)', color: 'oklch(16% .035 151)', border: 0, cursor: 'pointer', fontSize: 12, fontWeight: 700, opacity: sending || !email ? .55 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              {sending ? <span style={{ width: 15, height: 15, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin .6s linear infinite' }} /> : null}
              {sent ? 'Sent! Check your inbox' : 'Resend verification email'}
            </button>
          </div>

          <Link href="/signup?mode=login" style={{ color: 'oklch(52% .14 151)', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
            Back to sign in
          </Link>
        </div>
      </main>

      <style>{`
        @keyframes rise { from { opacity: 0; transform: translateY(9px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes spin { to { transform: rotate(360deg) } }
        @media(max-width:850px) {
          .shell { grid-template-columns: 1fr !important }
          .story { min-height: 260px !important; padding: 20px !important }
          .auth-main { padding: 20px 16px !important }
        }
      `}</style>
    </div>
  )
}

export default function VerifyEmailPage() {
  return <Suspense><VerifyEmailContent /></Suspense>
}
