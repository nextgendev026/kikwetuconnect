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
    <div className="lp-root">
      <header className="lp-header">
        <Link href="/" className="lp-brand" aria-label="KikwetuConnect home">
          <span className="lp-brand-mark" aria-hidden="true">K</span>
          <div className="lp-brand-text">
            <b>KikwetuConnect</b>
            <small>Tuko pamoja</small>
          </div>
        </Link>
        <nav className="lp-nav" aria-label="Main navigation">
          <a href="#why">Why Kikwetu</a>
          <a href="#spaces">Spaces</a>
          <a href="#experts">Experts</a>
        </nav>
        <div className="lp-header-actions">
          <Link href="/login" className="lp-btn lp-btn-outline">Log in</Link>
          <Link href="/signup" className="lp-btn lp-btn-primary">Join Kikwetu <span aria-hidden="true">↗</span></Link>
        </div>
      </header>

      <main>
        <section className="lp-hero" aria-labelledby="hero-title">
          <div className="lp-hero-bg" aria-hidden="true">
            <div className="lp-blob lp-blob-1"></div>
            <div className="lp-blob lp-blob-2"></div>
            <div className="lp-blob lp-blob-3"></div>
            <div className="lp-blob lp-blob-4"></div>
          </div>

          <div className="lp-hero-content">
            <div className="lp-eyebrow">
              <span className="lp-eyebrow-bar" aria-hidden="true"></span>
              Kenya's knowledge circle
            </div>
            <h1 id="hero-title">Good questions deserve a home.</h1>
            <p className="lp-lead">KikwetuConnect brings local knowledge, trusted people, and useful opportunities into one warm, multilingual community.</p>
            <div className="lp-hero-actions">
              <Link href="/signup" className="lp-btn lp-btn-gold">Join Kikwetu <span aria-hidden="true">↗</span></Link>
              <Link href="/feed" className="lp-btn lp-btn-ghost">Explore the community</Link>
            </div>
            <div className="lp-hero-stats">
              <div className="lp-avatars" aria-hidden="true">
                <span className="lp-avatar" style={{ background: 'var(--lp-avatar-1)' }}>AK</span>
                <span className="lp-avatar" style={{ background: 'var(--lp-avatar-2)' }}>JM</span>
                <span className="lp-avatar" style={{ background: 'var(--lp-avatar-3)' }}>WN</span>
                <span className="lp-avatar" style={{ background: 'var(--lp-avatar-4)' }}>IM</span>
              </div>
              <span><b>12,800+</b> people learning and sharing across Kenya</span>
            </div>
          </div>

          <div className="lp-hero-visual" aria-hidden="true">
            <div className="lp-mockup-frame">
              <div className="lp-mockup-header">
                <span className="lp-mockup-dots">
                  <span></span><span></span><span></span>
                </span>
                <span className="lp-mockup-title">Baraza · For you</span>
              </div>
              <div className="lp-mockup-card">
                <div className="lp-mockup-avatar">
                  <span className="lp-mockup-badge">✓</span>
                  <span>AGNES KIPLAGAT</span>
                </div>
                <div className="lp-mockup-progress">
                  <div style={{ width: '85%' }}></div>
                </div>
                <div className="lp-mockup-progress">
                  <div style={{ width: '56%' }}></div>
                </div>
                <div className="lp-mockup-progress lp-mockup-progress-gold">
                  <div style={{ width: '40%' }}></div>
                </div>
                <div className="lp-mockup-card lp-mockup-card-alt">
                  <div className="lp-mockup-event">NAIROBI TECH WEEK</div>
                  <div className="lp-mockup-progress">
                    <div style={{ width: '85%' }}></div>
                  </div>
                  <div className="lp-mockup-progress">
                    <div style={{ width: '56%' }}></div>
                  </div>
                </div>
                <div className="lp-mockup-nav">
                  <span aria-hidden="true">⌂</span>
                  <span aria-hidden="true">⌕</span>
                  <span aria-hidden="true">＋</span>
                  <span aria-hidden="true">♡</span>
                  <span aria-hidden="true">◉</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="why" className="lp-section lp-section-dark" aria-labelledby="why-title">
          <div className="lp-section-bg" aria-hidden="true">
            <div className="lp-blob lp-blob-5"></div>
            <div className="lp-blob lp-blob-6"></div>
          </div>
          <div className="lp-container">
            <div className="lp-section-header">
              <h2 id="why-title">Made for the way Kenya talks, learns, and builds.</h2>
              <p className="lp-section-desc">Not another noisy feed. A practical circle for questions, advice, local opportunity, and the people who make the context clear.</p>
            </div>
            <div className="lp-features">
              {[
                { num: '01 / BARAZA', title: 'Share what matters.', desc: 'Post a thought, question, poll, photo, video, or audio note. Translate it without losing the local meaning.', gold: true, icon: '💬' },
                { num: '02 / HESHIMA', title: 'Trust has a signal.', desc: 'Helpful answers build Heshima. Verified experts show their work, language, county, and availability.', gold: false, icon: '⭐' },
                { num: '03 / KWAO', title: 'Useful starts nearby.', desc: 'Find county spaces, local sellers, neighbourhood updates, quizzes, and guidance that fits your real life.', gold: false, icon: '📍' },
              ].map((f, i) => (
                <article key={i} className={`lp-feature ${f.gold ? 'lp-feature-gold' : ''}`}>
                  <div className="lp-feature-head">
                    <span className="lp-feature-icon" aria-hidden="true">{f.icon}</span>
                    <span className="lp-feature-num">{f.num}</span>
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="spaces" className="lp-section" aria-labelledby="spaces-title">
          <div className="lp-section-bg" aria-hidden="true">
            <div className="lp-blob lp-blob-7"></div>
            <div className="lp-blob lp-blob-8"></div>
          </div>
          <div className="lp-container lp-spaces-layout">
            <div>
              <div className="lp-eyebrow">
                <span className="lp-eyebrow-bar" aria-hidden="true"></span>
                The circle is already moving
              </div>
              <h2 id="spaces-title">From Nairobi tech to Kitale soil health.</h2>
              <p className="lp-section-desc">Follow the conversations that feel close. Learn in English or Kiswahili today, with Sheng and more local language support on the way.</p>
              <Link href="/feed" className="lp-btn lp-btn-primary">See what is happening <span aria-hidden="true">↗</span></Link>
            </div>
            <div className="lp-stats-grid">
              {[
                { num: '47', label: 'counties represented', icon: '🇰🇪' },
                { num: '2.4k', label: 'questions answered', icon: '❓' },
                { num: '840', label: 'verified experts', icon: '✅' },
                { num: '10%', label: 'clear platform fee', icon: '💰' },
              ].map((s, i) => (
                <div key={i} className="lp-stat-card">
                  <div className="lp-stat-head">
                    <span className="lp-stat-icon" aria-hidden="true">{s.icon}</span>
                    <b>{s.num}</b>
                  </div>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="experts" className="lp-section lp-section-dark lp-section-quote" aria-labelledby="experts-title">
          <div className="lp-section-bg" aria-hidden="true">
            <div className="lp-blob lp-blob-9"></div>
            <div className="lp-blob lp-blob-10"></div>
          </div>
          <div className="lp-container">
            <span className="lp-quote-mark" aria-hidden="true">"</span>
            <h2 id="experts-title">A good answer is not just information. It is someone helping you move.</h2>
            <p className="lp-section-desc">KikwetuConnect community principle</p>
          </div>
        </section>
      </main>

      <footer className="lp-footer" role="contentinfo">
        <p>© 2026 KikwetuConnect · Tuko pamoja</p>
        <nav aria-label="Footer navigation">
          <a href="/legal/terms">Terms</a>
          <a href="/legal/privacy">Privacy</a>
          <a href="/legal/community-guidelines">Guidelines</a>
          <a href="/legal/about">About</a>
          <Link href="/baraza">Barazas</Link>
        </nav>
      </footer>
    </div>
  )
}