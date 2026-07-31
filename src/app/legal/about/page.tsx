import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About KikwetuConnect | Kenya\'s Knowledge Circle',
  description: 'Learn about KikwetuConnect - Kenya\'s local knowledge network built for community, learning, and growth across all 47 counties. Tuko pamoja — we are together.',
  keywords: ['KikwetuConnect about', 'Kenya knowledge network', 'local knowledge platform Kenya', '47 counties Kenya', 'Tuko pamoja', 'Kenya community platform'],
  openGraph: {
    title: 'About KikwetuConnect | Tuko Pamoja',
    description: 'Kenya\'s local knowledge network connecting communities across 47 counties. Come with what you know.',
    type: 'website',
    locale: 'en_KE',
    siteName: 'KikwetuConnect',
    url: 'https://kikwetuconnect.co.ke/legal/about',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About KikwetuConnect | Tuko Pamoja',
    description: 'Kenya\'s local knowledge network across 47 counties.',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: '/legal/about' },
}

export default function AboutPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'KikwetuConnect',
          description: 'Kenya\'s local knowledge network connecting communities across 47 counties.',
          slogan: 'Tuko pamoja — We are together',
          url: 'https://kikwetuconnect.co.ke',
          areaServed: { '@type': 'Country', name: 'Kenya' },
          knowsAbout: ['Local knowledge', 'Community development', 'Kenyan counties', 'Knowledge sharing'],
        })
      }} />
      <main className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
        <div className="max-w-3xl mx-auto px-[clamp(18px,5vw,76px)] py-[clamp(40px,6vw,80px)]">
          <Link href="/" className="inline-flex items-center gap-2 text-[var(--green)] text-sm font-medium mb-8 no-underline hover:underline transition-all">
            ← Back to KikwetuConnect
          </Link>

          <div className="mb-10 animate-fade-in-up">
            <h1 className="text-[clamp(2rem,4vw,3rem)] font-extrabold tracking-[-.06em] leading-[1.05] m-0 mb-3" style={{ fontFamily: "'Plus Jakarta Sans'" }}>
              About KikwetuConnect
            </h1>
            <p className="text-[var(--muted)] text-sm leading-relaxed m-0">Tuko pamoja — We are together</p>
          </div>

          <div className="space-y-8">
            <section className="card-hover feature-card" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20 }}>
              <h2 className="text-lg font-bold tracking-tight mb-3" style={{ fontFamily: "'Plus Jakarta Sans'" }}>Our Mission</h2>
              <p className="text-[var(--muted)] text-sm leading-[1.7] m-0">KikwetuConnect is Kenya's local knowledge network. We bring together people, expertise, and opportunity across all 47 counties. Whether you're in Nairobi or Turkana, Kitale or Mombasa, our platform connects you with the knowledge and community that matters most to your life. We believe every Kenyan has something valuable to share.</p>
            </section>

            <section className="card-hover feature-card" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20 }}>
              <h2 className="text-lg font-bold tracking-tight mb-3" style={{ fontFamily: "'Plus Jakarta Sans'" }}>Why We Exist</h2>
              <p className="text-[var(--muted)] text-sm leading-[1.7] m-0">Kenya has incredible local expertise — farmers who know the soil, experts who understand the system, community members who have navigated the same challenges. But this knowledge stays locked in counties and communities. KikwetuConnect unlocks it, making local wisdom accessible to every Kenyan, everywhere.</p>
            </section>

            <section className="card-hover feature-card" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20 }}>
              <h2 className="text-lg font-bold tracking-tight mb-3" style={{ fontFamily: "'Plus Jakarta Sans'" }}>How It Works</h2>
              <ul className="text-[var(--muted)] text-sm leading-[1.7] m-0 space-y-3" style={{ listStyle: 'none', padding: 0 }}>
                {[
                  { step: '1', text: 'Create a profile and set your county hub' },
                  { step: '2', text: 'Join Barazas — public or private community rooms for your county' },
                  { step: '3', text: 'Ask questions, share knowledge, build Heshima reputation' },
                  { step: '4', text: 'Connect with verified experts nearby' },
                  { step: '5', text: 'Grow your reputation through helpful contributions' },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--gold)', color: 'var(--night)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800, flex: 'none' }}>{item.step}</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold tracking-tight mb-4" style={{ fontFamily: "'Plus Jakarta Sans'" }}>Our Values</h2>
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                {[
                  { name: 'Locality', desc: 'We prioritize local voices and county-specific knowledge.', icon: '📍' },
                  { name: 'Trust', desc: 'Heshima ratings reflect real community trust, not popularity.', icon: '🛡️' },
                  { name: 'Multilingual', desc: 'English, Kiswahili, and Sheng — your language, your voice.', icon: '🗣️' },
                  { name: 'Inclusion', desc: 'Every county, every trade, every perspective has a seat at the Baraza.', icon: '🤲' },
                ].map((v, i) => (
                  <div key={i} className="card-hover" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 16 }}>
                    <span style={{ fontSize: 24 }}>{v.icon}</span>
                    <strong className="block text-sm mt-2 mb-1">{v.name}</strong>
                    <p className="text-[var(--muted)] text-xs leading-[1.6] m-0">{v.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-12 pt-6 border-t border-[var(--line)]">
            <p className="text-xs text-[var(--muted)] m-0">
              <Link href="/legal/terms" className="text-[var(--green)] no-underline hover:underline">Terms</Link>
              {' · '}
              <Link href="/legal/privacy" className="text-[var(--green)] no-underline hover:underline">Privacy</Link>
              {' · '}
              <Link href="/legal/community-guidelines" className="text-[var(--green)] no-underline hover:underline">Guidelines</Link>
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
