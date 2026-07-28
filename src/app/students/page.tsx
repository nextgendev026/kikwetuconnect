'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSupabase, useUser, toast } from '@/app/providers'
import { BookOpen, MessageCircle, Award, TrendingUp, Zap, Calendar, Clock, Users, Star, ChevronRight, Coins, BarChart3, Flame, X } from 'lucide-react'

interface StudentQuestion {
  id: string; title: string | null; content: string; user_id: string; answers_count: number; upvotes_count: number; bounty_tokens: number; created_at: string
  profiles: { id: string; full_name: string; username: string; avatar_url: string | null } | null
}

interface Professional {
  id: string; user_id: string; title: string; expertise: string[]; county: string; rating: number; rate: number
  profiles: { id: string; full_name: string; username: string; is_verified_expert: boolean } | null
}

interface Quiz {
  id: string; title: string; description: string; category: string; difficulty: string; question_count: number; estimated_time_minutes: number; heshima_reward: number
}

export default function StudentsPage() {
  const supabase = useSupabase()
  const { profile, loading: userLoading } = useUser()
  const [questions, setQuestions] = useState<StudentQuestion[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [bookingPro, setBookingPro] = useState<Professional | null>(null)
  const [bookingTopic, setBookingTopic] = useState('')
  const [bookingGoal, setBookingGoal] = useState('')
  const [sendingBooking, setSendingBooking] = useState(false)

  useEffect(() => {
    if (userLoading) return
    fetchStudentData()
  }, [userLoading])

  const fetchStudentData = async () => {
    setLoading(true)
    try {
      const [qRes, pRes, quizRes] = await Promise.all([
        supabase.from('posts').select(`*, profiles:user_id (id, full_name, username, avatar_url)`).eq('post_type', 'inquiry').order('created_at', { ascending: false }).limit(10),
        supabase.from('professionals').select(`*, profiles:user_id (id, full_name, username, is_verified_expert)`).eq('status', 'approved').order('rating', { ascending: false }).limit(4),
        supabase.from('quizzes').select('*').order('created_at', { ascending: false }).limit(4),
      ])
      if (qRes.data) setQuestions(qRes.data as unknown as StudentQuestion[])
      if (pRes.data) setProfessionals(pRes.data as unknown as Professional[])
      if (quizRes.data) setQuizzes(quizRes.data as Quiz[])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleBookSession = async () => {
    if (!profile) return toast('Sign in to book a session')
    if (!bookingPro || !bookingTopic.trim()) return toast('Topic is required')
    setSendingBooking(true)
    try {
      const { error } = await supabase.from('sessions').insert({
        student_id: profile.id,
        professional_id: bookingPro.user_id,
        topic: bookingTopic.trim(),
        goal: bookingGoal.trim() || null,
        status: 'requested',
        format: 'video',
        language: 'English',
      })
      if (error) throw error
      toast('Session requested! The professional will respond shortly.')
      setBookingPro(null); setBookingTopic(''); setBookingGoal('')
    } catch { toast('Failed to book session') }
    finally { setSendingBooking(false) }
  }

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const formatDate = (d: string) => { const date = new Date(d); const now = new Date(); const diff = now.getTime() - date.getTime(); if (diff < 86400000) return 'Today'; if (diff < 172800000) return 'Yesterday'; return date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) }

  if (userLoading || loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-2 border-green border-t-transparent rounded-full" /></div>

  return (
    <div className="pb-8">
      {/* Hero */}
      <section className="rounded-[20px] bg-gradient-to-br from-[oklch(21%_.03_151)] to-[oklch(14%_.025_151)] border border-[oklch(55%_.13_151)]/30 p-6 mb-8 animate-rise">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[oklch(55%_.13_151)] to-[oklch(75%_.14_84)] flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-7 h-7 text-[oklch(14%_.025_151)]" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-cream">Your Learning Loop</h1>
            <p className="text-sm text-[oklch(65%_.028_151)] mt-1 leading-relaxed">Ask questions, earn Heshima, grow your knowledge. Every answer is a step forward.</p>
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <Link href="/create" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[11px] bg-[oklch(75%_.14_84)] text-[oklch(14%_.025_151)] text-sm font-bold hover:opacity-90 transition-opacity">
                <MessageCircle className="w-4 h-4" /> Ask the Circle
              </Link>
              <Link href="/professionals" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[11px] border border-[oklch(29%_.025_151)] text-sm font-medium text-[oklch(65%_.028_151)] hover:text-cream transition-colors">
                <Zap className="w-4 h-4" /> Find a Mentor
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div className="rounded-[14px] p-4 bg-[oklch(18%_.028_151)] border border-[oklch(29%_.025_151)]">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-[oklch(55%_.13_151)]" />
            <span className="text-xs text-[oklch(65%_.028_151)]">Progress</span>
          </div>
          <div className="text-2xl font-bold text-cream">68%</div>
          <div className="w-full bg-[oklch(29%_.025_151)] rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[oklch(55%_.13_151)] to-[oklch(75%_.14_84)] rounded-full" style={{ width: '68%' }} />
          </div>
        </div>
        <div className="rounded-[14px] p-4 bg-[oklch(18%_.028_151)] border border-[oklch(29%_.025_151)]">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-4 h-4 text-[oklch(75%_.14_84)]" />
            <span className="text-xs text-[oklch(65%_.028_151)]">Streak</span>
          </div>
          <div className="text-2xl font-bold text-[oklch(75%_.14_84)]">7 days</div>
          <p className="text-[10px] text-[oklch(65%_.028_151)] mt-1">Keep it going!</p>
        </div>
        <div className="rounded-[14px] p-4 bg-[oklch(18%_.028_151)] border border-[oklch(29%_.025_151)]">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-[oklch(55%_.13_151)]" />
            <span className="text-xs text-[oklch(65%_.028_151)]">Heshima</span>
          </div>
          <div className="text-2xl font-bold text-[oklch(55%_.13_151)]">{profile?.heshima_rating || 0}</div>
          <p className="text-[10px] text-[oklch(65%_.028_151)] mt-1">Earned from answers</p>
        </div>
        <div className="rounded-[14px] p-4 bg-[oklch(18%_.028_151)] border border-[oklch(29%_.025_151)]">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-[oklch(48%_.10_55)]" />
            <span className="text-xs text-[oklch(65%_.028_151)]">Sessions</span>
          </div>
          <div className="text-2xl font-bold text-[oklch(48%_.10_55)]">0</div>
          <p className="text-[10px] text-[oklch(65%_.028_151)] mt-1">Book a mentor</p>
        </div>
      </div>

      {/* Open Questions */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Open Questions</h2>
          <Link href="/create" className="text-xs text-[oklch(75%_.14_84)] font-medium flex items-center gap-1 hover:underline"><MessageCircle className="w-3 h-3" /> Ask a question</Link>
        </div>
        {questions.length === 0 ? (
          <div className="card section text-center py-8">
            <MessageCircle className="w-8 h-8 text-[oklch(30%_.025_151)] mx-auto mb-3" />
            <p className="text-xs text-muted">No open questions yet</p>
            <Link href="/create" className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-[8px] bg-[oklch(55%_.13_151)] text-[oklch(14%_.025_151)] text-xs font-bold">Be the first to ask</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map(q => {
              const author = q.profiles
              return (
                <Link key={q.id} href={`/posts/${q.id}`} className="block rounded-[14px] p-4 border border-[oklch(29%_.025_151)] bg-[oklch(18%_.028_151)] hover:border-[oklch(75%_.14_84)]/40 transition-all group">
                  <div className="flex items-start gap-3">
                    {author && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[oklch(55%_.13_151)] to-[oklch(75%_.14_84)] flex items-center justify-center text-[10px] font-bold text-[oklch(14%_.025_151)] flex-shrink-0">
                        {getInitials(author.full_name || author.username)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm group-hover:text-[oklch(75%_.14_84)] transition-colors truncate">{q.title || q.content.slice(0, 80)}</h3>
                      <p className="text-xs text-[oklch(65%_.028_151)] mt-1 line-clamp-1">{q.content.slice(0, 120)}</p>
                      <div className="flex items-center gap-4 mt-2.5 text-[10px] text-[oklch(65%_.028_151)]">
                        <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{q.answers_count} answers</span>
                        <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{q.upvotes_count} views</span>
                        {q.bounty_tokens > 0 && <span className="flex items-center gap-1 text-[oklch(75%_.14_84)] font-medium"><Coins className="w-3 h-3" />{q.bounty_tokens} tokens</span>}
                        <span>{formatDate(q.created_at)}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[oklch(65%_.028_151)] group-hover:text-[oklch(75%_.14_84)] transition-colors flex-shrink-0 mt-1" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Recommended Quizzes */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Recommended Quizzes</h2>
          <Link href="/quizzes" className="text-xs text-[oklch(75%_.14_84)] font-medium flex items-center gap-1 hover:underline">View all <ChevronRight className="w-3 h-3" /></Link>
        </div>
        {quizzes.length === 0 ? (
          <div className="card section text-center py-8">
            <BookOpen className="w-8 h-8 text-[oklch(30%_.025_151)] mx-auto mb-3" />
            <p className="text-xs text-muted">No quizzes yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quizzes.map(q => (
              <div key={q.id} className="rounded-[14px] p-4 border border-[oklch(29%_.025_151)] bg-[oklch(18%_.028_151)]">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-[10px] bg-[oklch(55%_.13_151)]/20 flex items-center justify-center flex-shrink-0">
                    <Award className="w-5 h-5 text-[oklch(55%_.13_151)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate">{q.title}</h3>
                    <p className="text-xs text-[oklch(65%_.028_151)] mt-0.5 line-clamp-2">{q.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-[oklch(65%_.028_151)]">
                      <span>{q.question_count} questions</span>
                      <span>{q.estimated_time_minutes} min</span>
                      <span className="text-[oklch(55%_.13_151)] font-medium">+{q.heshima_reward} Heshima</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Professional Recommendations */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Recommended Professionals</h2>
          <Link href="/professionals" className="text-xs text-[oklch(75%_.14_84)] font-medium flex items-center gap-1 hover:underline">View all <ChevronRight className="w-3 h-3" /></Link>
        </div>
        {professionals.length === 0 ? (
          <div className="card section text-center py-8">
            <Users className="w-8 h-8 text-[oklch(30%_.025_151)] mx-auto mb-3" />
            <p className="text-xs text-muted">No professionals available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {professionals.map(pro => {
              const p = pro.profiles
              if (!p) return null
              return (
                <div key={pro.id} className="rounded-[14px] p-4 border border-[oklch(29%_.025_151)] bg-[oklch(18%_.028_151)]">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[oklch(55%_.13_151)] to-[oklch(75%_.14_84)] flex items-center justify-center text-xs font-bold text-[oklch(14%_.025_151)] flex-shrink-0">
                      {getInitials(p.full_name || p.username)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/profile/${p.username}`} className="font-bold text-sm hover:underline truncate">{p.full_name || p.username}</Link>
                        {p.is_verified_expert && <Zap className="w-3.5 h-3.5 text-[oklch(55%_.13_151)] flex-shrink-0" />}
                      </div>
                      <p className="text-[11px] text-[oklch(75%_.14_84)] mt-0.5">{pro.title}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[oklch(65%_.028_151)]">
                        <span>{pro.county}</span>
                        <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-[oklch(75%_.14_84)]" fill="oklch(75%_.14_84)" />{pro.rating.toFixed(1)}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {pro.expertise.slice(0, 2).map(e => <span key={e} className="text-[9px] px-2 py-0.5 rounded-full bg-[oklch(21%_.03_151)] text-[oklch(65%_.028_151)]">{e}</span>)}
                      </div>
                      <button onClick={() => setBookingPro(pro)} className="mt-3 w-full py-2 rounded-[8px] bg-[oklch(55%_.13_151)] text-[oklch(14%_.025_151)] text-xs font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-1">
                        <Calendar className="w-3 h-3" /> Book Session
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Session Booking Modal */}
      {bookingPro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setBookingPro(null)} />
          <div className="relative w-full max-w-md rounded-[18px] bg-[oklch(18%_.028_151)] border border-[oklch(29%_.025_151)] p-6 animate-rise">
            <button onClick={() => setBookingPro(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[oklch(21%_.03_151)] flex items-center justify-center hover:bg-[oklch(29%_.025_151)] transition-colors">
              <X className="w-4 h-4" />
            </button>
            <h2 className="font-bold text-lg mb-1">Book a Session</h2>
            <p className="text-xs text-[oklch(65%_.028_151)] mb-5">with {bookingPro.profiles?.full_name || 'Professional'}</p>

            <label className="text-xs text-[oklch(65%_.028_151)] font-medium block mb-1.5">What do you want to learn?</label>
            <input type="text" placeholder="e.g. M-Pesa API integration" value={bookingTopic} onChange={e => setBookingTopic(e.target.value)}
              className="w-full bg-[oklch(14%_.025_151)] border border-[oklch(29%_.025_151)] rounded-[11px] px-3 py-2.5 text-sm text-cream placeholder-[oklch(65%_.028_151)] focus:outline-none focus:border-[oklch(55%_.13_151)] mb-4" />

            <label className="text-xs text-[oklch(65%_.028_151)] font-medium block mb-1.5">Your goal (optional)</label>
            <textarea placeholder="What do you hope to achieve?" value={bookingGoal} onChange={e => setBookingGoal(e.target.value)} rows={3}
              className="w-full bg-[oklch(14%_.025_151)] border border-[oklch(29%_.025_151)] rounded-[11px] px-3 py-2.5 text-sm text-cream placeholder-[oklch(65%_.028_151)] focus:outline-none focus:border-[oklch(55%_.13_151)] resize-none mb-5" />

            <div className="flex items-center justify-between mb-5 text-xs text-[oklch(65%_.028_151)]">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Flexibly scheduled</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> 45 min session</span>
              <span className="text-[oklch(75%_.14_84)] font-medium">KSh {bookingPro.rate}</span>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setBookingPro(null)} className="flex-1 py-2.5 rounded-[11px] border border-[oklch(29%_.025_151)] text-[oklch(65%_.028_151)] text-sm font-medium hover:text-cream transition-colors">Cancel</button>
              <button onClick={handleBookSession} disabled={sendingBooking || !bookingTopic.trim()}
                className="flex-1 py-2.5 rounded-[11px] bg-[oklch(75%_.14_84)] text-[oklch(14%_.025_151)] text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
                {sendingBooking ? 'Sending...' : 'Request Session'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="rounded-[18px] bg-gradient-to-br from-[oklch(21%_.03_151)] to-[oklch(14%_.025_151)] border border-[oklch(75%_.14_84)]/30 p-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[oklch(75%_.14_84)]/20 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-6 h-6 text-[oklch(75%_.14_84)]" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-sm">Stuck on something?</h3>
            <p className="text-xs text-[oklch(65%_.028_151)] mt-1">Ask the circle — get answers from verified experts and peers</p>
            <Link href="/create" className="inline-flex items-center gap-1.5 mt-3 px-5 py-2 rounded-[8px] bg-[oklch(75%_.14_84)] text-[oklch(14%_.025_151)] text-xs font-bold hover:opacity-90 transition-opacity">
              Ask the Circle
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
