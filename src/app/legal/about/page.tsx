import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About KikwetuConnect',
  description: 'Learn about KikwetuConnect - Kenya\'s local knowledge network built for community, learning, and growth across all 47 counties.',
  openGraph: {
    title: 'About KikwetuConnect | Tuko Pamoja',
    description: 'Kenya\'s local knowledge network connecting communities across 47 counties.',
    type: 'website',
    locale: 'en_KE',
    siteName: 'KikwetuConnect',
  },
  robots: { index: true, follow: true },
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <div className="max-w-3xl mx-auto px-[clamp(18px,5vw,76px)] py-[clamp(40px,6vw,80px)]">
        <Link href="/" className="inline-flex items-center gap-2 text-[var(--green)] text-sm font-medium mb-8 no-underline hover:underline">
          ← Back to KikwetuConnect
        </Link>

        <div className="mb-10">
          <h1 className="text-[clamp(2rem,4vw,3rem)] font-extrabold tracking-[-.06em] leading-[1.05] m-0 mb-3" style={{ fontFamily: "'Plus Jakarta Sans'" }}>
            About KikwetuConnect
          </h1>
          <p className="text-[var(--muted)] text-sm leading-relaxed m-0">Tuko pamoja — We are together</p>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-bold tracking-tight mb-3" style={{ fontFamily: "'Plus Jakarta Sans'" }}>Our Mission</h2>
            <p className="text-[var(--muted)] text-sm leading-[1.7] m-0">KikwetuConnect is Kenya\'s local knowledge network. We bring together people, expertise, and opportunity across all 47 counties. Whether you\'re in Nairobi or Turkana, Kitale or Mombasa, our platform connects you with the knowledge and community that matters most to your life.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold tracking-tight mb-3" style={{ fontFamily: "'Plus Jakarta Sans'" }}>Why We Exist</h2>
            <p className="text-[var(--muted)] text-sm leading-[1.7] m-0">Kenya has incredible local expertise — farmers who know the soil, professionals who understand the system, community members who have navigated the same challenges. But this knowledge stays locked in counties and communities. KikwetuConnect unlocks it.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold tracking-tight mb-3" style={{ fontFamily: "'Plus Jakarta Sans'" }}>How It Works</h2>
            <ul className="text-[var(--muted)] text-sm leading-[1.7] m-0 space-y-2 list-disc pl-5">
              <li>Create a profile and set your county hub</li>
              <li>Join Barazas — public or private community rooms</li>
              <li>Ask questions, share knowledge, build Heshima</li>
              <li>Connect with verified professionals nearby</li>
              <li>Grow your reputation through helpful contributions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold tracking-tight mb-3" style={{ fontFamily: "'Plus Jakarta Sans'" }}>Our Values</h2>
            <div className="space-y-3">
              {[
                { name: 'Locality', desc: 'We prioritize local voices and county-specific knowledge.' },
                { name: 'Trust', desc: 'Heshima ratings reflect real community trust, not popularity.' },
                { name: 'Multilingual', desc: 'English, Kiswahili, and Sheng — your language, your voice.' },
                { name: 'Inclusion', desc: 'Every county, every trade, every perspective has a seat at the Baraza.' },
              ].map((v, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-green font-bold mt-0.5">●</span>
                  <div>
                    <strong className="text-[var(--ink)] text-sm">{v.name}</strong>
                    <p className="text-[var(--muted)] text-xs leading-[1.6] m-0">{v.desc}</p>
                  </div>
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
  )
}