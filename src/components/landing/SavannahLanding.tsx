'use client'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { LogIn, ArrowUpRight, Compass, MessageCircleQuestion, BadgeCheck, ShieldCheck, MapPin, X, Users, Landmark, BookOpen, CheckCircle2 } from 'lucide-react'

const steps = [
  {
    n: '01',
    icon: MapPin,
    title: 'Join with your county',
    body: 'Pick your county and the things you want to learn, share, or follow. Your circle starts where you are.',
  },
  {
    n: '02',
    icon: MessageCircleQuestion,
    title: 'Ask in your language',
    body: 'Post to your Baraza in English, Kiswahili, or Sheng. Ask without shrinking the question — deep dives, polls, and audio notes welcome.',
  },
  {
    n: '03',
    icon: CheckCircle2,
    title: 'Turn answers into action',
    body: 'Learn from people who have done the work, follow trusted voices, and keep your neighbourhood in the conversation.',
  },
]

const featureCards = [
  { icon: Landmark, title: '47 county circles', body: 'Local conversations from Nairobi to Turkana, each rooted in real local context.', href: '/baraza' },
  { icon: BadgeCheck, title: 'Approved experts', body: 'Verified professionals and trusted community voices, rated by Heshima trust.', href: '/experts' },
  { icon: ShieldCheck, title: 'Safe, local spaces', body: 'Nyumba Kumi, Mtaa Exchange, and local spaces that keep the neighbourhood close.', href: '/spaces' },
  { icon: Users, title: 'People with context', body: 'Find useful people — mentors, professionals, and neighbours who have done the work.', href: '/professionals' },
  { icon: BookOpen, title: 'Learn as you go', body: 'Quizzes, sessions, and guided content that turn local knowledge into progress.', href: '/quizzes' },
  { icon: Compass, title: 'Explore the community', body: 'Discover spaces, topics, and conversations across Kenya\'s knowledge network.', href: '/explore' },
]

export default function SavannahLanding() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    window.clearTimeout((showToast as any)._t)
    ;(showToast as any)._t = window.setTimeout(() => setToast(''), 2200)
  }

  return (
    <div className="sav-page">
      <div className="sav-hero-zone">
        <div className="sav-scene" aria-hidden="true">
          <div className="sav-sky-haze"></div>
          <div className="sav-sun"></div>
          <div className="sav-mountains"></div>
          <div className="sav-ground"></div>
          <div className="sav-acacia sav-acacia-one"><span className="sav-canopy"></span><span className="sav-branch"></span><span className="sav-trunk"></span></div>
          <div className="sav-acacia sav-acacia-two"><span className="sav-canopy"></span><span className="sav-branch"></span><span className="sav-trunk"></span></div>
          <div className="sav-grass sav-grass-one"></div>
          <div className="sav-grass sav-grass-two"></div>
          <div className="sav-bird sav-bird-one"></div>
          <div className="sav-bird sav-bird-two"></div>
        </div>

        <header className="sav-header">
          <Link href="/" className="sav-brand" aria-label="KikwetuConnect — home">
            <span className="sav-mark">k</span>
            <span className="sav-brand-name">kikwetu<span>.</span></span>
          </Link>
          <nav className="sav-nav" aria-label="Main navigation">
            <a href="#why">Why Kikwetu</a>
            <a href="#features">Features</a>
            <a href="#community">Community</a>
            <a href="#how">How it works</a>
            <Link href="/login" className="sav-nav-button" aria-label="Sign in">
              <LogIn className="sav-icon-sm" aria-hidden="true" />
              Sign in
            </Link>
          </nav>
        </header>

        <main className="sav-hero">
          <section className="sav-copy" id="why">
            <div className="sav-eyebrow">Kenya, in conversation</div>
            <h1 className="sav-serif">Our place.<br /><span>Our voice.</span></h1>
            <p>KikwetuConnect brings local knowledge, trusted people, and useful community action into one place. Ask a better question, learn from someone who has done the work, and keep your county in the conversation.</p>
            <div className="sav-actions">
              <Link href="/signup" className="sav-btn sav-btn-primary" id="savJoin">
                <ArrowUpRight className="sav-icon-sm" aria-hidden="true" />
                Join Kikwetu
              </Link>
              <Link href="/feed" className="sav-btn sav-btn-secondary" id="savExplore">
                <Compass className="sav-icon-sm" aria-hidden="true" />
                Explore the community
              </Link>
            </div>
            <div className="sav-fine-print">English · Kiswahili · Sheng curious · built for all 47 counties</div>
          </section>

          <aside className="sav-signal" id="features">
            <div className="sav-signal-card">
              <div className="sav-eyebrow">The Kikwetu signal</div>
              <h2 className="sav-serif">Useful feels local.</h2>
              <p>Global platforms give you noise. Kikwetu gives context.</p>
              <div className="sav-signal-list">
                <div className="sav-signal-row">
                  <span className="sav-signal-icon"><MessageCircleQuestion className="sav-icon-sm" aria-hidden="true" /></span>
                  <div><strong>Ask without shrinking the question</strong><span>Baraza posts, deep dives, polls, and audio notes</span></div>
                </div>
                <div className="sav-signal-row">
                  <span className="sav-signal-icon"><BadgeCheck className="sav-icon-sm" aria-hidden="true" /></span>
                  <div><strong>Find people with real context</strong><span>Approved professionals and trusted community voices</span></div>
                </div>
                <div className="sav-signal-row">
                  <span className="sav-signal-icon"><ShieldCheck className="sav-icon-sm" aria-hidden="true" /></span>
                  <div><strong>Keep the neighbourhood close</strong><span>Nyumba Kumi, Mtaa Exchange, and local spaces</span></div>
                </div>
              </div>
            </div>
          </aside>
        </main>

        <div className="sav-floating-note"><MapPin className="sav-icon-sm" aria-hidden="true" />From Nairobi to Turkana</div>

        <section className="sav-strip" id="community">
          <div className="sav-value"><strong>47 counties</strong><span>One local knowledge network</span></div>
          <div className="sav-value"><strong>Useful by design</strong><span>Answers, guidance, and community trust</span></div>
          <div className="sav-value"><strong>Built for Kenya</strong><span>Context before clicks</span></div>
        </section>
      </div>

      {/* How it works */}
      <section className="sav-how" id="how">
        <div className="sav-how-inner">
          <div className="sav-eyebrow sav-eyebrow-dark">How KikwetuConnect works</div>
          <h2>From question to progress in three steps.</h2>
          <p className="sav-how-lede">KikwetuConnect turns local knowledge into real progress — in your language, in your county, on your terms.</p>
          <div className="sav-step-grid">
            {steps.map((s) => (
              <div key={s.n} className="sav-step-card">
                <span className="sav-step-num">{s.n}</span>
                <s.icon className="sav-icon-md" aria-hidden="true" />
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="sav-features" id="what">
        <div className="sav-how-inner">
          <div className="sav-eyebrow sav-eyebrow-dark">Everything in one circle</div>
          <h2>Kenya&rsquo;s knowledge network, together.</h2>
          <p className="sav-how-lede">Counties, experts, spaces, and learners — one connected community built on Heshima trust.</p>
          <div className="sav-feature-grid">
            {featureCards.map((f) => (
              <Link key={f.title} href={f.href} className="sav-feature-card">
                <f.icon className="sav-icon-md" aria-hidden="true" />
                <h3>{f.title}</h3>
                <p>{f.body}</p>
                <span className="sav-feature-go">Explore <ArrowUpRight className="sav-icon-sm" aria-hidden="true" /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Community CTA */}
      <section className="sav-cta" id="community-cta">
        <div className="sav-how-inner sav-cta-inner">
          <div className="sav-eyebrow sav-eyebrow-dark">Tuko pamoja</div>
          <h2>Come with what you know.</h2>
          <p className="sav-how-lede">A good answer is someone helping you move. Join KikwetuConnect and keep your county in the conversation.</p>
          <div className="sav-actions sav-cta-actions">
            <Link href="/signup" className="sav-btn sav-btn-primary">
              <ArrowUpRight className="sav-icon-sm" aria-hidden="true" />
              Join Kikwetu
            </Link>
            <Link href="/feed" className="sav-btn sav-btn-secondary">
              <Compass className="sav-icon-sm" aria-hidden="true" />
              Explore the community
            </Link>
          </div>
        </div>
      </section>

      <footer className="sav-footer" role="contentinfo">
        <div className="sav-footer-grid">
          <div className="sav-footer-brand">
            <Link href="/" className="sav-brand" aria-label="KikwetuConnect — home">
              <span className="sav-mark">k</span>
              <span className="sav-brand-name">kikwetu<span>.</span></span>
            </Link>
            <p>Kenya, in conversation. Local knowledge, trusted people, and useful community action — all 47 counties, one network.</p>
          </div>
          <div className="sav-footer-col">
            <h4>Community</h4>
            <Link href="/baraza">Barazas</Link>
            <Link href="/explore">Explore</Link>
            <Link href="/spaces">Spaces</Link>
            <Link href="/topics">Topics</Link>
          </div>
          <div className="sav-footer-col">
            <h4>People</h4>
            <Link href="/experts">Experts</Link>
            <Link href="/professionals">Professionals</Link>
            <Link href="/feed">Feed</Link>
            <Link href="/market">Mtaa Exchange</Link>
          </div>
          <div className="sav-footer-col">
            <h4>Company</h4>
            <Link href="/legal/about">About</Link>
            <Link href="/legal/community-guidelines">Community Guidelines</Link>
            <Link href="/legal/terms">Terms</Link>
            <Link href="/legal/privacy">Privacy</Link>
          </div>
        </div>
        <div className="sav-footer-bottom">
          <p>© 2026 KikwetuConnect · Tuko pamoja · English · Kiswahili · Sheng</p>
        </div>
      </footer>

      <dialog ref={dialogRef} className="sav-dialog" aria-label="Join Kikwetu">
        <div className="sav-dialog-inner">
          <div className="sav-dialog-head">
            <div>
              <div className="sav-eyebrow">Join Kikwetu</div>
              <h2 className="sav-serif">Start with where you are.</h2>
            </div>
            <button className="sav-dialog-close" onClick={() => dialogRef.current?.close()} aria-label="Close">
              <X className="sav-icon-sm" aria-hidden="true" />
            </button>
          </div>
          <p className="sav-dialog-copy">Choose a county and the things you want to learn, share, or follow. You can change this later.</p>
          <form
            className="sav-dialog-form"
            onSubmit={(e) => {
              e.preventDefault()
              dialogRef.current?.close()
              showToast('Welcome to KikwetuConnect')
              window.setTimeout(() => { window.location.href = '/signup' }, 300)
            }}
          >
            <label>County
              <select defaultValue="Nairobi County">
                <option>Nairobi County</option>
                <option>Mombasa County</option>
                <option>Kisumu County</option>
                <option>Nakuru County</option>
                <option>Kiambu County</option>
                <option>Turkana County</option>
              </select>
            </label>
            <label>What brings you here?
              <select defaultValue="Learn from people with context">
                <option>Learn from people with context</option>
                <option>Share local knowledge</option>
                <option>Find community and safety updates</option>
                <option>Buy and sell locally</option>
              </select>
            </label>
            <div className="sav-dialog-footer">
              <button type="button" className="sav-btn sav-btn-secondary sav-btn-flat" onClick={() => { dialogRef.current?.close(); showToast('You can join whenever you are ready') }}>Maybe later</button>
              <button type="submit" className="sav-btn sav-btn-primary">Create my space</button>
            </div>
          </form>
        </div>
      </dialog>

      <div className={`sav-toast${toast ? ' sav-toast-show' : ''}`} role="status">{toast}</div>
    </div>
  )
}
