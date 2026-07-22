import { Metadata } from 'next'

export const siteConfig = {
  name: 'KikwetuConnect',
  description: 'Kenya\'s local knowledge network. Share what you know, ask trusted questions, and join conversations that understand where you come from.',
  url: 'https://kikwetuconnect.com',
  ogImage: 'https://kikwetuconnect.com/og-image.png',
  author: 'KikwetuConnect Team',
  keywords: [
    'Kenya knowledge',
    'Q&A platform',
    'local community',
    'Kiswahili',
    'regional hubs',
    'verified expertise',
    'Heshima rating',
  ],
}

export const createMetadata = (overrides: Partial<Metadata> = {}): Metadata => ({
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [{ name: siteConfig.author }],
  creator: siteConfig.author,
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: '@kikwetuconnect',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  ...overrides,
})

export const structuredData = {
  organization: {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    logo: {
      '@type': 'ImageObject',
      url: `${siteConfig.url}/logo.svg`,
      width: 256,
      height: 256,
    },
    sameAs: [
      'https://twitter.com/kikwetuconnect',
      'https://facebook.com/kikwetuconnect',
      'https://github.com/kikwetuconnect',
    ],
  },
  website: {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    searchAction: {
      '@type': 'SearchAction',
      'target': `${siteConfig.url}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  },
}
