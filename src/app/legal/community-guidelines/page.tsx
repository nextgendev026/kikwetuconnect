import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Community Guidelines | KikwetuConnect',
  description: 'KikwetuConnect Community Guidelines - Be respectful, be helpful, and build trust in Kenya\'s knowledge network. Guidelines for all 47 counties across Kenya.',
  keywords: ['KikwetuConnect guidelines', 'community rules Kenya', 'Heshima trust system', 'online community guidelines', 'Kenya knowledge sharing rules'],
  openGraph: {
    title: 'Community Guidelines | KikwetuConnect',
    description: 'Community guidelines for Kenya\'s local knowledge network. Build Heshima, earn trust.',
    type: 'website',
    locale: 'en_KE',
    siteName: 'KikwetuConnect',
    url: 'https://kikwetuconnect.co.ke/legal/community-guidelines',
  },
  twitter: {
    card: 'summary',
    title: 'Community Guidelines | KikwetuConnect',
    description: 'How to be a great member of Kenya\'s knowledge community.',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: '/legal/community-guidelines' },
}

const guidelines = [
  {
    title: 'Be Respectful',
    icon: '🤝',
    content: 'Treat every member of the KikwetuConnect community with dignity and respect. No harassment, hate speech, or discrimination based on tribe, gender, religion, or background. We celebrate Kenya\'s diversity and expect all members to do the same. Disagree thoughtfully — attack ideas, not people.'
  },
  {
    title: 'Share Local Knowledge',
    icon: '🌍',
    content: 'KikwetuConnect thrives on local expertise. Share what you know about your county, your trade, or your community. Whether it\'s farming tips from Uasin Gishu, business advice from Nairobi, or fishing knowledge from Kisumu — your local insights are valuable. Verified experts who contribute quality answers earn higher Heshima trust ratings.'
  },
  {
    title: 'No Spam or Self-Promotion',
    icon: '🚫',
    content: 'Do not use KikwetuConnect as a marketing channel. Excessive self-promotion, repetitive content, or spam-like behavior will result in content removal and potential account suspension. Genuine recommendations and helpful referrals are welcome — pure advertising is not.'
  },
  {
    title: 'Protect Privacy',
    icon: '🔒',
    content: 'Never share someone else\'s personal information without their consent. Do not post M-Pesa PINs, ID numbers, phone numbers, or other sensitive data. Keep your own credentials secure. Report any privacy violations you encounter. Your safety is our priority.'
  },
  {
    title: 'Give Credit and Be Honest',
    icon: '✍️',
    content: 'Always give credit when sharing someone else\'s work or ideas. Do not plagiarize or misrepresent your qualifications. If you\'re not an expert, say so. Honest contributions build real Heshima — pretending to know what you don\'t erodes trust.'
  },
  {
    title: 'Report Violations',
    icon: '🚩',
    content: 'If you see content or behavior that violates these guidelines, use the report feature available on every post and profile. Our moderation team reviews all reports within 24 hours and takes appropriate action. False reporting may result in account action.'
  },
  {
    title: 'Build Heshima, Earn Trust',
    icon: '⭐',
    content: 'Helpful, thoughtful answers build your Heshima rating. Higher Heshima unlocks privileges like verified expert status, priority responses, and access to exclusive community features. Heshima reflects real community trust — it must be earned through consistent, quality contributions.'
  },
]

export default function CommunityGuidelinesPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Community Guidelines - KikwetuConnect',
          description: 'Guidelines for Kenya\'s local knowledge community platform.',
          publisher: { '@type': 'Organization', name: 'KikwetuConnect' },
          inLanguage: 'en-KE',
          dateModified: '2026-07-29',
        })
      }} />
      <main className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
        <div className="max-w-3xl mx-auto px-[clamp(18px,5vw,76px)] py-[clamp(40px,6vw,80px)]">
          <Link href="/" className="inline-flex items-center gap-2 text-[var(--green)] text-sm font-medium mb-8 no-underline hover:underline transition-all">
            ← Back to KikwetuConnect
          </Link>

          <div className="mb-10 animate-fade-in-up">
            <h1 className="text-[clamp(2rem,4vw,3rem)] font-extrabold tracking-[-.06em] leading-[1.05] m-0 mb-3" style={{ fontFamily: "'Plus Jakarta Sans'" }}>
              Community Guidelines
            </h1>
            <p className="text-[var(--muted)] text-sm leading-relaxed m-0">Last updated: July 2026 · Tuko pamoja</p>
          </div>

          <div className="space-y-8">
            {guidelines.map((g, i) => (
              <section key={i} className="card-hover feature-card" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20 }}>
                <div className="flex items-start gap-4">
                  <span style={{ fontSize: 28, lineHeight: 1 }}>{g.icon}</span>
                  <div>
                    <h2 className="text-lg font-bold tracking-tight mb-2" style={{ fontFamily: "'Plus Jakarta Sans'" }}>{g.title}</h2>
                    <p className="text-[var(--muted)] text-sm leading-[1.7] m-0">{g.content}</p>
                  </div>
                </div>
              </section>
            ))}
          </div>

          <div className="mt-12 pt-6 border-t border-[var(--line)]">
            <p className="text-xs text-[var(--muted)] m-0">
              Questions? Contact us at{' '}
              <Link href="/legal/terms" className="text-[var(--green)] no-underline hover:underline">Terms of Service</Link>
              {' · '}
              <Link href="/legal/privacy" className="text-[var(--green)] no-underline hover:underline">Privacy Policy</Link>
              {' · '}
              <Link href="/legal/about" className="text-[var(--green)] no-underline hover:underline">About</Link>
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
