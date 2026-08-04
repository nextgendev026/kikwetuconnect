import type { Metadata } from 'next'
import SavannahLanding from '@/components/landing/SavannahLanding'

export const metadata: Metadata = {
  title: 'KikwetuConnect | Kenya, in conversation',
  description: "KikwetuConnect brings local knowledge, trusted people, and useful community action into one place. 47 counties, one local knowledge network.",
  openGraph: {
    title: 'KikwetuConnect | Kenya\'s Knowledge Circle',
    description: "Find useful people, ask better questions, and turn local context into real progress.",
    type: 'website',
    locale: 'en_KE',
    siteName: 'KikwetuConnect',
  },
}

export default function LandingPage() {
  return <SavannahLanding />
}
