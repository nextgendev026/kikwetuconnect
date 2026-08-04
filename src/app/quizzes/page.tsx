import QuizzesPageClient from './quizzes-client'

export const metadata = {
  title: 'Quizzes & Learning — Test your knowledge and earn Heshima points',
  description: 'Take quizzes on agriculture, tech, culture, rights, and more. Earn Heshima points, climb the leaderboard, and unlock badges on KikwetuConnect.',
  keywords: ['Kenya quizzes', 'Heshima points', 'KikwetuConnect quizzes', 'learning Kenya', 'AI quizzes', 'Kenya knowledge'],
  openGraph: {
    title: 'Quizzes & Learning | KikwetuConnect',
    description: 'Test your knowledge and earn Heshima points. Categories include agriculture, tech, culture, rights, and more.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Quizzes & Learning | KikwetuConnect',
    description: 'Take quizzes and earn Heshima points.',
  },
}

export default function QuizzesPage() {
  return <QuizzesPageClient />
}
