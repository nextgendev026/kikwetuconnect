import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Community Guidelines | KikwetuConnect',
  description: 'KikwetuConnect Community Guidelines - Be respectful, be helpful, and build trust in Kenya\'s knowledge network.',
  openGraph: {
    title: 'Community Guidelines | KikwetuConnect',
    description: 'Community guidelines for Kenya\'s local knowledge network.',
    type: 'website',
    locale: 'en_KE',
    siteName: 'KikwetuConnect',
  },
  robots: { index: true, follow: true },
}

export default function CommunityGuidelinesPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <div className="max-w-3xl mx-auto px-[clamp(18px,5vw,76px)] py-[clamp(40px,6vw,80px)]">
        <Link href="/" className="inline-flex items-center gap-2 text-[var(--green)] text-sm font-medium mb-8 no-underline hover:underline">
          ← Back to KikwetuConnect
        </Link>

        <div className="mb-10">
          <h1 className="text-[clamp(2rem,4vw,3rem)] font-extrabold tracking-[-.06em] leading-[1.05] m-0 mb-3" style={{ fontFamily: "'Plus Jakarta Sans'" }}>
            Community Guidelines
          </h1>
          <p className="text-[var(--muted)] text-sm leading-relaxed m-0">Last updated: July 2026</p>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-bold tracking-tight mb-3" style={{ fontFamily: "'Plus Jakarta Sans'" }}>Be Respectful</h2>
            <p className="text-[var(--muted)] text-sm leading-[1.7] m-0">Treat every member of the KikwetuConnect community with dignity and respect. No harassment, hate speech, or discrimination. We celebrate Kenya\'s diversity and expect all members to do the same.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold tracking-tight mb-3" style={{ fontFamily: "'Plus Jakarta Sans'" }}>Share Local Knowledge</h2>
            <p className="text-[var(--muted)] text-sm leading-[1.7] m-0">KikwetuConnect thrives on local expertise. Share what you know about your county, your trade, or your community. Verified professionals who contribute quality answers earn higher Heshima trust ratings.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold tracking-tight mb-3" style={{ fontFamily: "'Plus Jakarta Sans'" }}>No Spam or Self-Promotion</h2>
            <p className="text-[var(--muted)] text-sm leading-[1.7] m-0">Do not use KikwetuConnect as a marketing channel. Excessive self-promotion, repetitive content, or spam-like behavior will result in content removal and potential account suspension.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold tracking-tight mb-3" style={{ fontFamily: "'Plus Jakarta Sans'" }}>Protect Privacy</h2>
            <p className="text-[var(--muted)] text-sm leading-[1.7] m-0">Never share someone else\'s personal information without their consent. Do not post M-Pesa PINs, ID numbers, or other sensitive data. Keep your own credentials secure.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold tracking-tight mb-3" style={{ fontFamily: "'Plus Jakarta Sans'" }}>Report Violations</h2>
            <p className="text-[var(--muted)] text-sm leading-[1.7] m-0">If you see content or behavior that violates these guidelines, use the report feature. Our moderation team reviews all reports within 24 hours and takes appropriate action.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold tracking-tight mb-3" style={{ fontFamily: "'Plus Jakarta Sans'" }}>Build Heshima, Earn Trust</h2>
            <p className="text-[var(--muted)] text-sm leading-[1.7] m-0">Helpful, thoughtful answers build your Heshima rating. Higher Heshima unlocks privileges like verified professional status, priority responses, and access to exclusive community features.</p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-[var(--line)]">
          <p className="text-xs text-[var(--muted)] m-0">
            Questions? Contact us at{' '}
            <Link href="/legal/terms" className="text-[var(--green)] no-underline hover:underline">Terms of Service</Link>
            {' · '}
            <Link href="/legal/privacy" className="text-[var(--green)] no-underline hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </main>
  )
}