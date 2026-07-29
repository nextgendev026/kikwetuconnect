import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, DM_Sans } from 'next/font/google'
import { Analytics } from "@vercel/analytics/next"
import './globals.css'
import { Providers, ShellRouter } from './providers'
import PwaSetup from '@/components/PwaSetup'

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--jakarta', weight: ['400', '500', '600', '700', '800'], display: 'swap' })
const dm = DM_Sans({ subsets: ['latin'], variable: '--dm', weight: ['400', '500', '600', '700'], display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'KikwetuConnect | Tuko pamoja', template: '%s | KikwetuConnect' },
  description: "Kenya's local knowledge network. Your people. Your language. Your Baraza. Find useful people, ask better questions, and turn local context into real progress.",
  keywords: ['Kenya', 'social network', 'knowledge sharing', 'community', 'Swahili', 'local', 'Baraza'],
  openGraph: {
    title: 'KikwetuConnect | Tuko pamoja',
    description: "Kenya's local knowledge network. Find useful people, ask better questions.",
    type: 'website',
    locale: 'en_KE',
    siteName: 'KikwetuConnect',
  },
  twitter: { card: 'summary_large_image', title: 'KikwetuConnect', description: "Kenya's local knowledge network." },
  robots: { index: true, follow: true },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
    other: [
      { rel: 'manifest', url: '/site.webmanifest' },
    ],
  },
  manifest: '/site.webmanifest',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${dm.variable}`} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#438854" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#1a2e1a" media="(prefers-color-scheme: dark)" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Kikwetu" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        <link rel="apple-touch-startup-image" href="/favicon.svg" />
      </head>
      <body className="min-h-screen antialiased">
        <Providers>
          <ShellRouter>{children}</ShellRouter>
          <PwaSetup />
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
