import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import { SupabaseProvider } from '@/providers/supabase-provider'
import { ToastProvider } from '@/providers/toast-provider'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-ibm-plex-mono',
  weight: ['400', '500'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'KikwetuConnect | Your people. Your language. Your Baraza.',
  description: 'Kenya\'s local knowledge network for trusted answers, regional conversations, and multilingual discovery.',
  openGraph: {
    title: 'KikwetuConnect | Your people. Your language. Your Baraza.',
    description: 'Find trusted local answers, share knowledge, and join conversations that understand where you come from.',
    type: 'website',
    locale: 'en_KE',
  },
  twitter: {
    card: 'summary_large_image',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${ibmPlexMono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="canonical" href="https://kikwetuconnect.example/" />
      </head>
      <body className="min-h-screen antialiased">
        <SupabaseProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </SupabaseProvider>
      </body>
    </html>
  )
}