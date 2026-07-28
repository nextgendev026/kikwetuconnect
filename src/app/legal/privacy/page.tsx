import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy | KikwetuConnect',
  description: 'KikwetuConnect Privacy Policy - Learn how we collect, use, and protect your personal data.',
  openGraph: {
    title: 'Privacy Policy | KikwetuConnect',
    description: 'Kenya\'s local knowledge network privacy practices.',
    type: 'website',
    locale: 'en_KE',
    siteName: 'KikwetuConnect',
  },
  robots: { index: true, follow: true },
}

const sections = [
  {
    title: '1. Information We Collect',
    content: 'We collect information you provide directly when you create an account, such as your name, username, county hub, preferred language, and interests. We also collect automatically generated data including your profile views, post interactions, and platform usage patterns to improve your experience.'
  },
  {
    title: '2. How We Use Your Information',
    content: 'Your information is used to personalize your experience, connect you with relevant conversations and professionals, display location-based content, and maintain the security and integrity of our platform. We do not sell your personal information to third parties.'
  },
  {
    title: '3. Data Storage and Security',
    content: 'Your data is stored securely in encrypted databases. We implement industry-standard security measures including access controls, encryption, and regular security audits. Data is hosted within Kenya and East Africa where applicable.'
  },
  {
    title: '4. Location Data',
    content: 'KikwetuConnect uses location data to serve you county-specific content and connect you with local conversations. You can control location sharing in your profile settings. Location data is never shared publicly without your consent.'
  },
  {
    title: '5. Cookies and Tracking',
    content: 'We use cookies to maintain your session, remember preferences including theme settings, and analyze platform usage to improve functionality. You can manage cookie preferences through your browser settings.'
  },
  {
    title: '6. Your Rights',
    content: 'You have the right to access, correct, or delete your personal data at any time. You can also request a full export of your data. Contact us through the support channels in the app or at our legal page.'
  },
  {
    title: '7. Children\'s Privacy',
    content: 'KikwetuConnect is not intended for users under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware that a minor has provided us with personal data, we will take steps to delete it.'
  },
  {
    title: '8. Changes to This Policy',
    content: 'We may update this Privacy Policy from time to time. Changes will be posted on this page with a revised "Last Updated" date. Continued use of the platform after changes constitutes acceptance of the revised policy.'
  },
  {
    title: '9. Contact Us',
    content: 'For privacy-related questions or requests, please reach out through the support channel in the app or through our legal page.'
  },
]

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <div className="max-w-3xl mx-auto px-[clamp(18px,5vw,76px)] py-[clamp(40px,6vw,80px)]">
        <Link href="/" className="inline-flex items-center gap-2 text-[var(--green)] text-sm font-medium mb-8 no-underline hover:underline">
          ← Back to KikwetuConnect
        </Link>

        <div className="mb-10">
          <h1 className="text-[clamp(2rem,4vw,3rem)] font-extrabold tracking-[-.06em] leading-[1.05] m-0 mb-3" style={{ fontFamily: "'Plus Jakarta Sans'" }}>
            Privacy Policy
          </h1>
          <p className="text-[var(--muted)] text-sm leading-relaxed m-0">Last updated: July 2026</p>
        </div>

        <div className="space-y-8">
          {sections.map((section, i) => (
            <section key={i}>
              <h2 className="text-lg font-bold tracking-tight mb-3 text-[var(--ink)]" style={{ fontFamily: "'Plus Jakarta Sans'" }}>
                {section.title}
              </h2>
              <p className="text-[var(--muted)] text-sm leading-[1.7] m-0">{section.content}</p>
            </section>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-[var(--line)]">
          <p className="text-xs text-[var(--muted)] m-0">
            Questions? Contact us at{' '}
            <Link href="/legal/terms" className="text-[var(--green)] no-underline hover:underline">Terms of Service</Link>
            {' · '}
            <Link href="/legal/community-guidelines" className="text-[var(--green)] no-underline hover:underline">Community Guidelines</Link>
          </p>
        </div>
      </div>
    </main>
  )
}