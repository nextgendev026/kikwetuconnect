'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useSupabase } from '@/app/providers'

const COUNTIES = ['Nairobi','Mombasa','Kisumu','Uasin Gishu','Kiambu','Nakuru','Eldoret','Kitale','Kericho','Isiolo','Garissa','Lamu','Wajir','Mandera','Kilifi','Kwale','Taita-Taveta','Makueni','Kajiado','Narok','Bomet','Nyamira','Kisii','Homa Bay','Siaya','Bungoma','Busia','Kakamega','Vihiga','Nandi','Baringo','West Pokot','Samburu','Laikipia','Embu','Meru','Tharaka-Nithi','Nyeri',"Murang'a",'Kirinyaga','Machakos','Turkana','Trans Nzoia']
const SERVICES = [
  { id: 'ask-learn', icon: '\u2753', label: 'Ask and learn', desc: 'Questions, answers, quizzes' },
  { id: 'share-knowledge', icon: '\u270D\uFE0F', label: 'Share knowledge', desc: 'Posts, articles, polls' },
  { id: 'find-guidance', icon: '\uD83E\uDDED', label: 'Find guidance', desc: 'Private expert sessions' },
  { id: 'offer-services', icon: '\u2726', label: 'Offer services', desc: 'Apply as a professional' },
  { id: 'buy-sell', icon: '\uD83E\uDDEA', label: 'Buy or sell locally', desc: 'Mtaa Market' },
  { id: 'safety', icon: '\uD83D\uDEE1\uFE0F', label: 'Neighbourhood safety', desc: 'Nyumba Kumi updates' },
]
const TOPICS = [
  { id: 'Agriculture', icon: '\uD83C\uDF3E', label: 'Agriculture', desc: '#KilimoSmart' },
  { id: 'Tech', icon: '\uD83D\uDCBB', label: 'Tech and startups', desc: 'Nairobi Tech' },
  { id: 'Biashara', icon: '\uD83E\uDDEA', label: 'Biashara', desc: 'Hustles and finance' },
  { id: 'Education', icon: '\uD83C\uDF93', label: 'Education', desc: 'Learn Together' },
  { id: 'Rights', icon: '\u2696\uFE0F', label: 'Rights', desc: 'Legal and civic' },
  { id: 'Culture', icon: '\uD83C\uDFAD', label: 'Culture', desc: 'Stories and language' },
]

function EyeBtn({ id }: { id: string }) {
  const [show, setShow] = useState(false)
  return (
    <button type="button" onClick={() => setShow(!show)} className="absolute right-[5px] top-[5px] w-[36px] h-[36px] bg-transparent text-[oklch(52%_.035_151)] rounded-[8px] grid place-items-center text-xs">
      {show ? '\u25C9' : '\u25CE'}
    </button>
  )
}

export default function SignupPage() {
  return <Suspense><SignupForm /></Suspense>
}

function SignupForm() {
  const router = useRouter()
  const supabase = useSupabase()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<'login' | 'signup'>(searchParams.get('mode') === 'login' ? 'login' : 'signup')
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [toastMsg, setToastMsg] = useState('')

  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [language, setLanguage] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [county, setCounty] = useState('')
  const [area, setArea] = useState('')
  const [role, setRole] = useState('')
  const [services, setServices] = useState<string[]>([])
  const [topics, setTopics] = useState<string[]>([])
  const [bio, setBio] = useState('')
  const [notifPref, setNotifPref] = useState('important')
  const [visibility, setVisibility] = useState('public')
  const [agree, setAgree] = useState(false)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  const [created, setCreated] = useState(false)
  const [sCounty, setSCounty] = useState('')
  const [sLanguage, setSLanguage] = useState('')
  const [sServices, setSServices] = useState('')

  const toast = (m: string) => { setToastMsg(m); setTimeout(() => setToastMsg(''), 2200) }

  const toggleService = (id: string) => setServices(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  const toggleTopic = (id: string) => setTopics(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  const validStep1 = () => {
    if (!first.trim() || !last.trim()) { toast('Enter your name'); return false }
    if (!username.trim()) { toast('Choose a username'); return false }
    if (!/^\S+@\S+\.\S+$/.test(email)) { toast('Enter a valid email'); return false }
    if (password.length < 8) { toast('Password must be at least 8 characters'); return false }
    if (password !== confirm) { toast('Passwords do not match'); return false }
    if (!language) { toast('Choose your language'); return false }
    return true
  }

  const validStep2 = () => {
    if (!county) { toast('Choose your county'); return false }
    if (!role) { toast('Choose your role'); return false }
    if (services.length === 0) { toast('Choose at least one service'); return false }
    return true
  }

  const validStep3 = () => {
    if (!agree) { toast('Accept the terms to finish'); return false }
    return true
  }

  const handleNext = () => {
    if (step === 1 && !validStep1()) return
    if (step === 2 && !validStep2()) return
    if (step === 3 && !validStep3()) return
    if (step < 3) { setStep(s => s + 1); window.scrollTo(0, 0); return }
    handleSignup()
  }

  const handleSignup = async () => {
    setLoading(true)
    try {
      const { error: signUpError, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: `${first} ${last}`, username },
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      })
      if (signUpError) { toast(signUpError.message); setLoading(false); return }

      const userId = data.user?.id
      if (!userId) { toast('Account creation failed'); setLoading(false); return }

      const persona = role
      const dbRole = persona === 'moderator' ? 'moderator' : 'general'
      const userType = persona === 'student' || persona === 'professional' || persona === 'parent' ? persona : null

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        username,
        full_name: `${first} ${last}`,
        county_hub: county,
        bio: bio || null,
        preferred_language: language,
        role: dbRole,
        user_type: userType,
        interests: topics,
      })
      if (profileError) { toast(profileError.message); setLoading(false); return }

      if (services.length > 0) {
        const { error: topicError } = await supabase.from('user_topics').upsert(
          services.map(s => ({ user_id: userId, topic_id: s }))
        )
        if (topicError) console.error(topicError)
      }

      setSCounty(county)
      setSLanguage(language === 'en' ? 'English' : 'Kiswahili')
      setSServices(services.slice(0, 2).join(', ') || 'Ask and learn')
      setCreated(true)
    } catch (e: any) {
      toast(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    if (!loginEmail.trim() || !loginPassword.trim()) { setLoginError('Enter your email and password'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword })
      if (error) { setLoginError(error.message) } else { router.push('/feed') }
    } catch (err: any) { setLoginError(err.message || 'An error occurred') } finally { setLoading(false) }
  }

  const stepDots = (s: number) => (
    <div className="flex gap-[6px] mb-[25px]">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-[4px] flex-1 rounded-[99px] bg-[oklch(85%_.035_91)] overflow-hidden">
          <div className="h-full transition-all duration-300" style={{ width: i <= s ? '100%' : '0%', background: 'oklch(72% .15 84)' }} />
        </div>
      ))}
    </div>
  )

  if (created) {
    return (
      <div className="shell" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px,.78fr) minmax(520px,1.22fr)', minHeight: '100vh' }}>
        <aside className="story2" style={{ background: 'oklch(16% .035 151)', color: 'oklch(95% .012 91)', padding: 'clamp(28px,6vw,80px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 15% 18%,oklch(43% .08 151),transparent 33%),radial-gradient(circle at 85% 27%,oklch(38% .08 84),transparent 28%)', opacity: .62 }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: 'oklch(72% .15 84)', color: 'oklch(16% .035 151)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 19, transform: 'rotate(-8deg)' }}>K</div>
              <div><b style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-.05em' }}>KikwetuConnect</b><small style={{ display: 'block', color: 'oklch(72% .025 151)', fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', marginTop: 2 }}>Tuko pamoja</small></div>
            </div>
          </div>
        </aside>
        <main className="auth-main" style={{ padding: 'clamp(20px,4vw,70px)', display: 'grid', placeItems: 'center' }}>
          <div style={{ textAlign: 'center', width: 'min(480px,100%)', animation: 'rise .35s ease' }}>
            <div style={{ width: 68, height: 68, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'oklch(90% .055 151)', color: 'oklch(52% .14 151)', fontSize: 30, margin: '0 auto 16px' }}>✓</div>
            <h2 style={{ fontWeight: 800, fontSize: 30, letterSpacing: '-.06em', margin: '0 0 10px', color: 'oklch(16% .035 151)' }}>Welcome to the circle.</h2>
            <p style={{ fontSize: 13, lineHeight: 1.55, color: 'oklch(52% .035 151)', margin: '0 auto 20px', maxWidth: '42ch' }}>Your Kikwetu profile is ready. We'll shape your first feed around the services and topics you chose.</p>
            <div style={{ textAlign: 'left', border: '1px solid oklch(85% .035 91)', background: 'oklch(99% .008 91)', borderRadius: 14, padding: 14, marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid oklch(85% .035 91)', padding: '8px 0', fontSize: 11 }}>
                <span style={{ color: 'oklch(52% .035 151)' }}>County</span><b>{sCounty}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid oklch(85% .035 91)', padding: '8px 0', fontSize: 11 }}>
                <span style={{ color: 'oklch(52% .035 151)' }}>Language</span><b>{sLanguage}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', fontSize: 11 }}>
                <span style={{ color: 'oklch(52% .035 151)' }}>Starting with</span><b>{sServices}</b>
              </div>
            </div>
            <button onClick={() => router.push('/feed')} style={{ width: '100%', height: 46, borderRadius: 11, background: 'oklch(72% .15 84)', color: 'oklch(16% .035 151)', fontWeight: 700, fontSize: 12, border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: 'transform .2s cubic-bezier(.16,1,.3,1)' }}
              onMouseEnter={e => (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)'}
              onMouseLeave={e => (e.target as HTMLButtonElement).style.transform = ''}
            >Enter KikwetuConnect ↗</button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="shell" style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: 'minmax(300px,.78fr) minmax(520px,1.22fr)' }}>
      {/* Story sidebar */}
      <aside className="story" style={{ background: 'oklch(16% .035 151)', color: 'oklch(95% .012 91)', padding: 'clamp(28px,6vw,80px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 15% 18%,oklch(43% .08 151),transparent 33%),radial-gradient(circle at 85% 27%,oklch(38% .08 84),transparent 28%)', opacity: .62 }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'oklch(72% .15 84)', color: 'oklch(16% .035 151)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 19, transform: 'rotate(-8deg)' }}>K</div>
            <div><b style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-.05em' }}>KikwetuConnect</b><small style={{ display: 'block', color: 'oklch(72% .025 151)', fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', marginTop: 2 }}>Tuko pamoja</small></div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', fontWeight: 800, color: 'oklch(72% .15 84)' }}>Kenya's knowledge circle</div>
            <h1 style={{ fontWeight: 800, fontSize: 'clamp(3rem,5.4vw,6rem)', lineHeight: .95, letterSpacing: '-.08em', margin: '18px 0 22px', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Come with what you know.</h1>
            <p style={{ color: 'oklch(77% .025 151)', fontSize: 15, lineHeight: 1.65, maxWidth: '42ch' }}>Find useful people, ask better questions, and turn local context into real progress.</p>
            <p style={{ fontWeight: 700, fontSize: 'clamp(1.15rem,2vw,1.7rem)', lineHeight: 1.25, letterSpacing: '-.05em', color: 'oklch(94% .02 91)', maxWidth: '24ch', marginTop: 35, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>&ldquo;A good answer is someone helping you move.&rdquo;</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 15, color: 'oklch(65% .025 151)', fontSize: 11 }}>
            <span>47 counties · multilingual by design</span>
            <span>English · Kiswahili</span>
          </div>
        </div>
      </aside>

      {/* Auth zone */}
      <main className="auth-main" style={{ padding: 'clamp(20px,4vw,70px)', display: 'grid', placeItems: 'center', background: 'oklch(96% .025 91)' }}>
        <div style={{ width: 'min(660px,100%)' }}>
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <div style={{ display: 'flex', gap: 4, padding: 4, border: '1px solid oklch(85% .035 91)', borderRadius: 11, background: 'oklch(99% .008 91)' }}>
              <button onClick={() => { setMode('login'); setStep(1); setCreated(false) }}
                style={{ background: mode === 'login' ? 'oklch(16% .035 151)' : 'none', color: mode === 'login' ? 'oklch(95% .012 91)' : 'oklch(52% .035 151)', fontSize: 11, borderRadius: 8, padding: '9px 14px', fontWeight: mode === 'login' ? 700 : 400, border: 0, cursor: 'pointer' }}>
                Log in
              </button>
              <button onClick={() => { setMode('signup'); setStep(1); setCreated(false) }}
                style={{ background: mode === 'signup' ? 'oklch(16% .035 151)' : 'none', color: mode === 'signup' ? 'oklch(95% .012 91)' : 'oklch(52% .035 151)', fontSize: 11, borderRadius: 8, padding: '9px 14px', fontWeight: mode === 'signup' ? 700 : 400, border: 0, cursor: 'pointer' }}>
                Sign up
              </button>
            </div>
            <button style={{ background: 'none', color: 'oklch(52% .035 151)', fontSize: 11, border: 0, cursor: 'pointer' }}>English ▾</button>
          </div>

          {mode === 'login' ? (
            /* === LOGIN === */
            <div>
              <div style={{ fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', fontWeight: 800, color: 'oklch(72% .15 84)' }}>Welcome back</div>
              <h2 style={{ fontWeight: 800, fontSize: 'clamp(2rem,4vw,3rem)', lineHeight: 1, letterSpacing: '-.07em', margin: 0, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Good to see you.</h2>
              <p style={{ color: 'oklch(52% .035 151)', fontSize: 13, lineHeight: 1.55, margin: '10px 0 24px' }}>Pick up where your circle left off.</p>

              {loginError && (
                <div style={{ padding: '12px 15px', borderRadius: 11, background: 'oklch(90% .16 28)', color: 'oklch(56% .16 28)', fontSize: 11, fontWeight: 700, marginBottom: 15 }}>{loginError}</div>
              )}

              <button style={{ width: '100%', height: 46, background: 'oklch(99% .008 91)', border: '1px solid oklch(85% .035 91)', borderRadius: 11, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onClick={() => toast('Google sign-in flow opened')}>
                ◉ &nbsp; Continue with Google
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'oklch(52% .035 151)', fontSize: 10, margin: '20px 0' }}>
                <span style={{ height: 1, background: 'oklch(85% .035 91)', flex: 1 }} />
                <span>or use email</span>
                <span style={{ height: 1, background: 'oklch(85% .035 91)', flex: 1 }} />
              </div>

              <form onSubmit={handleLogin}>
                <div style={{ display: 'grid', gap: 7, marginBottom: 14 }}>
                  <label style={{ fontSize: 11, color: 'oklch(52% .035 151)', fontWeight: 600 }}>Email address</label>
                  <input type="email" placeholder="you@example.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                    style={{ height: 46, width: '100%', background: 'oklch(99% .008 91)', border: '1px solid oklch(85% .035 91)', borderRadius: 11, padding: '0 12px', fontSize: 12 }} />
                </div>
                <div style={{ display: 'grid', gap: 7, marginBottom: 14 }}>
                  <label style={{ fontSize: 11, color: 'oklch(52% .035 151)', fontWeight: 600 }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type="password" placeholder="Your password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                      style={{ height: 46, width: '100%', background: 'oklch(99% .008 91)', border: '1px solid oklch(85% .035 91)', borderRadius: 11, padding: '0 42px 0 12px', fontSize: 12 }} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '3px 0 20px' }}>
                  <label style={{ fontSize: 11, color: 'oklch(52% .035 151)' }}><input type="checkbox" style={{ accentColor: 'oklch(52% .14 151)' }} /> Remember me</label>
                  <Link href="/forgot-password" style={{ background: 'none', color: 'oklch(52% .14 151)', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>Forgot password?</Link>
                </div>
                <button type="submit" disabled={loading} style={{ width: '100%', height: 46, borderRadius: 11, background: 'oklch(72% .15 84)', color: 'oklch(16% .035 151)', fontWeight: 700, fontSize: 12, border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: loading ? .5 : 1 }}>
                  {loading ? <span style={{ width: 16, height: 16, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin .6s linear infinite' }} /> : null}
                  Log in ↗
                </button>
              </form>
              <p style={{ textAlign: 'center', color: 'oklch(52% .035 151)', fontSize: 11, margin: '18px 0' }}>
                New to Kikwetu? <button onClick={() => setMode('signup')} style={{ background: 'none', color: 'oklch(52% .14 151)', fontWeight: 700, border: 0, cursor: 'pointer', fontSize: 11 }}>Create an account</button>
              </p>
            </div>
          ) : (
            /* === SIGNUP === */
            <div>
              <div style={{ fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', fontWeight: 800, color: 'oklch(72% .15 84)' }}>Start your circle</div>
              <h2 style={{ fontWeight: 800, fontSize: 'clamp(2rem,4vw,3rem)', lineHeight: 1, letterSpacing: '-.07em', margin: 0, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Create your account.</h2>
              <p style={{ color: 'oklch(52% .035 151)', fontSize: 13, lineHeight: 1.55, margin: '10px 0 24px' }}>Tell us enough to make Kikwetu useful from day one.</p>

              {stepDots(step)}

              {/* Step 1: Account */}
              {step === 1 && (
                <div style={{ animation: 'rise .3s ease' }}>
                  <h3 style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-.03em', margin: '0 0 15px' }}>1. Your account</h3>
                  <div className="auth-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
                    <div style={{ display: 'grid', gap: 7, marginBottom: 14 }}>
                      <label style={{ fontSize: 11, color: 'oklch(52% .035 151)', fontWeight: 600 }}>First name *</label>
                      <input placeholder="Akinyi" value={first} onChange={e => setFirst(e.target.value)} style={{ height: 46, width: '100%', background: 'oklch(99% .008 91)', border: '1px solid oklch(85% .035 91)', borderRadius: 11, padding: '0 12px', fontSize: 12 }} />
                    </div>
                    <div style={{ display: 'grid', gap: 7, marginBottom: 14 }}>
                      <label style={{ fontSize: 11, color: 'oklch(52% .035 151)', fontWeight: 600 }}>Last name *</label>
                      <input placeholder="Otieno" value={last} onChange={e => setLast(e.target.value)} style={{ height: 46, width: '100%', background: 'oklch(99% .008 91)', border: '1px solid oklch(85% .035 91)', borderRadius: 11, padding: '0 12px', fontSize: 12 }} />
                    </div>
                    <div style={{ display: 'grid', gap: 7, marginBottom: 14, gridColumn: '1/-1' }}>
                      <label style={{ fontSize: 11, color: 'oklch(52% .035 151)', fontWeight: 600 }}>Username *</label>
                      <input placeholder="@username" value={username} onChange={e => setUsername(e.target.value)} style={{ height: 46, width: '100%', background: 'oklch(99% .008 91)', border: '1px solid oklch(85% .035 91)', borderRadius: 11, padding: '0 12px', fontSize: 12 }} />
                    </div>
                    <div style={{ display: 'grid', gap: 7, marginBottom: 14, gridColumn: '1/-1' }}>
                      <label style={{ fontSize: 11, color: 'oklch(52% .035 151)', fontWeight: 600 }}>Email address *</label>
                      <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} style={{ height: 46, width: '100%', background: 'oklch(99% .008 91)', border: '1px solid oklch(85% .035 91)', borderRadius: 11, padding: '0 12px', fontSize: 12 }} />
                    </div>
                    <div style={{ display: 'grid', gap: 7, marginBottom: 14 }}>
                      <label style={{ fontSize: 11, color: 'oklch(52% .035 151)', fontWeight: 600 }}>Phone number *</label>
                      <input type="tel" placeholder="07xx xxx xxx" value={phone} onChange={e => setPhone(e.target.value)} style={{ height: 46, width: '100%', background: 'oklch(99% .008 91)', border: '1px solid oklch(85% .035 91)', borderRadius: 11, padding: '0 12px', fontSize: 12 }} />
                    </div>
                    <div style={{ display: 'grid', gap: 7, marginBottom: 14 }}>
                      <label style={{ fontSize: 11, color: 'oklch(52% .035 151)', fontWeight: 600 }}>Preferred language *</label>
                      <select value={language} onChange={e => setLanguage(e.target.value)} style={{ height: 46, width: '100%', background: 'oklch(99% .008 91)', border: '1px solid oklch(85% .035 91)', borderRadius: 11, padding: '0 12px', fontSize: 12 }}>
                        <option value="">Choose one</option>
                        <option value="en">English</option>
                        <option value="sw">Kiswahili</option>
                        <option value="both">English and Kiswahili</option>
                      </select>
                    </div>
                    <div style={{ display: 'grid', gap: 7, marginBottom: 14 }}>
                      <label style={{ fontSize: 11, color: 'oklch(52% .035 151)', fontWeight: 600 }}>Password *</label>
                      <div style={{ position: 'relative' }}>
                        <input type="password" placeholder="8+ characters" value={password} onChange={e => setPassword(e.target.value)} style={{ height: 46, width: '100%', background: 'oklch(99% .008 91)', border: '1px solid oklch(85% .035 91)', borderRadius: 11, padding: '0 42px 0 12px', fontSize: 12 }} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gap: 7, marginBottom: 14 }}>
                      <label style={{ fontSize: 11, color: 'oklch(52% .035 151)', fontWeight: 600 }}>Confirm password *</label>
                      <input type="password" placeholder="Repeat password" value={confirm} onChange={e => setConfirm(e.target.value)} style={{ height: 46, width: '100%', background: 'oklch(99% .008 91)', border: '1px solid oklch(85% .035 91)', borderRadius: 11, padding: '0 12px', fontSize: 12 }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Place & Services */}
              {step === 2 && (
                <div style={{ animation: 'rise .3s ease' }}>
                  <h3 style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-.03em', margin: '0 0 15px' }}>2. Your place and service needs</h3>
                  <div className="auth-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
                    <div style={{ display: 'grid', gap: 7, marginBottom: 14 }}>
                      <label style={{ fontSize: 11, color: 'oklch(52% .035 151)', fontWeight: 600 }}>County *</label>
                      <select value={county} onChange={e => setCounty(e.target.value)} style={{ height: 46, width: '100%', background: 'oklch(99% .008 91)', border: '1px solid oklch(85% .035 91)', borderRadius: 11, padding: '0 12px', fontSize: 12 }}>
                        <option value="">Choose county</option>
                        {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'grid', gap: 7, marginBottom: 14 }}>
                      <label style={{ fontSize: 11, color: 'oklch(52% .035 151)', fontWeight: 600 }}>Town or area</label>
                      <input placeholder="Westlands, Eldoret..." value={area} onChange={e => setArea(e.target.value)} style={{ height: 46, width: '100%', background: 'oklch(99% .008 91)', border: '1px solid oklch(85% .035 91)', borderRadius: 11, padding: '0 12px', fontSize: 12 }} />
                    </div>
                    <div style={{ display: 'grid', gap: 7, marginBottom: 14, gridColumn: '1/-1' }}>
                      <label style={{ fontSize: 11, color: 'oklch(52% .035 151)', fontWeight: 600 }}>Your role *</label>
                      <select value={role} onChange={e => setRole(e.target.value)} style={{ height: 46, width: '100%', background: 'oklch(99% .008 91)', border: '1px solid oklch(85% .035 91)', borderRadius: 11, padding: '0 12px', fontSize: 12 }}>
                        <option value="">Choose your role</option>
                        <option value="general">General member</option>
                        <option value="student">Student</option>
                        <option value="parent">Parent or guardian</option>
                        <option value="professional">Professional or mentor</option>
                        <option value="moderator">Community moderator</option>
                      </select>
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label style={{ fontSize: 11, color: 'oklch(52% .035 151)', fontWeight: 600, display: 'block', marginBottom: 7 }}>What service do you want from Kikwetu? Pick all that fit.</label>
                      <div className="auth-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                        {SERVICES.map(s => (
                          <button key={s.id} type="button" onClick={() => toggleService(s.id)}
                            style={{ minHeight: 78, textAlign: 'left', background: services.includes(s.id) ? 'oklch(93% .07 84)' : 'oklch(99% .008 91)', border: `1px solid ${services.includes(s.id) ? 'oklch(72% .15 84)' : 'oklch(85% .035 91)'}`, borderRadius: 13, padding: 11, cursor: 'pointer', transition: 'transform .2s ease,border-color .2s ease' }}>
                            <span style={{ fontSize: 20, display: 'block', marginBottom: 8 }}>{s.icon}</span>
                            <strong style={{ display: 'block', fontSize: 11 }}>{s.label}</strong>
                            <small style={{ display: 'block', color: 'oklch(52% .035 151)', fontSize: 10, marginTop: 4 }}>{s.desc}</small>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Interests & Preferences */}
              {step === 3 && (
                <div style={{ animation: 'rise .3s ease' }}>
                  <h3 style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-.03em', margin: '0 0 15px' }}>3. Your interests and preferences</h3>
                  <div className="auth-grid-2" style={{ display: 'grid', gap: 13 }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'oklch(52% .035 151)', fontWeight: 600, display: 'block', marginBottom: 7 }}>Topics to follow</label>
                      <div className="auth-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                        {TOPICS.map(t => (
                          <button key={t.id} type="button" onClick={() => toggleTopic(t.id)}
                            style={{ minHeight: 78, textAlign: 'left', background: topics.includes(t.id) ? 'oklch(93% .07 84)' : 'oklch(99% .008 91)', border: `1px solid ${topics.includes(t.id) ? 'oklch(72% .15 84)' : 'oklch(85% .035 91)'}`, borderRadius: 13, padding: 11, cursor: 'pointer' }}>
                            <span style={{ fontSize: 20, display: 'block', marginBottom: 8 }}>{t.icon}</span>
                            <strong style={{ display: 'block', fontSize: 11 }}>{t.label}</strong>
                            <small style={{ display: 'block', color: 'oklch(52% .035 151)', fontSize: 10, marginTop: 4 }}>{t.desc}</small>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gap: 7, marginBottom: 14 }}>
                      <label style={{ fontSize: 11, color: 'oklch(52% .035 151)', fontWeight: 600 }}>Short bio <span style={{ color: 'oklch(72% .025 151)' }}>(optional)</span></label>
                      <textarea placeholder="What are you building, learning, or known for?" value={bio} onChange={e => setBio(e.target.value)} rows={3}
                        style={{ width: '100%', background: 'oklch(99% .008 91)', border: '1px solid oklch(85% .035 91)', borderRadius: 11, padding: 12, fontSize: 12, resize: 'vertical' }} />
                    </div>
                    <div className="auth-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
                      <div style={{ display: 'grid', gap: 7, marginBottom: 14 }}>
                        <label style={{ fontSize: 11, color: 'oklch(52% .035 151)', fontWeight: 600 }}>Notifications</label>
                        <select value={notifPref} onChange={e => setNotifPref(e.target.value)} style={{ height: 46, width: '100%', background: 'oklch(99% .008 91)', border: '1px solid oklch(85% .035 91)', borderRadius: 11, padding: '0 12px', fontSize: 12 }}>
                          <option value="important">Important updates only</option>
                          <option value="replies">Replies and mentions</option>
                          <option value="all">Everything useful</option>
                        </select>
                      </div>
                      <div style={{ display: 'grid', gap: 7, marginBottom: 14 }}>
                        <label style={{ fontSize: 11, color: 'oklch(52% .035 151)', fontWeight: 600 }}>Profile visibility</label>
                        <select value={visibility} onChange={e => setVisibility(e.target.value)} style={{ height: 46, width: '100%', background: 'oklch(99% .008 91)', border: '1px solid oklch(85% .035 91)', borderRadius: 11, padding: '0 12px', fontSize: 12 }}>
                          <option value="public">Public to members</option>
                          <option value="followers">Only people I follow</option>
                        </select>
                      </div>
                    </div>
                    <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: 'oklch(52% .035 151)', fontSize: 11, lineHeight: 1.45 }}>
                      <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} style={{ marginTop: 3, accentColor: 'oklch(52% .14 151)' }} />
                      <span>I agree to the Community Guidelines, Terms, and Privacy Policy. *</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Navigation buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 22 }}>
                {step > 1 ? (
                  <button onClick={() => { setStep(s => s - 1); window.scrollTo(0, 0) }} style={{ minHeight: 46, borderRadius: 11, padding: '0 15px', background: 'oklch(99% .008 91)', border: '1px solid oklch(85% .035 91)', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    ← Back
                  </button>
                ) : <div />}
                <button onClick={handleNext} disabled={loading} style={{ minHeight: 46, borderRadius: 11, padding: '0 15px', background: 'oklch(72% .15 84)', color: 'oklch(16% .035 151)', border: 0, cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 7, opacity: loading ? .5 : 1 }}>
                  {loading ? <span style={{ width: 16, height: 16, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin .6s linear infinite' }} /> : null}
                  {step === 3 ? 'Create my account ↗' : 'Continue ↗'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Toast */}
      {toastMsg && (
        <div style={{ position: 'fixed', zIndex: 10, left: '50%', bottom: 20, transform: 'translate(-50%,0)', background: 'oklch(16% .035 151)', color: 'oklch(95% .012 91)', padding: '12px 15px', borderRadius: 10, fontSize: 11, fontWeight: 700, transition: 'opacity .25s ease,transform .25s ease' }}>
          {toastMsg}
        </div>
      )}

      <style>{`
        @keyframes rise { from { opacity: 0; transform: translateY(9px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes spin { to { transform: rotate(360deg) } }
        @media(max-width:850px) {
          .shell { grid-template-columns: 1fr !important }
          .story { min-height: 260px !important; padding: 20px !important }
          .auth-grid-2 { grid-template-columns: 1fr !important }
          .auth-main { padding: 20px 16px !important }
        }
      `}</style>
    </div>
  )
}
