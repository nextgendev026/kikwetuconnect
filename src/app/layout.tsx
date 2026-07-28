import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, DM_Sans } from 'next/font/google'
import './globals.css'
import { Providers, ShellRouter } from './providers'

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
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${dm.variable}`} suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <Providers>
          <ShellRouter>{children}</ShellRouter>
        </Providers>
      </body>
    </html>
  )
}
