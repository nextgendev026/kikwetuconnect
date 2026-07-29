import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'KikwetuConnect | Tuko pamoja',
  description: "Kenya's local knowledge network. Come with what you know. 47 counties, multilingual by design.",
  openGraph: {
    title: 'KikwetuConnect | Kenya\'s Knowledge Circle',
    description: "Find useful people, ask better questions, and turn local context into real progress.",
    type: 'website',
    locale: 'en_KE',
    siteName: 'KikwetuConnect',
  },
}

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: 'oklch(97% .012 85)' }}>
      <style>{`
        .lp-header a { color: oklch(48% .035 151); text-decoration: none; font-size: 13px; transition: color .2s; }
        .lp-header a:hover { color: oklch(20% .04 151); }
        .lp-btn-outline { min-height:40px; border-radius:12px; padding:0 17px; display:inline-flex; align-items:center; font-weight:700; font-size:13px; background:transparent; color:oklch(16% .03 151); border:1px solid oklch(82% .025 85); text-decoration:none; transition:all .2s; }
        .lp-btn-outline:hover { background:oklch(100% .004 85); border-color:oklch(72% .15 84 / .5); }
        .lp-btn-primary { min-height:46px; border-radius:12px; padding:0 17px; display:inline-flex; align-items:center; gap:8px; font-weight:700; font-size:13px; background:oklch(16% .03 151); color:oklch(95% .012 91); text-decoration:none; transition:all .2s; }
        .lp-btn-primary:hover { background:oklch(20% .04 151); transform:scale(1.02); }
        .lp-btn-gold { min-height:46px; border-radius:12px; padding:0 17px; display:inline-flex; align-items:center; gap:8px; font-weight:700; font-size:13px; background:oklch(72% .15 84); color:oklch(16% .03 151); text-decoration:none; transition:all .2s; }
        .lp-btn-gold:hover { box-shadow:0 10px 30px -5px oklch(65% .15 85); transform:translateY(-4px); }
        .lp-btn-ghost { min-height:46px; border-radius:12px; padding:0 17px; display:inline-flex; align-items:center; font-weight:700; font-size:13px; background:oklch(97% .012 85); color:oklch(16% .03 151); border:1px solid oklch(90% .03 91); text-decoration:none; transition:all .2s; }
        .lp-btn-ghost:hover { border-color:oklch(52% .14 151 / .5); }
        .lp-footer a { color: oklch(48% .035 151); text-decoration: none; transition: color .2s; }
        .lp-footer a:hover { color: oklch(95% .012 91); }
        .lp-nav a { color: oklch(48% .035 151); text-decoration: none; font-size: 13px; transition: color .2s; position: relative; }
        .lp-nav a:hover { color: oklch(20% .04 151); }
        .lp-nav a::after { content:''; position:absolute; bottom:-4px; left:0; width:0; height:2px; background:oklch(72% .15 84); transition:width .2s; }
        .lp-nav a:hover::after { width:100%; }
        @media(max-width:768px) {
          .lp-hero { grid-template-columns:1fr !important; padding-bottom:50px !important; min-height:auto !important; }
          .lp-hero-text { max-width:100% !important; }
          .lp-hero-mockup { min-height:350px !important; }
          .lp-spaces { grid-template-columns:1fr !important; gap:30px !important; }
        }
      `}</style>

      <header style={{ height: 74, padding: '0 clamp(18px,5vw,76px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
        <Link href="/" className="flex items-center gap-[10px] no-underline" style={{ color: 'oklch(20% .04 151)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: 'oklch(72% .15 84)', display: 'grid', placeItems: 'center', fontWeight: 800, color: 'oklch(16% .03 151)', fontSize: 18, transform: 'rotate(-8deg)' }}>K</div>
          <div><b style={{ fontSize: 16, letterSpacing: '-.04em' }}>KikwetuConnect</b><small className="block text-[8px] tracking-[.14em] uppercase" style={{ color: 'oklch(48% .035 151)', marginTop: 1, opacity: 0.7 }}>Tuko pamoja</small></div>
        </Link>
        <nav className="hidden md:flex gap-[26px] items-center lp-nav">
          <a href="#why">Why Kikwetu</a>
          <a href="#spaces">Spaces</a>
          <a href="#professionals">Professionals</a>
        </nav>
        <div className="flex gap-[8px]">
          <Link href="/login" className="lp-btn-outline">Log in</Link>
          <Link href="/signup" className="lp-btn-primary">Join Kikwetu <span className="animate-bounce">↗</span></Link>
        </div>
      </header>

      <section className="lp-hero" style={{ minHeight: 'calc(100vh - 74px)', display: 'grid', gridTemplateColumns: '1.02fr .98fr', gap: 40, padding: 'clamp(46px,9vw,120px) clamp(18px,8vw,126px) 76px', position: 'relative' }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'oklch(52% .14 151 / .1)', top: '10%', left: '5%', filter: 'blur(120px)' }}></div>
          <div style={{ position: 'absolute', width: 350, height: 350, borderRadius: '50%', background: 'oklch(72% .15 84 / .1)', top: '20%', right: '8%', filter: 'blur(120px)' }}></div>
          <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'oklch(52% .14 151 / .08)', bottom: '15%', left: '10%', filter: 'blur(100px)' }}></div>
          <div style={{ position: 'absolute', width: 250, height: 250, borderRadius: '50%', background: 'oklch(72% .15 84 / .08)', bottom: '10%', right: '15%', filter: 'blur(100px)' }}></div>
        </div>

        <div className="lp-hero-text" style={{ position: 'relative', zIndex: 1, maxWidth: 590, alignSelf: 'center' }}>
          <div className="inline-flex items-center gap-[8px] mb-[20px]" style={{ color: 'oklch(52% .14 151)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', fontWeight: 800 }}>
            <span style={{ width: 28, height: 2, background: 'oklch(72% .15 84)' }}></span>Kenya's knowledge circle
          </div>
          <h1 style={{ fontSize: 'clamp(3.2rem,7vw,6.3rem)', lineHeight: .96, letterSpacing: '-.08em', color: 'oklch(16% .03 151)', margin: 0, marginBottom: 25, fontFamily: "'Plus Jakarta Sans'" }}>Good questions deserve a home.</h1>
          <p className="max-w-[54ch]" style={{ color: 'oklch(38% .03 151)', fontSize: 'clamp(1rem,1.5vw,1.2rem)', lineHeight: 1.65, margin: 0, marginBottom: 30 }}>KikwetuConnect brings local knowledge, trusted people, and useful opportunities into one warm, multilingual community.</p>
          <div className="flex gap-[10px] flex-wrap">
            <Link href="/signup" className="lp-btn-gold">Join Kikwetu <span>↗</span></Link>
            <Link href="/feed" className="lp-btn-ghost">Explore the community</Link>
          </div>
          <div className="flex items-center gap-[12px] mt-[38px]" style={{ color: 'oklch(48% .035 151)', fontSize: 12 }}>
            <div className="flex">
              {['AK','JM','WN','IM'].map((x,i) => {
                const colors = ['oklch(48% .1 55)', 'oklch(52% .14 151)', 'oklch(35% .09 230)', 'oklch(43% .08 28)']
                return (
                  <div key={i} style={{ width: 31, height: 31, borderRadius: '50%', display: 'grid', placeItems: 'center', border: '3px solid oklch(97% .012 85)', marginLeft: i === 0 ? 0 : -8, fontSize: 10, fontWeight: 800, color: 'oklch(72% .15 84)', background: colors[i] }}>{x}</div>
                )
              })}
            </div>
            <span><b style={{ color: 'oklch(20% .04 151)' }}>12,800+</b> people learning and sharing across Kenya</span>
          </div>
        </div>

        <div className="lp-hero-mockup" style={{ position: 'relative', zIndex: 1, alignSelf: 'center', minHeight: 520, display: 'grid', placeItems: 'center' }}>
          <div style={{ position: 'absolute', width: 260, height: 260, borderRadius: '50%', background: 'linear-gradient(135deg, oklch(72% .15 84 / .3), oklch(72% .15 84 / .1))', right: '13%', top: '4%', boxShadow: '0 0 0 18px oklch(75% .14 84 / .12), 0 0 0 40px oklch(75% .14 84 / .07)' }}></div>
          <div style={{ position: 'absolute', bottom: '9%', width: '110%', height: '42%', background: 'linear-gradient(135deg, oklch(52% .14 151 / .2), oklch(52% .14 151 / .05))', borderRadius: '52% 52% 0 0 / 35% 35% 0 0', transform: 'rotate(-6deg)' }}></div>
          <div style={{ position: 'absolute', bottom: '2%', right: '-11%', width: '95%', height: '31%', background: 'linear-gradient(135deg, oklch(48% .1 55 / .3), oklch(48% .1 55 / .05))', borderRadius: '52% 52% 0 0 / 35% 35% 0 0', transform: 'rotate(7deg)', opacity: .88 }}></div>
          
          <div style={{ position: 'absolute', zIndex: 2, bottom: '4%', left: '22%', width: 'min(270px,70%)', aspectRatio: '9/18', border: '8px solid oklch(16% .03 151)', borderRadius: 31, background: 'oklch(93% .02 85)', overflow: 'hidden', transform: 'rotate(-7deg)', boxShadow: '20px 25px 50px oklch(20% .02 151 / .28)' }}>
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 93, height: 22, borderRadius: '0 0 14px 14px', background: 'oklch(16% .03 151)', zIndex: 2 }}></div>
            <div style={{ padding: '30px 13px 12px', color: 'oklch(95% .012 91)' }}>
              <small style={{ color: 'oklch(72% .15 84)', fontSize: 9 }}>Baraza · For you</small>
              <h3 style={{ fontSize: 19, letterSpacing: '-.06em', margin: '8px 0 14px', fontFamily: "'Plus Jakarta Sans'" }}>What are you learning today?</h3>
              <div style={{ background: 'oklch(93% .02 85)', border: '1px solid oklch(35% .03 151)', borderRadius: 12, padding: 10, marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: 'oklch(72% .15 84)' }}>AGNES KIPLAGAT ✓</div>
                <div style={{ height: 6, background: 'oklch(55% .03 151)', borderRadius: 5, margin: '6px 0', width: '85%' }}></div>
                <div style={{ height: 6, background: 'oklch(55% .03 151)', borderRadius: 5, margin: '6px 0', width: '56%' }}></div>
                <div style={{ height: 6, background: 'oklch(72% .15 84)', borderRadius: 5, width: '40%' }}></div>
              </div>
              <div style={{ background: 'oklch(93% .02 85)', border: '1px solid oklch(35% .03 151)', borderRadius: 12, padding: 10 }}>
                <div style={{ fontSize: 10, color: 'oklch(72% .15 84)' }}>NAIROBI TECH WEEK</div>
                <div style={{ height: 6, background: 'oklch(55% .03 151)', borderRadius: 5, margin: '6px 0', width: '85%' }}></div>
                <div style={{ height: 6, background: 'oklch(55% .03 151)', borderRadius: 5, margin: '6px 0', width: '56%' }}></div>
              </div>
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 43, background: 'oklch(16% .03 151)', display: 'flex', alignItems: 'center', justifyContent: 'space-around', color: 'oklch(48% .035 151)', fontSize: 14 }}>
              <b style={{ color: 'oklch(72% .15 84)' }}>⌂</b><span>⌕</span><span>＋</span><span>♡</span><span>◉</span>
            </div>
          </div>
        </div>
      </section>

      <section id="why" style={{ padding: '96px clamp(18px,8vw,126px)', background: 'oklch(16% .03 151)', color: 'oklch(95% .012 91)', position: 'relative', overflow: 'hidden' }}>
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'oklch(52% .14 151 / .05)', top: '-50%', left: '-10%', filter: 'blur(150px)' }}></div>
          <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'oklch(72% .15 84 / .03)', bottom: '-50%', right: '-10%', filter: 'blur(150px)' }}></div>
        </div>
        <div className="flex justify-between items-end gap-[20px] mb-[36px] relative">
          <h2 style={{ fontSize: 'clamp(2rem,4vw,3.3rem)', lineHeight: 1, letterSpacing: '-.07em', margin: 0, fontFamily: "'Plus Jakarta Sans'" }}>Made for the way Kenya talks, learns, and builds.</h2>
          <p className="max-w-[42ch] leading-[1.6] m-0 hidden md:block" style={{ color: 'oklch(48% .035 151)' }}>Not another noisy feed. A practical circle for questions, advice, local opportunity, and the people who make the context clear.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 1, border: '1px solid oklch(82% .025 85)' }}>
          {[
            { num: '01 / BARAZA', title: 'Share what matters.', desc: 'Post a thought, question, poll, photo, video, or audio note. Translate it without losing the local meaning.', gold: true, icon: '💬' },
            { num: '02 / HESHIMA', title: 'Trust has a signal.', desc: 'Helpful answers build Heshima. Verified professionals show their work, language, county, and availability.', gold: false, icon: '⭐' },
            { num: '03 / KWAO', title: 'Useful starts nearby.', desc: 'Find county spaces, local sellers, neighbourhood updates, quizzes, and guidance that fits your real life.', gold: false, icon: '📍' },
          ].map((f,i) => (
            <div key={i} style={{ padding: 25, minHeight: 220, background: f.gold ? 'linear-gradient(135deg, oklch(72% .15 84), oklch(72% .15 84 / .9))' : 'linear-gradient(135deg, oklch(93% .02 85), oklch(16% .03 151))', color: f.gold ? 'oklch(16% .03 151)' : undefined }}>
              <div className="flex items-center gap-3 mb-4">
                <span style={{ fontSize: 30 }}>{f.icon}</span>
                <div style={{ color: 'oklch(52% .14 151)', fontSize: 12, fontWeight: 800, letterSpacing: 'wider' }}>{f.num}</div>
              </div>
              <h3 style={{ fontSize: 19, letterSpacing: '-.04em', margin: '0 0 9px', fontFamily: "'Plus Jakarta Sans'" }}>{f.title}</h3>
              <p className="max-w-[28ch]" style={{ fontSize: 13, lineHeight: 1.55, margin: 0, color: f.gold ? 'oklch(35% .06 84)' : 'oklch(48% .035 151)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="spaces" style={{ padding: '96px clamp(18px,8vw,126px)', position: 'relative', overflow: 'hidden' }}>
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'oklch(52% .14 151 / .03)', top: '-100%', right: '-10%', filter: 'blur(200px)' }}></div>
          <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'oklch(72% .15 84 / .04)', bottom: '-50%', left: '-10%', filter: 'blur(150px)' }}></div>
        </div>
        <div className="lp-spaces" style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr', gap: 70, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <div className="inline-flex items-center gap-[8px] mb-[20px]" style={{ color: 'oklch(52% .14 151)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', fontWeight: 800 }}>
              <span style={{ width: 28, height: 2, background: 'oklch(72% .15 84)' }}></span>The circle is already moving
            </div>
            <h2 style={{ fontSize: 'clamp(2rem,4vw,3.5rem)', letterSpacing: '-.07em', lineHeight: 1.02, margin: '0 0 18px', color: 'oklch(16% .03 151)', fontFamily: "'Plus Jakarta Sans'" }}>From Nairobi tech to Kitale soil health.</h2>
            <p className="max-w-[46ch] leading-[1.65]" style={{ color: 'oklch(48% .035 151)' }}>Follow the conversations that feel close. Learn in English or Kiswahili today, with Sheng and more local language support on the way.</p>
            <Link href="/feed" className="lp-btn-primary" style={{ marginTop: 18 }}>See what is happening <span className="animate-bounce">↗</span></Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { num: '47', label: 'counties represented', icon: '🇰🇪' },
              { num: '2.4k', label: 'questions answered', icon: '❓' },
              { num: '840', label: 'verified professionals', icon: '✅' },
              { num: '10%', label: 'clear platform fee', icon: '💰' },
            ].map((s,i) => (
              <div key={i} style={{ padding: 20, background: 'linear-gradient(135deg, oklch(93% .02 85), oklch(16% .03 151))', border: '1px solid oklch(82% .025 85)', borderRadius: 16 }}>
                <div className="flex items-center gap-2 mb-2">
                  <span style={{ fontSize: 24 }}>{s.icon}</span>
                  <b style={{ fontSize: 29, letterSpacing: '-.06em', color: 'oklch(72% .15 84)', fontFamily: "'Plus Jakarta Sans'" }}>{s.num}</b>
                </div>
                <span className="block mt-[5px]" style={{ color: 'oklch(48% .035 151)', fontSize: 11 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="professionals" style={{ padding: '96px clamp(18px,8vw,126px)', background: 'oklch(16% .03 151)', position: 'relative', overflow: 'hidden' }}>
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'oklch(72% .15 84 / .05)', top: '-50%', left: '50%', transform: 'translateX(-50%)', filter: 'blur(150px)' }}></div>
          <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'oklch(52% .14 151 / .05)', bottom: '-50%', left: '20%', filter: 'blur(100px)' }}></div>
        </div>
        <span style={{ fontSize: 62, color: 'oklch(72% .15 84)', lineHeight: .45, display: 'block', marginBottom: 12 }}>"</span>
        <p className="max-w-[25ch] m-0" style={{ fontSize: 'clamp(1.5rem,3vw,2.5rem)', lineHeight: 1.2, letterSpacing: '-.06em', color: 'oklch(95% .012 91)', fontFamily: "'Plus Jakarta Sans'" }}>A good answer is not just information. It is someone helping you move.</p>
        <div style={{ marginTop: 32, color: 'oklch(48% .035 151)', fontSize: 12 }}>KikwetuConnect community principle</div>
      </section>

      <footer className="lp-footer" style={{ padding: '35px clamp(18px,8vw,126px)', background: 'oklch(16% .03 151)', borderTop: '1px solid oklch(27% .025 151)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 20, color: 'oklch(48% .035 151)', fontSize: 11 }}>
        <div>© 2026 KikwetuConnect · Tuko pamoja</div>
        <nav className="flex flex-wrap gap-x-[17px] gap-y-[4px]">
          <a href="/legal/terms">Terms</a>
          <a href="/legal/privacy">Privacy</a>
          <a href="/legal/community-guidelines">Guidelines</a>
          <a href="/legal/about">About</a>
          <a href="/baraza">Barazas</a>
        </nav>
      </footer>
    </div>
  )
}
