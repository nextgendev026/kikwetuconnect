'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSupabase, useUser, toast } from '@/app/providers'
import { Trophy, Brain, Star, Clock, CheckCircle2, XCircle, ArrowLeft, ArrowRight, Award, Flame, BookOpen, Medal, Sparkles, RotateCcw, BarChart3, ChevronRight } from 'lucide-react'

const categories = [
  { id: 'counties', label: 'Counties', icon: '📍', color: 'var(--blue)' },
  { id: 'agriculture', label: 'Agriculture', icon: '🌱', color: 'var(--green)' },
  { id: 'culture', label: 'Culture', icon: '🎭', color: 'var(--gold)' },
  { id: 'rights', label: 'Rights', icon: '⚖️', color: 'var(--earth)' },
  { id: 'biashara', label: 'Biashara', icon: '💼', color: 'var(--gold)' },
  { id: 'tech', label: 'Tech', icon: '💻', color: 'var(--blue)' },
  { id: 'health', label: 'Health', icon: '🏥', color: 'var(--red)' },
  { id: 'environment', label: 'Environment', icon: '🌿', color: 'var(--green)' },
]

const style = {
  card: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20, boxShadow: 'var(--card-shadow)' },
  statCard: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 16, boxShadow: 'var(--card-shadow)' },
  input: { width: '100%', background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: 11, padding: '10px 14px', fontSize: 13, color: 'var(--ink)', outline: 'none' },
  btn: { padding: '10px 20px', borderRadius: 11, fontWeight: 700, fontSize: 12, border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all .2s var(--ease)' },
  primaryBtn: { background: 'var(--gold)', color: 'var(--night)' },
  secondaryBtn: { background: 'var(--raised)', color: 'var(--ink)', border: '1px solid var(--line)' },
  tag: { padding: '6px 12px', borderRadius: 99, fontSize: 10, fontWeight: 600, border: '1px solid var(--line)', background: 'var(--raised)', color: 'var(--muted)', cursor: 'pointer', transition: 'all .2s var(--ease)' },
  tagActive: { background: 'var(--gold)', color: 'var(--night)', borderColor: 'var(--gold)' },
}

interface Quiz { id: string; title: string; description: string; category: string; difficulty: 'easy' | 'medium' | 'hard'; question_count: number; estimated_time_minutes: number; heshima_reward: number }
interface QuizQuestion { id: string; quiz_id: string; question: string; options: string[]; correct_index: number; explanation: string | null }
interface LeaderboardEntry { user_id: string; full_name: string; username: string; total_score: number; quizzes_taken: number }

export default function QuizzesPage() {
  const { user, profile, refreshProfile } = useUser()
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
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiQuestions, setAiQuestions] = useState<QuizQuestion[] | null>(null)
  const [showAiQuiz, setShowAiQuiz] = useState(false)
  const [progress, setProgress] = useState({ streak: 0, totalScore: 0, completed: 0 })
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [badges, setBadges] = useState<any[]>([])
  const [randomQuiz, setRandomQuiz] = useState(false)
  const [heshimaRating, setHeshimaRating] = useState(profile?.heshima_rating || 0)

  // Sync local heshima with profile context
  useEffect(() => { setHeshimaRating(profile?.heshima_rating || 0) }, [profile?.heshima_rating])

  useEffect(() => { fetchQuizzes(); fetchProgress(); fetchLeaderboard(); fetchBadges() }, [activeCategory])

  // Realtime: auto-refresh progress on quiz completion
  useEffect(() => {
    if (!user) return
    const channel = supabase.channel(`quiz-progress-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'quiz_attempts', filter: `user_id=eq.${user.id}` }, () => { fetchProgress(); fetchLeaderboard(); refreshProfile() })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, () => { fetchProgress(); refreshProfile() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, supabase])

  const fetchQuizzes = async () => {
    setLoading(true)
    try {
      let query = supabase.from('quizzes').select('*').order('created_at', { ascending: false })
      if (activeCategory) query = query.eq('category', activeCategory)
      const { data } = await query; setQuizzes((data as Quiz[]) || [])
    } finally { setLoading(false) }
  }

  const calcStreak = (dates: Date[]) => {
    if (dates.length === 0) return 0
    const unique = [...new Set(dates.map(d => d.toDateString()))].sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    let streak = 0; const today = new Date().toDateString()
    for (let i = 0; i < unique.length; i++) {
      const expected = new Date(); expected.setDate(expected.getDate() - i)
      if (unique[i] === expected.toDateString()) streak++
      else if (i === 0 && unique[i] === new Date(Date.now() - 86400000).toDateString()) streak++
      else break
    }
    return streak
  }

  const fetchProgress = async () => {
    if (!user) return
    const { data: results } = await supabase.from('quiz_attempts').select('score, total_questions, completed_at').eq('user_id', user.id)
    const totalScore = (results as any[] || []).reduce((s: number, r: any) => s + (r.score || 0), 0)
    const completed = (results || []).length
    const dates = (results || []).filter((r: any) => r.completed_at).map((r: any) => new Date(r.completed_at))
    const streak = calcStreak(dates)
    setProgress({ streak, totalScore, completed })
  }

  const fetchBadges = async () => {
    if (!user) return
    const { data } = await supabase.from('user_badges').select('*, badges(*)').eq('user_id', user.id)
    if (data) setBadges(data)
  }

  // Realtime badge unlock
  useEffect(() => {
    if (!user) return
    const ch = supabase.channel(`quiz-badges-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_badges', filter: `user_id=eq.${user.id}` }, () => fetchBadges())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user, supabase])

  const startRandomQuiz = async () => {
    if (!user) { toast('Sign in to take quizzes'); return }
    setRandomQuiz(true); setAiGenerating(true); setQuizStarted(false)
    try {
      const cats = categories.filter(c => !activeCategory || c.id === activeCategory)
      const picked = cats[Math.floor(Math.random() * cats.length)]
      const res = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: picked.id, difficulty: 'medium', count: 10 }),
      })
      const data = await res.json()
      if (!data.questions?.length) throw new Error('No questions')
      const qs: QuizQuestion[] = data.questions.map((q: any, i: number) => ({
        id: `ai-${i}`, quiz_id: 'random',
        question: q.question, options: q.options, correct_index: q.correct_index, explanation: q.explanation || null,
      }))
      setQuestions(qs)
      setSelectedQuiz({ id: 'random', title: `${picked.icon} ${picked.label} Quiz`, description: 'AI-generated random quiz', category: picked.id, difficulty: 'medium', question_count: qs.length, estimated_time_minutes: 5, heshima_reward: 10 } as Quiz)
      setQuizStarted(true)
      setCurrentQuestion(0); setSelectedAnswers([]); setQuizComplete(false); setScore(0)
    } catch { toast('Failed to generate quiz. Try again.') }
    finally { setAiGenerating(false) }
  }

  const submitRandomQuiz = async () => {
    if (!user) return
    const correct = questions.reduce((c, q, i) => c + (selectedAnswers[i] === q.correct_index ? 1 : 0), 0)
    setScore(correct); setQuizComplete(true)
    const { error } = await supabase.from('quiz_attempts').insert({
      user_id: user.id, quiz_id: selectedQuiz?.id || 'random', score: correct, total_questions: questions.length,
      answers: selectedAnswers.map((a: any, i: number) => ({ question: questions[i]?.question, selected: a, correct: questions[i]?.correct_index })),
    })
    if (error) { console.error('Quiz submission error:', error); toast('Failed to save results') }
    else { toast(`+10 Heshima earned!`); fetchProgress(); fetchLeaderboard(); refreshProfile() }
  }

  const fetchLeaderboard = async () => {
    const { data } = await supabase.from('quiz_attempts').select('user_id, score').order('score', { ascending: false }).limit(50)
    if (!data || data.length === 0) return
    const grouped: Record<string, { total_score: number; count: number }> = {}
    ;(data as any[]).forEach(r => {
      if (!grouped[r.user_id]) grouped[r.user_id] = { total_score: 0, count: 0 }
      grouped[r.user_id].total_score += r.score; grouped[r.user_id].count++
    })
    const userIds = Object.keys(grouped)
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, username').in('id', userIds)
    const pm = new Map((profiles as any[] || []).map((p: any) => [p.id, p]))
    setLeaderboard(userIds.map(id => {
      const p = pm.get(id); return { user_id: id, full_name: p?.full_name || 'Unknown', username: p?.username || 'unknown', total_score: grouped[id].total_score, quizzes_taken: grouped[id].count }
    }).sort((a, b) => b.total_score - a.total_score).slice(0, 10))
  }

  const startQuiz = async (quiz: Quiz) => {
    setSelectedQuiz(quiz); setQuizStarted(true); setCurrentQuestion(0); setSelectedAnswers([]); setQuizComplete(false); setScore(0)
    const { data } = await supabase.from('quiz_questions').select('*').eq('quiz_id', quiz.id).order('created_at')
    setQuestions((data as QuizQuestion[]) || [])
  }

  const selectAnswer = (oi: number) => { const na = [...selectedAnswers]; na[currentQuestion] = oi; setSelectedAnswers(na) }
  const submitQuiz = async () => {
    if (!selectedQuiz || !user) return
    if (selectedQuiz.id === 'random') { await submitRandomQuiz(); return }
    const correct = questions.reduce((c, q, i) => c + (selectedAnswers[i] === q.correct_index ? 1 : 0), 0)
    setScore(correct); setQuizComplete(true)
    const { error } = await supabase.from('quiz_attempts').insert({
      user_id: user.id, quiz_id: selectedQuiz.id, score: correct, total_questions: questions.length,
      answers: selectedAnswers.map((a: any, i: number) => ({ question: questions[i]?.question, selected: a, correct: questions[i]?.correct_index })),
    })
    if (error) { console.error('Quiz submission error:', error); toast('Failed to save results') }
    fetchProgress(); fetchLeaderboard(); refreshProfile()
  }

  const generateAiQuiz = async () => {
    if (!selectedQuiz) return
    setAiGenerating(true)
    try {
      const res = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: selectedQuiz.category, difficulty: selectedQuiz.difficulty, count: 5 }),
      })
      const data = await res.json()
      if (data.questions && data.questions.length > 0) {
        const aiQ: QuizQuestion[] = data.questions.map((q: any, i: number) => ({
          id: `ai-${i}`,
          quiz_id: selectedQuiz.id,
          question: q.question,
          options: q.options,
          correct_index: q.correct_index,
          explanation: q.explanation || null,
        }))
        setAiQuestions(aiQ)
        setShowAiQuiz(true)
        setQuestions(aiQ)
        setCurrentQuestion(0)
        setSelectedAnswers([])
        setQuizComplete(false)
        setScore(0)
      }
    } catch { toast('AI generation failed. Try again.') }
    finally { setAiGenerating(false) }
  }

  const closeQuiz = () => { setSelectedQuiz(null); setQuizStarted(false); setQuizComplete(false); setQuestions([]); setSelectedAnswers([]); setAiQuestions(null); setShowAiQuiz(false) }

  return (
    <div className="pb-8 animate-fade-in-up">
      {/* Header */}
      <section className="page-head">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Brain className="w-7 h-7" style={{ color: 'var(--gold)' }} />
            Quizzes & Learning
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Test your knowledge and earn Heshima points</p>
        </div>
      </section>

      {/* Progress + Heshima row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { icon: Flame, label: 'Daily Streak', value: `${progress.streak} day`, color: 'var(--gold)' },
          { icon: BarChart3, label: 'Total Score', value: String(progress.totalScore), color: 'var(--green)' },
          { icon: CheckCircle2, label: 'Completed', value: String(progress.completed), color: 'var(--blue)' },
          { icon: Award, label: 'Heshima', value: String(heshimaRating), color: 'var(--gold)' },
        ].map((s, i) => (
          <div key={i} style={style.statCard} className="card-hover">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
              <span className="text-xs" style={{ color: 'var(--muted)' }}>{s.label}</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Random AI Quiz */}
      <button onClick={startRandomQuiz} disabled={aiGenerating}
        style={{ ...style.btn, background: 'linear-gradient(135deg, var(--gold), var(--green))', color: 'var(--night)', width: '100%', justifyContent: 'center', marginBottom: 16, opacity: aiGenerating ? 0.6 : 1 }}>
        {aiGenerating ? <><div className="animate-spin w-4 h-4 border-2 border-night border-t-transparent rounded-full mr-2" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Random AI Quiz — 10 Questions</>}
      </button>

      {/* Categories */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setActiveCategory(null)} style={{ ...style.tag, ...(!activeCategory ? style.tagActive : {}) }}>All</button>
        {categories.map(cat => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.id === activeCategory ? null : cat.id)}
            style={{ ...style.tag, ...(activeCategory === cat.id ? style.tagActive : {}) }}>
            <span>{cat.icon}</span> {cat.label}
          </button>
        ))}
      </div>

      {/* Earned Badges */}
      {badges.length > 0 && (
        <div style={style.card} className="mb-6">
          <h2 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: 'var(--ink)' }}>
            <Award className="w-4 h-4" style={{ color: 'var(--gold)' }} /> Badges Earned
          </h2>
          <div className="flex flex-wrap gap-2">
            {badges.map((ub: any) => (
              <span key={ub.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: 'color-mix(in oklab, var(--gold) 12%, var(--surface))', color: 'var(--gold)', border: '1px solid color-mix(in oklab, var(--gold) 25%, transparent)' }}>
                {ub.badges?.icon || '🏅'} {ub.badges?.name || 'Badge'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quiz Grid */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-2" style={{ borderColor: 'var(--green)', borderTopColor: 'transparent', borderRadius: '50%' }} /></div>
      ) : quizzes.length === 0 ? (
        <div style={style.card} className="text-center py-12">
          <BookOpen className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--muted)', opacity: 0.5 }} />
          <p style={{ color: 'var(--muted)' }}>No quizzes found in this category yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {quizzes.map(quiz => (
            <div key={quiz.id} style={style.card} className="card-hover feature-card flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold" style={{
                  background: quiz.difficulty === 'easy' ? 'color-mix(in oklab, var(--green) 15%, var(--surface))' : quiz.difficulty === 'medium' ? 'color-mix(in oklab, var(--gold) 15%, var(--surface))' : 'color-mix(in oklab, var(--red) 15%, var(--surface))',
                  color: quiz.difficulty === 'easy' ? 'var(--green)' : quiz.difficulty === 'medium' ? 'var(--gold)' : 'var(--red)',
                }}>
                  {quiz.difficulty === 'easy' ? 'Easy' : quiz.difficulty === 'medium' ? 'Medium' : 'Hard'}
                </span>
                <span className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--gold)' }}>
                  <Star className="w-3 h-3" />+{quiz.heshima_reward}
                </span>
              </div>
              <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--ink)' }}>{quiz.title}</h3>
              <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--muted)' }}>{quiz.description}</p>
              <div className="flex items-center gap-3 text-xs mt-auto mb-4" style={{ color: 'var(--muted)' }}>
                <span className="flex items-center gap-1"><Brain className="w-3 h-3" />{quiz.question_count} questions</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{quiz.estimated_time_minutes} min</span>
              </div>
              <button onClick={() => startQuiz(quiz)} style={{ ...style.btn, ...style.primaryBtn, width: '100%', justifyContent: 'center', fontSize: 12 }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
                Start Quiz <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard */}
      <section style={style.card}>
        <h2 className="font-bold text-base mb-4 flex items-center gap-2" style={{ color: 'var(--ink)' }}>
          <Medal className="w-5 h-5" style={{ color: 'var(--gold)' }} /> Leaderboard
        </h2>
        {leaderboard.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No scores yet. Be the first!</p>
        ) : (
          <div className="space-y-1">
            {leaderboard.map((entry, i) => (
              <div key={entry.user_id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: i < 3 ? 'color-mix(in oklab, var(--gold) 6%, var(--surface))' : 'transparent' }}>
                <span className="w-6 text-center text-sm font-bold" style={{ color: i === 0 ? 'var(--gold)' : i === 1 ? 'var(--muted)' : i === 2 ? 'var(--earth)' : 'var(--muted)' }}>{i + 1}</span>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--green), var(--gold))', color: 'var(--night)' }}>
                  {entry.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{entry.full_name}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>@{entry.username}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold" style={{ color: 'var(--green)' }}>{entry.total_score}</div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>{entry.quizzes_taken} quizzes</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quiz Modal */}
      {quizStarted && selectedQuiz && questions.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center modal-center-scroll" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div style={{ ...style.card, width: 'min(640px, 100%)', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--card-shadow-elevated)' }}>
            {!quizComplete ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-base" style={{ color: 'var(--ink)' }}>{selectedQuiz.title}</h3>
                  <button onClick={closeQuiz} className="w-7 h-7 rounded-full grid place-items-center text-sm" style={{ background: 'var(--raised)', color: 'var(--muted)', border: 0, cursor: 'pointer' }}>&times;</button>
                </div>
                <div className="w-full h-2 rounded-full mb-3 overflow-hidden" style={{ background: 'var(--raised)' }}>
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%`, background: 'var(--gold)' }} />
                </div>
                <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>Question {currentQuestion + 1} of {questions.length}</p>
                <div className="mb-6">
                  <p className="font-medium mb-4" style={{ color: 'var(--ink)' }}>{questions[currentQuestion].question}</p>
                  <div className="space-y-2">
                    {questions[currentQuestion].options.map((option, oi) => (
                      <button key={oi} onClick={() => selectAnswer(oi)}
                        style={{
                          width: '100%', textAlign: 'left', padding: '12px 16px', borderRadius: 12, border: '1px solid',
                          borderColor: selectedAnswers[currentQuestion] === oi ? 'var(--gold)' : 'var(--line)',
                          background: selectedAnswers[currentQuestion] === oi ? 'color-mix(in oklab, var(--gold) 10%, var(--surface))' : 'var(--surface)',
                          color: selectedAnswers[currentQuestion] === oi ? 'var(--gold)' : 'var(--ink)',
                          fontSize: 13, cursor: 'pointer', transition: 'all .2s var(--ease)',
                        }}>
                        <span className="font-bold mr-2">{String.fromCharCode(65 + oi)}.</span> {option}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <button onClick={() => setCurrentQuestion(c => Math.max(0, c - 1))} disabled={currentQuestion === 0}
                    style={{ ...style.btn, ...style.secondaryBtn, opacity: currentQuestion === 0 ? 0.3 : 1 }}>
                    <ArrowLeft className="w-3.5 h-3.5" /> Previous
                  </button>
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>{selectedAnswers.filter(a => a !== undefined).length} of {questions.length} answered</span>
                  {currentQuestion < questions.length - 1 ? (
                    <button onClick={() => setCurrentQuestion(c => c + 1)} style={{ ...style.btn, ...style.primaryBtn }}>Next <ArrowRight className="w-3.5 h-3.5" /></button>
                  ) : (
                    <button onClick={submitQuiz} disabled={selectedAnswers.filter(a => a !== undefined).length < questions.length}
                      style={{ ...style.btn, background: 'var(--green)', color: 'var(--surface)', opacity: selectedAnswers.filter(a => a !== undefined).length < questions.length ? 0.5 : 1 }}>
                      Submit <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <div className={`text-5xl mb-3 ${score === questions.length ? 'animate-float' : ''}`}>
                  {score === questions.length ? '🎉' : score >= questions.length / 2 ? '👏' : '💪'}
                </div>
                <h3 className="font-bold text-xl mb-1" style={{ color: 'var(--ink)' }}>Quiz Complete!</h3>
                <p className="text-sm mb-2" style={{ color: 'var(--muted)' }}>{selectedQuiz.title} · {Math.round((score / questions.length) * 100)}%</p>
                <div className="text-4xl font-bold mb-6" style={{ color: score === questions.length ? 'var(--gold)' : 'var(--green)' }}>
                  {score}/{questions.length}
                </div>
                <div className="text-left space-y-2 mb-6">
                  {questions.map((q, qi) => {
                    const ua = selectedAnswers[qi]; const correct = ua === q.correct_index
                    return (
                      <div key={q.id} className="p-3 rounded-xl" style={{ border: '1px solid', borderColor: correct ? 'color-mix(in oklab, var(--green) 30%, transparent)' : 'color-mix(in oklab, var(--red) 30%, transparent)', background: correct ? 'color-mix(in oklab, var(--green) 6%, var(--surface))' : 'color-mix(in oklab, var(--red) 6%, var(--surface))' }}>
                        <div className="flex items-start gap-2">
                          {correct ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--green)' }} /> : <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--red)' }} />}
                          <div>
                            <p className="text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>{q.question}</p>
                            <p className="text-xs" style={{ color: 'var(--muted)' }}>Your answer: <span style={{ color: correct ? 'var(--green)' : 'var(--red)' }}>{q.options[ua] || 'Not answered'}</span></p>
                            {!correct && <p className="text-xs mt-0.5" style={{ color: 'var(--green)' }}>Correct: {q.options[q.correct_index]}</p>}
                            {q.explanation && <p className="text-xs mt-1 italic" style={{ color: 'var(--muted)' }}>{q.explanation}</p>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex flex-wrap gap-3 justify-center">
                  <button onClick={closeQuiz} style={{ ...style.btn, ...style.secondaryBtn }}>Back to Quizzes</button>
                  {selectedQuiz?.id !== 'random' ? (
                    <>
                      <button onClick={() => startQuiz(selectedQuiz!)} style={{ ...style.btn, ...style.primaryBtn }}><RotateCcw className="w-3.5 h-3.5" /> Retry</button>
                      <button onClick={generateAiQuiz} disabled={aiGenerating}
                        style={{ ...style.btn, background: 'linear-gradient(135deg, var(--gold), var(--green))', color: 'var(--night)', opacity: aiGenerating ? 0.6 : 1 }}>
                        {aiGenerating ? <><div className="animate-spin w-3.5 h-3.5 border-2 border-night border-t-transparent rounded-full" /> Generating...</> : <><Sparkles className="w-3.5 h-3.5" /> AI Quiz</>}
                      </button>
                    </>
                  ) : (
                    <button onClick={startRandomQuiz} disabled={aiGenerating}
                      style={{ ...style.btn, background: 'linear-gradient(135deg, var(--gold), var(--green))', color: 'var(--night)', opacity: aiGenerating ? 0.6 : 1 }}>
                      {aiGenerating ? <><div className="animate-spin w-3.5 h-3.5 border-2 border-night border-t-transparent rounded-full" /> Next Random...</> : <><Sparkles className="w-3.5 h-3.5" /> New Random Quiz</>}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
