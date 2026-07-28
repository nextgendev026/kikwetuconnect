'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSupabase, useUser, toast } from '@/app/providers'

const categories = [
  { id: 'counties', label: 'Counties', icon: '📍', color: 'text-blue' },
  { id: 'agriculture', label: 'Agriculture', icon: '🌱', color: 'text-green' },
  { id: 'culture', label: 'Culture', icon: '🎭', color: 'text-gold' },
  { id: 'rights', label: 'Rights', icon: '⚖️', color: 'text-earth' },
  { id: 'biashara', label: 'Biashara', icon: '💼', color: 'text-gold' },
  { id: 'tech', label: 'Tech', icon: '💻', color: 'text-blue' },
  { id: 'health', label: 'Health', icon: '🏥', color: 'text-red' },
  { id: 'environment', label: 'Environment', icon: '🌿', color: 'text-green' },
]

interface Quiz {
  id: string
  title: string
  description: string
  category: string
  difficulty: 'easy' | 'medium' | 'hard'
  question_count: number
  estimated_time_minutes: number
  heshima_reward: number
}

interface QuizQuestion {
  id: string
  quiz_id: string
  question: string
  options: string[]
  correct_index: number
  explanation: string | null
}

interface LeaderboardEntry {
  user_id: string
  full_name: string
  username: string
  total_score: number
  quizzes_taken: number
}

export default function QuizzesPage() {
  const { user, profile, loading: userLoading } = useUser()
  const supabase = useSupabase()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([])
  const [quizStarted, setQuizStarted] = useState(false)
  const [quizComplete, setQuizComplete] = useState(false)
  const [score, setScore] = useState(0)
  const [showReward, setShowReward] = useState(false)
  const [progress, setProgress] = useState({ streak: 0, totalScore: 0, completed: 0 })
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])

  useEffect(() => {
    fetchQuizzes()
    fetchProgress()
    fetchLeaderboard()
  }, [activeCategory])

  const fetchQuizzes = async () => {
    setLoading(true)
    try {
      let query = supabase.from('quizzes').select('*').order('created_at', { ascending: false })
      if (activeCategory) query = query.eq('category', activeCategory)
      const { data } = await query
      setQuizzes((data as Quiz[]) || [])
    } finally {
      setLoading(false)
    }
  }

  const fetchProgress = async () => {
    if (!user) return
    const { data: results } = await supabase
      .from('quiz_results')
      .select('score, total, completed_at')
      .eq('user_id', user.id)

    if (results && results.length > 0) {
      const totalScore = (results as any[]).reduce((sum: number, r: any) => sum + r.score, 0)
      const completed = results.length
      const today = new Date().toDateString()
      const recent = (results as any[]).filter((r: any) => new Date(r.completed_at).toDateString() === today).length
      setProgress({ streak: recent > 0 ? 1 : 0, totalScore, completed })
    }
  }

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from('quiz_results')
      .select('user_id, score')
      .order('score', { ascending: false })
      .limit(50)

    if (!data || data.length === 0) return

    const grouped: Record<string, { total_score: number; count: number }> = {}
    ;(data as any[]).forEach((r: any) => {
      if (!grouped[r.user_id]) grouped[r.user_id] = { total_score: 0, count: 0 }
      grouped[r.user_id].total_score += r.score
      grouped[r.user_id].count++
    })

    const userIds = Object.keys(grouped)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .in('id', userIds)

    const profileMap = new Map((profiles as any[] || []).map((p: any) => [p.id, p]))
    const entries: LeaderboardEntry[] = userIds
      .map(id => {
        const p = profileMap.get(id)
        return {
          user_id: id,
          full_name: p?.full_name || 'Unknown',
          username: p?.username || 'unknown',
          total_score: grouped[id].total_score,
          quizzes_taken: grouped[id].count,
        }
      })
      .sort((a, b) => b.total_score - a.total_score)
      .slice(0, 10)

    setLeaderboard(entries)
  }

  const startQuiz = async (quiz: Quiz) => {
    setSelectedQuiz(quiz)
    setQuizStarted(true)
    setCurrentQuestion(0)
    setSelectedAnswers([])
    setQuizComplete(false)
    setScore(0)
    setShowReward(false)

    const { data } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quiz.id)
      .order('created_at')

    setQuestions((data as QuizQuestion[]) || [])
  }

  const selectAnswer = (optionIndex: number) => {
    const newAnswers = [...selectedAnswers]
    newAnswers[currentQuestion] = optionIndex
    setSelectedAnswers(newAnswers)
  }

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(c => c + 1)
    }
  }

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(c => c - 1)
    }
  }

  const submitQuiz = async () => {
    if (!selectedQuiz || !user) return

    const correct = questions.reduce((count, q, i) => {
      return count + (selectedAnswers[i] === q.correct_index ? 1 : 0)
    }, 0)
    setScore(correct)
    setQuizComplete(true)

    if (selectedQuiz.heshima_reward > 0) {
      setShowReward(true)
      setTimeout(() => setShowReward(false), 3000)
    }

    await supabase.from('quiz_results').insert({
      user_id: user.id,
      quiz_id: selectedQuiz.id,
      score: correct,
      total: questions.length,
    })

    const { data: curr } = await supabase.from('profiles').select('heshima_rating').eq('id', user.id).maybeSingle()
    const currentRating = curr?.heshima_rating ?? 0
    const newRating = currentRating + (correct === questions.length ? selectedQuiz.heshima_reward : Math.round(selectedQuiz.heshima_reward * correct / questions.length))
    await supabase.from('profiles').update({ heshima_rating: newRating }).eq('id', user.id)
    toast(`You scored ${correct}/${questions.length}! +${correct === questions.length ? selectedQuiz.heshima_reward : Math.round(selectedQuiz.heshima_reward * correct / questions.length)} Heshima`)
    fetchProgress()
    fetchLeaderboard()
  }

  const closeQuiz = () => {
    setSelectedQuiz(null)
    setQuizStarted(false)
    setQuizComplete(false)
    setQuestions([])
    setSelectedAnswers([])
  }

  const difficultyColor = (d: string) => {
    switch (d) {
      case 'easy': return 'bg-green/20 text-green'
      case 'medium': return 'bg-gold/20 text-gold'
      case 'hard': return 'bg-red/20 text-red'
      default: return 'bg-muted/20 text-muted'
    }
  }

  const difficultyLabel = (d: string) => {
    switch (d) {
      case 'easy': return 'Easy'
      case 'medium': return 'Medium'
      case 'hard': return 'Hard'
      default: return d
    }
  }

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-green border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-muted mb-4">Sign in to access quizzes</p>
        <Link href="/login" className="btn btn-primary">Sign in</Link>
      </div>
    )
  }

  return (
    <>
      <section className="page-head">
        <h1 className="page-title">Quizzes & Learning</h1>
        <p className="text-muted text-sm">Test your knowledge and earn Heshima</p>
      </section>

      {/* Progress Tracker */}
      <section className="card section mb-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-gold">{progress.streak}</div>
            <div className="text-xs text-muted">Daily Streak</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green">{progress.totalScore}</div>
            <div className="text-xs text-muted">Total Score</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue">{progress.completed}</div>
            <div className="text-xs text-muted">Completed</div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !activeCategory ? 'bg-green text-night' : 'bg-night2 text-muted hover:text-cream border border-[oklch(29%_.025_151)]'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id === activeCategory ? null : cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                activeCategory === cat.id
                  ? 'bg-green text-night'
                  : 'bg-night2 text-muted hover:text-cream border border-[oklch(29%_.025_151)]'
              }`}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* Quiz Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-green border-t-transparent rounded-full" />
        </div>
      ) : quizzes.length === 0 ? (
        <div className="card section text-center py-12">
          <p className="text-muted">No quizzes found in this category yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {quizzes.map(quiz => (
            <div key={quiz.id} className="card section flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${difficultyColor(quiz.difficulty)}`}>
                  {difficultyLabel(quiz.difficulty)}
                </span>
                <span className="text-xs text-gold font-medium">+{quiz.heshima_reward} Heshima</span>
              </div>
              <h3 className="font-bold text-sm mb-1">{quiz.title}</h3>
              <p className="text-xs text-muted mb-3 line-clamp-2">{quiz.description}</p>
              <div className="flex items-center gap-3 text-xs text-muted mb-4 mt-auto">
                <span>{quiz.question_count} questions</span>
                <span>{quiz.estimated_time_minutes} min</span>
              </div>
              <button
                onClick={() => startQuiz(quiz)}
                className="btn btn-primary btn-sm w-full"
              >
                Start Quiz
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard */}
      <section className="card section mb-6">
        <h2 className="font-bold text-lg mb-4">Leaderboard</h2>
        {leaderboard.length === 0 ? (
          <p className="text-muted text-sm">No scores yet. Be the first!</p>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry, i) => (
              <Link
                key={entry.user_id}
                href={`/profile/${entry.username}`}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-night2 transition-colors"
              >
                <span className={`w-6 text-center font-bold text-sm ${
                  i === 0 ? 'text-gold' : i === 1 ? 'text-muted' : i === 2 ? 'text-earth' : 'text-muted'
                }`}>{i + 1}</span>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green to-gold flex items-center justify-center text-xs font-bold text-night flex-shrink-0">
                  {entry.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.full_name}</p>
                  <p className="text-xs text-muted truncate">@{entry.username}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-green">{entry.total_score}</div>
                  <div className="text-xs text-muted">{entry.quizzes_taken} quizzes</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Inline Quiz Taker */}
      {quizStarted && selectedQuiz && questions.length > 0 && (
        <div className="fixed inset-0 z-50 bg-night/95 flex items-center justify-center p-4">
          <div className="card section w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {!quizComplete ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold">{selectedQuiz.title}</h3>
                  <button onClick={closeQuiz} className="text-muted hover:text-cream text-xl leading-none">&times;</button>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-night2 rounded-full mb-4 overflow-hidden">
                  <div
                    className="h-full bg-green rounded-full transition-all duration-300"
                    style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted mb-4">Question {currentQuestion + 1} of {questions.length}</p>

                {/* Question */}
                <div className="mb-6">
                  <p className="font-medium mb-4">{questions[currentQuestion].question}</p>
                  <div className="space-y-2">
                    {questions[currentQuestion].options.map((option, oi) => (
                      <button
                        key={oi}
                        onClick={() => selectAnswer(oi)}
                        className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                          selectedAnswers[currentQuestion] === oi
                            ? 'border-green bg-green/10 text-cream'
                            : 'border-[oklch(29%_.025_151)] bg-night2 text-muted hover:border-muted'
                        }`}
                      >
                        <span className="font-medium mr-2">{String.fromCharCode(65 + oi)}.</span>
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={prevQuestion}
                    disabled={currentQuestion === 0}
                    className="btn btn-secondary btn-sm disabled:opacity-30"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-muted">
                    {selectedAnswers.filter(a => a !== undefined).length} of {questions.length} answered
                  </span>
                  {currentQuestion < questions.length - 1 ? (
                    <button
                      onClick={nextQuestion}
                      className="btn btn-primary btn-sm"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      onClick={submitQuiz}
                      disabled={selectedAnswers.filter(a => a !== undefined).length < questions.length}
                      className="btn btn-gold btn-sm disabled:opacity-30"
                    >
                      Submit
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="text-center py-6">
                  {/* Reward Animation */}
                  {showReward && (
                    <div className="animate-float mb-4">
                      <div className="text-5xl mb-2">🏆</div>
                      <div className="text-gold font-bold text-2xl">+{selectedQuiz.heshima_reward} Heshima</div>
                    </div>
                  )}

                  <div className={`text-5xl mb-3 ${score === questions.length ? 'animate-float' : ''}`}>
                    {score === questions.length ? '🎉' : score >= questions.length / 2 ? '👏' : '💪'}
                  </div>
                  <h3 className="font-bold text-xl mb-1">Quiz Complete!</h3>
                  <p className="text-muted mb-2">{selectedQuiz.title}</p>
                  <div className={`text-4xl font-bold mb-6 ${score === questions.length ? 'text-gold' : 'text-green'}`}>
                    {score}/{questions.length}
                    <span className="text-base text-muted ml-2">({Math.round((score / questions.length) * 100)}%)</span>
                  </div>

                  {/* Review Answers */}
                  <div className="text-left space-y-3 mb-6">
                    {questions.map((q, qi) => {
                      const userAns = selectedAnswers[qi]
                      const isCorrect = userAns === q.correct_index
                      return (
                        <div key={q.id} className={`p-3 rounded-lg border ${
                          isCorrect ? 'border-green/30 bg-green/5' : 'border-red/30 bg-red/5'
                        }`}>
                          <div className="flex items-start gap-2">
                            <span className="mt-0.5">{isCorrect ? '✅' : '❌'}</span>
                            <div className="flex-1">
                              <p className="text-sm font-medium mb-1">{q.question}</p>
                              <p className="text-xs text-muted">
                                Your answer: <span className={isCorrect ? 'text-green' : 'text-red'}>{q.options[userAns] || 'Not answered'}</span>
                              </p>
                              {!isCorrect && (
                                <p className="text-xs text-green mt-0.5">
                                  Correct: {q.options[q.correct_index]}
                                </p>
                              )}
                              {q.explanation && (
                                <p className="text-xs text-muted mt-1 italic">{q.explanation}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex gap-3 justify-center">
                    <button onClick={closeQuiz} className="btn btn-secondary">Back to Quizzes</button>
                    <button onClick={() => startQuiz(selectedQuiz)} className="btn btn-primary">Retry</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Reward overlay */}
      {showReward && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
          <div className="animate-float text-center">
            <div className="text-6xl mb-2">🌟</div>
            <div className="bg-gold/20 border border-gold/50 rounded-2xl px-8 py-4 backdrop-blur">
              <div className="text-gold font-bold text-3xl">+{selectedQuiz?.heshima_reward || 0}</div>
              <div className="text-gold/80 text-sm font-medium">Heshima Earned!</div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
