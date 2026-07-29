import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy | KikwetuConnect',
  description: 'KikwetuConnect Privacy Policy - Learn how we collect, use, and protect your personal data on Kenya\'s local knowledge network. Your privacy matters across all 47 counties.',
  keywords: ['KikwetuConnect privacy', 'Kenya data protection', 'personal data Kenya', 'privacy policy knowledge platform', 'data security Kenya'],
  openGraph: {
    title: 'Privacy Policy | KikwetuConnect',
    description: 'Kenya\'s local knowledge network privacy practices. How we protect your data across our platform.',
    type: 'website',
    locale: 'en_KE',
    siteName: 'KikwetuConnect',
    url: 'https://kikwetuconnect.co.ke/legal/privacy',
  },
  twitter: {
    card: 'summary',
    title: 'Privacy Policy | KikwetuConnect',
    description: 'How KikwetuConnect protects your personal data.',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: '/legal/privacy' },
}

const sections = [
  {
    title: '1. Information We Collect',
    content: 'We collect information you provide directly when you create an account, such as your name, username, county hub, preferred language, and interests. We also collect automatically generated data including your profile views, post interactions, and platform usage patterns to improve your experience. Location data (county-level) is collected to serve you relevant local content.'
  },
  {
    title: '2. How We Use Your Information',
    content: 'Your information is used to personalize your experience, connect you with relevant conversations and professionals, display location-based content, and maintain the security and integrity of our platform. We do not sell your personal information to third parties. We may use aggregated, anonymized data for platform improvement and research.'
  },
  {
    title: '3. Data Storage and Security',
    content: 'Your data is stored securely in encrypted databases. We implement industry-standard security measures including access controls, encryption at rest and in transit, and regular security audits. Data is hosted within secure East African data centers where applicable. We regularly review our security practices to protect your information.'
  },
  {
    title: '4. Location Data',
    content: 'KikwetuConnect uses location data (county-level) to serve you county-specific content and connect you with local conversations. You can control location sharing in your profile settings. Location data is never shared publicly without your consent. Your exact GPS coordinates are never stored — we only use county-level information.'
  },
  {
    title: '5. Cookies and Tracking',
    content: 'We use cookies to maintain your session, remember preferences including theme settings, and analyze platform usage to improve functionality. You can manage cookie preferences through your browser settings. We use minimal, essential cookies only and do not use third-party tracking cookies.'
  },
  {
    title: '6. Data Sharing and Disclosure',
    content: 'We do not sell your personal data. We may share data with law enforcement when required by Kenyan law. We may share anonymized aggregate data with partners for research purposes. Your profile information (name, county, profession) is visible to other members as part of the community experience.'
  },
  {
    title: '7. Your Rights',
    content: 'Under Kenyan data protection law, you have the right to access, correct, or delete your personal data at any time. You can also request a full export of your data. To exercise these rights, use the settings page in the app or contact us through our support channels. We will respond to your request within 30 days.'
  },
  {
    title: '8. Children\'s Privacy',
    content: 'KikwetuConnect is not intended for users under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware that a minor has provided us with personal data, we will take immediate steps to delete it and close the associated account.'
  },
  {
    title: '9. Changes to This Policy',
    content: 'We may update this Privacy Policy from time to time. Changes will be posted on this page with a revised "Last Updated" date. Continued use of the platform after changes constitutes acceptance of the revised policy. We will notify users of material changes through the platform.'
  },
  {
    title: '10. Contact Us',
    content: 'For privacy-related questions or requests, please reach out through the support channel in the app, contact us through our legal page, or email our data protection team. We are committed to resolving any privacy concerns promptly.'
  },
]

export default function PrivacyPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Privacy Policy - KikwetuConnect',
          description: 'KikwetuConnect privacy practices and data protection policies for Kenya\'s knowledge community.',
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
              Privacy Policy
            </h1>
            <p className="text-[var(--muted)] text-sm leading-relaxed m-0">Last updated: July 2026</p>
          </div>

          <div className="space-y-8">
            {sections.map((section, i) => (
              <section key={i} className="card-hover" style={{ padding: '4px 0' }}>
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
              {' · '}
              <Link href="/legal/about" className="text-[var(--green)] no-underline hover:underline">About</Link>
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
