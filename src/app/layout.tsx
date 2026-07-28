import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, DM_Sans } from 'next/font/google'
import './globals.css'
import { Providers, ShellRouter } from './providers'

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--jakarta', weight: ['400', '500', '600', '700', '800'], display: 'swap' })
const dm = DM_Sans({ subsets: ['latin'], variable: '--dm', weight: ['400', '500', '600', '700'], display: 'swap' })

export const metadata: Metadata = {
  title: 'KikwetuConnect | Tuko pamoja',
  description: "Kenya's knowledge circle. Good questions deserve a home.",
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
