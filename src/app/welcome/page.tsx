'use client'
import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser, useSupabase } from '@/app/providers'

export default function WelcomePage() {
  const router = useRouter()
  const supabase = useSupabase()
  const { user, profile, loading, refreshProfile } = useUser()

  useEffect(() => {
    if (!loading && !user) router.replace('/signup?mode=login')
  }, [loading, user, router])

  useEffect(() => {
    if (user) refreshProfile()
  }, [user, refreshProfile])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'oklch(16% .035 151)' }}>
        <div style={{ width: 32, height: 32, border: '3px solid oklch(72% .15 84)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (!user || !profile) return null

  const initials = (profile.full_name || profile.username || 'U').slice(0, 2).toUpperCase()
  const firstName = (profile.full_name || profile.username || 'friend').split(' ')[0]

  return (
    <div className="welcome" style={{ minHeight: '100vh', background: 'oklch(16% .035 151)', color: 'oklch(95% .012 91)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '22px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 18% 22%,oklch(43% .08 151),transparent 34%),radial-gradient(circle at 82% 30%,oklch(38% .08 84),transparent 30%),radial-gradient(circle at 50% 90%,oklch(38% .08 84 / .5),transparent 40%)', opacity: .6, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, width: 'min(460px,100%)', textAlign: 'center', animation: 'rise .45s ease' }}>
        <div className="brand" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 34 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: 'oklch(72% .15 84)', color: 'oklch(16% .035 151)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 19, transform: 'rotate(-8deg)' }}>K</div>
          <div style={{ textAlign: 'left' }}><b style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-.05em' }}>KikwetuConnect</b><small style={{ display: 'block', color: 'oklch(65% .028 151)', fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', marginTop: 2 }}>Tuko pamoja</small></div>
        </div>

        <div style={{ position: 'relative', width: 84, height: 84, margin: '0 auto 18px' }}>
          <div style={{ position: 'absolute', inset: -6, borderRadius: '50%', background: 'linear-gradient(135deg, oklch(72% .15 84), oklch(52% .14 151))', opacity: .55 }} />
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.full_name || profile.username} style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '3px solid oklch(18% .028 151)' }} />
          ) : (
            <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '50%', background: 'oklch(22% .03 151)', border: '3px solid oklch(18% .028 151)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 26, color: 'oklch(72% .15 84)' }}>{initials}</div>
          )}
          <div style={{ position: 'absolute', bottom: 2, right: 2, width: 22, height: 22, borderRadius: '50%', background: 'oklch(75% .14 84)', border: '3px solid oklch(16% .035 151)', display: 'grid', placeItems: 'center', fontSize: 10, color: 'oklch(16% .035 151)', fontWeight: 800 }}>✓</div>
        </div>

        <div style={{ fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', fontWeight: 800, color: 'oklch(72% .15 84)', marginBottom: 10 }}>Account confirmed &amp; approved</div>
        <h1 style={{ fontWeight: 800, fontSize: 'clamp(2.2rem,5.5vw,3.4rem)', lineHeight: 1.03, letterSpacing: '-.07em', margin: '0 0 12px', fontFamily: "'Plus Jakarta Sans',sans-serif'" }}>Karibu, {firstName}.</h1>
        <p style={{ fontSize: 14, lineHeight: 1.65, color: 'oklch(72% .028 151)', maxWidth: '40ch', margin: '0 auto 26px' }}>
          Your email is verified and your place in the circle is ready. Head to your profile to make it yours — then jump into the conversation.
        </p>

        <div style={{ display: 'grid', gap: 9, marginBottom: 14 }}>
          <Link href="/profile" className="welcome-btn-primary" style={{ height: 48, borderRadius: 13, background: 'oklch(72% .15 84)', color: 'oklch(16% .035 151)', fontWeight: 800, fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'transform .2s cubic-bezier(.16,1,.3,1), box-shadow .2s' }}>
            Go to my profile ↗
          </Link>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
            <Link href="/onboarding" className="welcome-btn-secondary" style={{ height: 46, borderRadius: 13, background: 'oklch(21% .03 151)', border: '1px solid oklch(32% .025 151)', color: 'oklch(88% .02 91)', fontWeight: 700, fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'border-color .2s, transform .2s' }}>
              Complete my profile
            </Link>
            <Link href="/feed" className="welcome-btn-secondary" style={{ height: 46, borderRadius: 13, background: 'oklch(21% .03 151)', border: '1px solid oklch(32% .025 151)', color: 'oklch(88% .02 91)', fontWeight: 700, fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'border-color .2s, transform .2s' }}>
              Explore Baraza
            </Link>
          </div>
        </div>

        <div style={{ fontSize: 11, color: 'oklch(55% .028 151)' }}>
          @{profile.username} · {profile.county_hub || 'Kenya'} · {profile.heshima_rating || 0} Heshima
        </div>
      </div>

      <style>{`
        @keyframes rise { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
        .welcome-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 30px -6px oklch(65% .15 84 / .5) }
        .welcome-btn-secondary:hover { border-color: oklch(72% .15 84); transform: translateY(-1px) }
        @media(max-width:480px) {
          .welcome { padding: 16px }
        }
      `}</style>
    </div>
  )
}
