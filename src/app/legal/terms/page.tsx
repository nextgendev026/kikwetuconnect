import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service | KikwetuConnect',
  description: 'KikwetuConnect Terms of Service - Kenya\'s local knowledge network. Learn about our community guidelines, acceptable use, Heshima points, and service terms for users across all 47 counties.',
  keywords: ['KikwetuConnect terms', 'Kenya knowledge platform terms', 'Heshima points rules', 'community guidelines Kenya', 'KikwetuConnect legal'],
  openGraph: {
    title: 'Terms of Service | KikwetuConnect',
    description: 'Kenya\'s local knowledge network terms, Heshima reputation system rules, and community guidelines.',
    type: 'website',
    locale: 'en_KE',
    siteName: 'KikwetuConnect',
    url: 'https://kikwetuconnect.co.ke/legal/terms',
  },
  twitter: {
    card: 'summary',
    title: 'Terms of Service | KikwetuConnect',
    description: 'KikwetuConnect terms and conditions for Kenya\'s knowledge community.',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: '/legal/terms' },
}

const sections = [
  {
    title: '1. Introduction',
    content: 'Welcome to KikwetuConnect ("we," "our," or "us"). These Terms of Service govern your use of our platform, a Kenya-based community knowledge network connecting people across all 47 counties. By accessing or using KikwetuConnect, you agree to these terms. If you do not agree, please do not use the platform.'
  },
  {
    title: '2. Who We Are',
    content: 'KikwetuConnect is a community platform designed for Kenyans to share knowledge, ask questions, find help, and connect with trusted people in their region and beyond. Our mission is to build a multilingual, local-first knowledge network that turns community wisdom into real progress. We serve users in English, Kiswahili, and Sheng.'
  },
  {
    title: '3. User Responsibilities',
    content: 'When you use KikwetuConnect, you agree to: Be respectful and constructive in all interactions. Do not post spam, misleading information, or harmful content. Protect your own accounts and credentials. Report content or behavior that violates community guidelines. Use the platform for its intended purpose — knowledge sharing and community building across Kenyan counties.'
  },
  {
    title: '4. Acceptable Use',
    content: 'You may not use KikwetuConnect to: Post content that is unlawful, defamatory, harassing, or threatening. Share personal financial information such as M-Pesa PINs or bank details. Impersonate another person or entity. Attempt to gain unauthorized access to any part of the platform. Use automated means to access or manipulate the platform. Violate any applicable Kenyan laws or regulations.'
  },
  {
    title: '5. Heshima Points',
    content: 'Heshima points are KikwetuConnect\'s trust and reputation system. Points are earned by contributing quality content, providing helpful answers, and engaging positively with the community. Points may be adjusted or revoked for violations of community guidelines. Heshima is not a currency and has no monetary value. Higher Heshima ratings unlock platform privileges including verified expert status, priority responses, and access to exclusive community features.'
  },
  {
    title: '6. Content Ownership',
    content: 'You retain ownership of any content you post on KikwetuConnect. By posting content, you grant us a non-exclusive, royalty-free license to display, host, and promote your content on the platform. You are solely responsible for the content you create. We reserve the right to remove content that violates these terms or applicable Kenyan law.'
  },
  {
    title: '7. Privacy',
    content: 'Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your personal data. We do not sell your personal information to third parties. We implement industry-standard security measures including encryption and access controls. Data is hosted securely within East Africa.'
  },
  {
    title: '8. Suspension and Termination',
    content: 'We reserve the right to suspend or terminate accounts that violate these Terms of Service or community guidelines. We will provide notice when possible and allow users to appeal decisions through our moderation system. Repeated violations may result in permanent account suspension.'
  },
  {
    title: '9. Limitation of Liability',
    content: 'KikwetuConnect provides the platform "as is" without warranties of any kind. We are not liable for damages arising from your use of the platform, including but not limited to direct, indirect, incidental, or consequential damages. This limitation applies to the fullest extent permitted by Kenyan law.'
  },
  {
    title: '10. Governing Law',
    content: 'These terms are governed by the laws of the Republic of Kenya. Any disputes arising from these terms shall be resolved through the courts of Kenya. We encourage users to first seek resolution through our internal moderation and dispute resolution system.'
  },
  {
    title: '11. Changes to These Terms',
    content: 'We may update these Terms of Service from time to time. Changes will be posted on this page with a revised "Last Updated" date. Continued use of the platform after changes constitutes acceptance of the revised terms. We will notify users of material changes through the platform.'
  },
  {
    title: '12. Contact Us',
    content: 'If you have any questions about these Terms of Service, please contact us through our support channel in the app, reach out via our legal page, or email our team. We aim to respond to all inquiries within 48 hours.'
  },
]

export default function TermsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Terms of Service - KikwetuConnect',
          description: 'KikwetuConnect terms and conditions for Kenya\'s knowledge community platform.',
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
              Terms of Service
            </h1>
            <p className="text-[var(--muted)] text-sm leading-relaxed m-0">Last updated: July 2026</p>
          </div>

          <div className="prose prose-sm max-w-none">
            {sections.map((section, i) => (
              <section key={i} className="mb-8 card-hover" style={{ padding: '8px 0' }}>
                <h2 className="text-lg font-bold tracking-tight mb-3 text-[var(--ink)]" style={{ fontFamily: "'Plus Jakarta Sans'" }}>
                  {section.title}
                </h2>
                <p className="text-[var(--muted)] text-sm leading-[1.7] m-0">{section.content}</p>
              </section>
            ))}
          </div>

          <div className="mt-12 pt-6 border-t border-[var(--line)]">
            <p className="text-xs text-[var(--muted)] m-0">
              Questions? Contact our legal team at{' '}
              <Link href="/legal/community-guidelines" className="text-[var(--green)] no-underline hover:underline">
                Community Guidelines
              </Link>
              {' · '}
              <Link href="/legal/privacy" className="text-[var(--green)] no-underline hover:underline">
                Privacy Policy
              </Link>
              {' · '}
              <Link href="/legal/about" className="text-[var(--green)] no-underline hover:underline">
                About
              </Link>
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
