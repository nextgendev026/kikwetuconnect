import type { Metadata } from 'next'
import SavannahLanding from '@/components/landing/SavannahLanding'

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kikwetuconnect.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'KikwetuConnect | Kenya, in conversation',
  description: "KikwetuConnect brings local knowledge, trusted people, and useful community action into one place. Ask better questions, learn from someone who has done the work, and keep your county in the conversation — across all 47 counties of Kenya.",
  keywords: [
    'Kenya', 'KikwetuConnect', 'Kenya knowledge network', 'local knowledge platform Kenya',
    '47 counties', 'community platform Kenya', 'Baraza', 'ask questions Kenya',
    'local experts Kenya', 'Tuko pamoja', 'Kenya social network', 'Kiswahili knowledge sharing',
    'Kenya community', 'Nyumba Kumi', 'county conversations',
  ],
  applicationName: 'KikwetuConnect',
  openGraph: {
    title: 'KikwetuConnect | Kenya\'s Knowledge Circle',
    description: "Find useful people, ask better questions, and turn local context into real progress. Kenya, in conversation — all 47 counties.",
    type: 'website',
    locale: 'en_KE',
    siteName: 'KikwetuConnect',
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KikwetuConnect | Kenya, in conversation',
    description: 'Kenya\'s local knowledge network. Ask better questions, find trusted people, and keep your county in the conversation.',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
}

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Organization',
                name: 'KikwetuConnect',
                alternateName: 'Kikwetu',
                url: siteUrl,
                slogan: 'Tuko pamoja — We are together',
                description: 'Kenya\'s local knowledge network connecting communities across all 47 counties. Find useful people, ask better questions, and turn local context into real progress.',
                areaServed: { '@type': 'Country', name: 'Kenya' },
                knowsAbout: ['Local knowledge', 'Community development', 'Kenyan counties', 'Knowledge sharing', 'Baraza'],
                sameAs: [siteUrl],
              },
              {
                '@type': 'WebSite',
                name: 'KikwetuConnect',
                alternateName: 'Kikwetu',
                url: siteUrl,
                inLanguage: ['en-KE', 'sw-KE'],
                publisher: {
                  '@type': 'Organization',
                  name: 'KikwetuConnect',
                },
                potentialAction: {
                  '@type': 'SearchAction',
                  target: `${siteUrl}/search?q={search_term_string}`,
                  'query-input': 'required name=search_term_string',
                },
              },
            ],
          }),
        }}
      />
      <SavannahLanding />
    </>
  )
}
