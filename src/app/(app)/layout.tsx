import type { Metadata } from 'next'
import AppShell from '@/app/AppShell'

export const metadata: Metadata = {
  title: 'KikwetuConnect',
  robots: { index: false, follow: false },
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
