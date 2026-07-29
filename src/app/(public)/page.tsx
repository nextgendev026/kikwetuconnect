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
    <div className="min-h-screen bg-cream overflow-hidden">

      <header className="h-[74px] px-[clamp(18px,5vw,76px)] flex items-center justify-between relative z-[2]">
        <Link href="/" className="flex items-center gap-[10px] text-ink no-underline animate-slide-in-left">
          <div className="w-[36px] h-[36px] rounded-[12px] bg-gold grid place-items-center font-extrabold text-night text-[18px] -rotate-[8deg] animate-float-slow" style={{ fontFamily: "'Plus Jakarta Sans'" }}>K</div>
          <div><b style={{ fontFamily: "'Plus Jakarta Sans'", letterSpacing: '-.05em' }}>KikwetuConnect</b><small className="block text-[9px] tracking-[.14em] uppercase text-muted">Tuko pamoja</small></div>
        </Link>
        <nav className="hidden md:flex gap-[26px] items-center">
          <a href="#why" className="text-[13px] text-muted no-underline hover:text-ink transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-gold after:transition-all hover:after:w-full">Why Kikwetu</a>
          <a href="#spaces" className="text-[13px] text-muted no-underline hover:text-ink transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-gold after:transition-all hover:after:w-full">Spaces</a>
          <a href="#professionals" className="text-[13px] text-muted no-underline hover:text-ink transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-gold after:transition-all hover:after:w-full">Professionals</a>
        </nav>
        <div className="flex gap-[8px]">
          <Link href="/login" className="min-h-[40px] rounded-[12px] px-[17px] inline-flex items-center font-bold text-[13px] bg-transparent text-ink border border-line hover:bg-surface hover:border-gold/50 transition-all">Log in</Link>
          <Link href="/signup" className="min-h-[46px] rounded-[12px] px-[17px] inline-flex items-center gap-[8px] font-bold text-[13px] bg-night text-cream hover:bg-ink hover:scale-[1.02] transition-all btn-shimmer">Join Kikwetu <span className="animate-bounce">↗</span></Link>
        </div>
      </header>

      <section className="min-h-[calc(100vh-74px)] grid lg:grid-cols-[1.02fr_.98fr] gap-[40px] px-[clamp(18px,8vw,126px)] py-[clamp(46px,9vw,120px)] pb-[76px] relative bg-mesh-gradient">
        {/* Animated background blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute w-[400px] h-[400px] rounded-full bg-green/10 top-[10%] left-[5%] blur-[120px] blob-1"></div>
          <div className="absolute w-[350px] h-[350px] rounded-full bg-gold/10 top-[20%] right-[8%] blur-[120px] blob-2"></div>
          <div className="absolute w-[300px] h-[300px] rounded-full bg-green/8 bottom-[15%] left-[10%] blur-[100px] blob-3"></div>
          <div className="absolute w-[250px] h-[250px] rounded-full bg-gold/8 bottom-[10%] right-[15%] blur-[100px] animate-float-reverse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative z-[1] max-w-[590px] self-center">
          <div className="inline-flex items-center gap-[8px] text-green text-[11px] tracking-[.14em] uppercase font-extrabold mb-[20px] animate-fade-in-up">
            <span className="w-[28px] h-[2px] bg-gold animate-pulse-soft"></span>Kenya's knowledge circle
          </div>
          <h1 className="text-[clamp(3.2rem,7vw,6.3rem)] leading-[.96] tracking-[-.08em] text-night m-0 mb-[25px] animate-fade-in-up delay-100" style={{ fontFamily: "'Plus Jakarta Sans'" }}>Good questions deserve a home.</h1>
          <p className="max-w-[54ch] text-[oklch(38%_.03_151)] text-[clamp(1rem,1.5vw,1.2rem)] leading-[1.65] m-0 mb-[30px] animate-fade-in-up delay-200">KikwetuConnect brings local knowledge, trusted people, and useful opportunities into one warm, multilingual community.</p>
          <div className="flex gap-[10px] flex-wrap animate-fade-in-up delay-300">
            <Link href="/signup" className="min-h-[46px] rounded-[12px] px-[17px] inline-flex items-center gap-[8px] font-bold text-[13px] bg-gold text-night no-underline hover:shadow-[0_10px_30px_-5px_oklch(65%_.15_85)] hover:-translate-y-1 transition-all">Join Kikwetu <span>↗</span></Link>
            <Link href="/feed" className="min-h-[46px] rounded-[12px] px-[17px] inline-flex items-center font-bold text-[13px] bg-cream text-night border border-[oklch(90%_.03_91)] hover:border-green/50 hover:bg-cream/80 transition-all no-underline">Explore the community</Link>
          </div>
          <div className="flex items-center gap-[12px] mt-[38px] text-muted text-[12px] animate-fade-in-up delay-400">
<div className="flex">
              {['AK','JM','WN','IM'].map((x,i) => {
                const delay = `${500 + i * 100}ms`
                return (
                  <div key={i} className={`w-[31px] h-[31px] rounded-full grid place-items-center border-[3px] border-cream -ml-[8px] first:ml-0 text-[10px] font-extrabold text-gold ${i===0?'bg-earth':i===1?'bg-green':i===2?'bg-[oklch(35%_.09_230)]':'bg-[oklch(43%_.08_28)]'} animate-scale-in`} style={{ animationDelay: delay }}>{x}</div>
                )
              })}
            </div>
            <span><strong className="text-ink">12,800+</strong> people learning and sharing across Kenya</span>
          </div>
        </div>

        <div className="relative z-[1] self-center min-h-[520px] grid place-items-center">
          <div className="absolute w-[260px] h-[260px] rounded-full bg-gradient-to-br from-gold/30 to-gold/10 right-[13%] top-[4%]" style={{ boxShadow: '0 0 0 18px oklch(75% .14 84 / .12),0 0 0 40px oklch(75% .14 84 / .07)' }}></div>
          <div className="absolute bottom-[9%] w-[110%] h-[42%] bg-gradient-to-tr from-green/20 to-green/5 rounded-[52%_52%_0_0/35%_35%_0_0] -rotate-[6deg] animate-float-reverse"></div>
          <div className="absolute bottom-[2%] right-[-11%] w-[95%] h-[31%] bg-gradient-to-tl from-earth/30 to-earth/5 rounded-[52%_52%_0_0/35%_35%_0_0] rotate-[7deg] opacity-88 animate-float-slow" style={{ animationDelay: '1s' }}></div>
          
          <div className="absolute z-[2] bottom-[4%] left-[22%] w-[min(270px,70%)] aspect-[9/18] border-[8px] border-night rounded-[31px] bg-night2 overflow-hidden -rotate-[7deg] hero-illustration" style={{ boxShadow: '20px 25px 50px oklch(20% .02 151 / .28)' }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[93px] h-[22px] rounded-[0_0_14px_14px] bg-night z-[2]"></div>
            <div className="p-[30px_13px_12px] text-cream">
              <small className="text-gold text-[9px]">Baraza · For you</small>
              <h3 className="text-[19px] tracking-[-.06em] my-[8px_14px]" style={{ fontFamily: "'Plus Jakarta Sans'" }}>What are you learning today?</h3>
              <div className="bg-deep border border-[oklch(35%_.03_151)] rounded-[12px] p-[10px] mb-[8px]">
                <div className="text-[10px] text-gold">AGNES KIPLAGAT ✓</div>
                <div className="h-[6px] bg-[oklch(55%_.03_151)] rounded-[5px] my-[6px] w-[85%]"></div>
                <div className="h-[6px] bg-[oklch(55%_.03_151)] rounded-[5px] my-[6px] w-[56%]"></div>
                <div className="h-[6px] bg-gold rounded-[5px] w-[40%]"></div>
              </div>
              <div className="bg-deep border border-[oklch(35%_.03_151)] rounded-[12px] p-[10px]">
                <div className="text-[10px] text-gold">NAIROBI TECH WEEK</div>
                <div className="h-[6px] bg-[oklch(55%_.03_151)] rounded-[5px] my-[6px] w-[85%]"></div>
                <div className="h-[6px] bg-[oklch(55%_.03_151)] rounded-[5px] my-[6px] w-[56%]"></div>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-[43px] bg-night flex items-center justify-around text-muted text-[14px]">
              <b className="text-gold">⌂</b><span>⌕</span><span>＋</span><span>♡</span><span>◉</span>
            </div>
          </div>
        </div>
      </section>

      <section id="why" className="px-[clamp(18px,8vw,126px)] py-[96px] bg-night text-cream relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute w-[500px] h-[500px] rounded-full bg-green/5 top-[-50%] left-[-10%] blur-[150px] animate-pulse-soft"></div>
          <div className="absolute w-[400px] h-[400px] rounded-full bg-gold/3 bottom-[-50%] right-[-10%] blur-[150px] animate-pulse-soft" style={{ animationDelay: '3s' }}></div>
        </div>
        <div className="flex justify-between items-end gap-[20px] mb-[36px] relative animate-fade-in-up">
          <h2 className="text-[clamp(2rem,4vw,3.3rem)] leading-[1] tracking-[-.07em] m-0" style={{ fontFamily: "'Plus Jakarta Sans'" }}>Made for the way Kenya talks, learns, and builds.</h2>
          <p className="max-w-[42ch] text-muted leading-[1.6] m-0 hidden md:block">Not another noisy feed. A practical circle for questions, advice, local opportunity, and the people who make the context clear.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[1px] border border-line relative">
          {[
            { num: '01 / BARAZA', title: 'Share what matters.', desc: 'Post a thought, question, poll, photo, video, or audio note. Translate it without losing the local meaning.', gold: true, icon: '💬' },
            { num: '02 / HESHIMA', title: 'Trust has a signal.', desc: 'Helpful answers build Heshima. Verified professionals show their work, language, county, and availability.', gold: false, icon: '⭐' },
            { num: '03 / KWAO', title: 'Useful starts nearby.', desc: 'Find county spaces, local sellers, neighbourhood updates, quizzes, and guidance that fits your real life.', gold: false, icon: '📍' },
          ].map((f,i) => (
            <div key={i} className={`p-[25px] min-h-[220px] ${f.gold ? 'bg-gradient-to-br from-gold to-gold/90 text-night' : 'bg-gradient-to-br from-night2 to-night'} feature-card group`}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl animate-float-slow" style={{ animationDelay: `${i * 0.5}s` }}>{f.icon}</span>
                <div className="text-[12px] text-green mb-[0] font-extrabold tracking-wider">{f.num}</div>
              </div>
              <h3 className="text-[19px] tracking-[-.04em] m-0 mb-[9px]" style={{ fontFamily: "'Plus Jakarta Sans'" }}>{f.title}</h3>
              <p className={`text-[13px] leading-[1.55] m-0 max-w-[28ch] ${f.gold ? 'text-[oklch(35%_.06_84)]' : 'text-muted'}`}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="spaces" className="px-[clamp(18px,8vw,126px)] py-[96px] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute w-[600px] h-[600px] rounded-full bg-green/3 top-[-100%] right-[-10%] blur-[200px] animate-drift"></div>
          <div className="absolute w-[400px] h-[400px] rounded-full bg-gold/4 bottom-[-50%] left-[-10%] blur-[150px] animate-float-reverse"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.35fr] gap-[70px] items-center">
          <div className="relative animate-slide-in-left">
            <div className="inline-flex items-center gap-[8px] text-green text-[11px] tracking-[.14em] uppercase font-extrabold mb-[20px]">
              <span className="w-[28px] h-[2px] bg-gold animate-pulse-soft"></span>The circle is already moving
            </div>
            <h2 className="text-[clamp(2rem,4vw,3.5rem)] tracking-[-.07em] leading-[1.02] m-0 mb-[18px]" style={{ fontFamily: "'Plus Jakarta Sans'" }}>From Nairobi tech to Kitale soil health.</h2>
            <p className="text-muted leading-[1.65] max-w-[46ch]">Follow the conversations that feel close. Learn in English or Kiswahili today, with Sheng and more local language support on the way.</p>
            <Link href="/feed" className="mt-[18px] inline-flex min-h-[46px] rounded-[12px] px-[17px] items-center gap-[8px] font-bold text-[13px] bg-night text-cream no-underline hover:bg-ink hover:scale-[1.02] transition-all btn-shimmer">See what is happening <span className="animate-bounce">↗</span></Link>
          </div>
          <div className="grid grid-cols-2 gap-[12px]">
            {[
              { num: '47', label: 'counties represented', icon: '🇰🇪' },
              { num: '2.4k', label: 'questions answered', icon: '❓' },
              { num: '840', label: 'verified professionals', icon: '✅' },
              { num: '10%', label: 'clear platform fee', icon: '💰' },
            ].map((s,i) => (
              <div key={i} className="p-[20px] bg-gradient-to-br from-night2 to-night border border-[oklch(29%_.025_151)] rounded-[16px] stat-card group animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl animate-float-slow" style={{ animationDelay: `${i * 0.3}s` }}>{s.icon}</span>
                  <b className="text-[29px] tracking-[-.06em] text-gold" style={{ fontFamily: "'Plus Jakarta Sans'" }}>{s.num}</b>
                </div>
                <span className="block text-muted text-[11px] mt-[5px]">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="professionals" className="px-[clamp(18px,8vw,126px)] py-[96px] bg-night relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute w-[500px] h-[500px] rounded-full bg-gold/5 top-[-50%] left-[50%] transform -translate-x-1/2 blur-[150px] animate-pulse-soft"></div>
          <div className="absolute w-[300px] h-[300px] rounded-full bg-green/5 bottom-[-50%] left-[20%] blur-[100px] animate-drift"></div>
        </div>
        <span className="text-[62px] text-gold leading-[.45] block mb-[12px] animate-float-slow">"</span>
        <p className="text-[clamp(1.5rem,3vw,2.5rem)] leading-[1.2] tracking-[-.06em] max-w-[25ch] m-0 text-cream animate-fade-in-up" style={{ fontFamily: "'Plus Jakarta Sans'" }}>A good answer is not just information. It is someone helping you move.</p>
        <div className="mt-[32px] text-muted text-[12px] animate-fade-in-up delay-200">KikwetuConnect community principle</div>
      </section>

      <footer className="px-[clamp(18px,8vw,126px)] py-[35px] bg-night border-t border-[oklch(27%_.025_151)] flex flex-wrap justify-between gap-[20px] text-muted text-[11px]">
        <div>© 2026 KikwetuConnect · Tuko pamoja</div>
        <nav className="flex flex-wrap gap-x-[17px] gap-y-[4px]">
          <a href="/legal/terms" className="text-muted no-underline hover:text-cream transition-colors">Terms</a>
          <a href="/legal/privacy" className="text-muted no-underline hover:text-cream transition-colors">Privacy</a>
          <a href="/legal/community-guidelines" className="text-muted no-underline hover:text-cream transition-colors">Guidelines</a>
          <a href="/legal/about" className="text-muted no-underline hover:text-cream transition-colors">About</a>
          <a href="/baraza" className="text-muted no-underline hover:text-cream transition-colors">Barazas</a>
        </nav>
      </footer>
    </div>
  )
}