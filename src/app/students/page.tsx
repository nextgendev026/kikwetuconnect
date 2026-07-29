'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSupabase, useUser, toast } from '@/app/providers'
import { BookOpen, MessageCircle, Award, TrendingUp, Zap, Calendar, Clock, Users, Star, ChevronRight, BarChart3, Flame, X, GraduationCap } from 'lucide-react'

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

const style = {
  card: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20, boxShadow: 'var(--card-shadow)' },
  statCard: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 16, boxShadow: 'var(--card-shadow)' },
  miniCard: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 16, boxShadow: 'var(--card-shadow)' },
  input: { width: '100%', background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: 11, padding: '10px 14px', fontSize: 13, color: 'var(--ink)', outline: 'none' },
  btn: { padding: '10px 20px', borderRadius: 11, fontWeight: 700, fontSize: 12, border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all .2s var(--ease)' },
  primaryBtn: { background: 'var(--gold)', color: 'var(--night)' },
  secondaryBtn: { background: 'var(--raised)', color: 'var(--ink)', border: '1px solid var(--line)' },
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

  useEffect(() => { if (!userLoading) fetchStudentData() }, [userLoading])

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
      const { error } = await supabase.from('sessions').insert({ student_id: profile.id, professional_id: bookingPro.user_id, topic: bookingTopic.trim(), goal: bookingGoal.trim() || null, status: 'requested', format: 'video', language: 'English' })
      if (error) throw error
      toast('Session requested! The professional will respond shortly.')
      setBookingPro(null); setBookingTopic(''); setBookingGoal('')
    } catch { toast('Failed to book session') }
    finally { setSendingBooking(false) }
  }

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const formatDate = (d: string) => { const date = new Date(d); const now = new Date(); const diff = now.getTime() - date.getTime(); if (diff < 86400000) return 'Today'; if (diff < 172800000) return 'Yesterday'; return date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) }

  if (userLoading || loading) return <div className="flex items-center justify-center min-h-[80vh]"><div className="animate-spin w-8 h-8 border-2" style={{ borderColor: 'var(--green)', borderTopColor: 'transparent', borderRadius: '50%' }} /></div>

  return (
    <div className="pb-8 animate-fade-in-up">
      {/* Hero */}
      <section className="rounded-[20px] p-6 mb-8 animate-rise" style={{ background: 'linear-gradient(135deg, var(--raised), var(--surface))', border: '1px solid', borderColor: 'color-mix(in oklab, var(--green) 30%, transparent)' }}>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--green), var(--gold))', color: 'var(--night)' }}>
            <GraduationCap className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--ink)' }}>Your Learning Loop</h1>
            <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--muted)' }}>Ask questions, earn Heshima, grow your knowledge. Every answer is a step forward.</p>
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <Link href="/create" style={{ ...style.btn, ...style.primaryBtn }}>
                <MessageCircle className="w-4 h-4" /> Ask the Circle
              </Link>
              <Link href="/professionals" style={style.secondaryBtn}>
                <Zap className="w-4 h-4" /> Find a Mentor
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div style={style.statCard}>
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4" style={{ color: 'var(--green)' }} />
            <span className="text-xs" style={{ color: 'var(--muted)' }}>Progress</span>
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>68%</div>
          <div className="w-full rounded-full h-1.5 mt-2 overflow-hidden" style={{ background: 'var(--raised)' }}>
            <div className="h-full rounded-full" style={{ width: '68%', background: 'linear-gradient(90deg, var(--green), var(--gold))' }} />
          </div>
        </div>
        <div style={style.statCard}>
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-4 h-4" style={{ color: 'var(--gold)' }} />
            <span className="text-xs" style={{ color: 'var(--muted)' }}>Streak</span>
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--gold)' }}>7 days</div>
          <p className="text-[10px] mt-1" style={{ color: 'var(--muted)' }}>Keep it going!</p>
        </div>
        <div style={style.statCard}>
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4" style={{ color: 'var(--green)' }} />
            <span className="text-xs" style={{ color: 'var(--muted)' }}>Heshima</span>
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--green)' }}>{profile?.heshima_rating || 0}</div>
          <p className="text-[10px] mt-1" style={{ color: 'var(--muted)' }}>Earned from answers</p>
        </div>
        <div style={style.statCard}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4" style={{ color: 'var(--earth)' }} />
            <span className="text-xs" style={{ color: 'var(--muted)' }}>Sessions</span>
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--earth)' }}>0</div>
          <p className="text-[10px] mt-1" style={{ color: 'var(--muted)' }}>Book a mentor</p>
        </div>
      </div>

      {/* Open Questions */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold" style={{ color: 'var(--ink)' }}>Open Questions</h2>
          <Link href="/create" className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--gold)' }}><MessageCircle className="w-3 h-3" /> Ask a question</Link>
        </div>
        {questions.length === 0 ? (
          <div style={style.card} className="text-center py-8">
            <MessageCircle className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--muted)', opacity: 0.3 }} />
            <p className="text-xs" style={{ color: 'var(--muted)' }}>No open questions yet</p>
            <Link href="/create" style={{ ...style.btn, ...style.primaryBtn, marginTop: 12 }}>Be the first to ask</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map(q => {
              const author = q.profiles
              return (
                <Link key={q.id} href={`/posts/${q.id}`} style={style.miniCard} className="card-hover block transition-colors">
                  <div className="flex items-start gap-3">
                    {author && (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--green), var(--gold))', color: 'var(--night)' }}>
                        {getInitials(author.full_name || author.username)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm" style={{ color: 'var(--ink)' }}>{q.title || q.content.slice(0, 80)}</h3>
                      <p className="text-xs mt-1 line-clamp-1" style={{ color: 'var(--muted)' }}>{q.content.slice(0, 120)}</p>
                      <div className="flex items-center gap-4 mt-2.5 text-[10px]" style={{ color: 'var(--muted)' }}>
                        <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{q.answers_count} answers</span>
                        <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{q.upvotes_count} views</span>
                        {q.bounty_tokens > 0 && <span className="flex items-center gap-1 font-medium" style={{ color: 'var(--gold)' }}>🎯 {q.bounty_tokens} tokens</span>}
                        <span>{formatDate(q.created_at)}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 flex-shrink-0 mt-1" style={{ color: 'var(--muted)' }} />
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
          <h2 className="font-bold" style={{ color: 'var(--ink)' }}>Recommended Quizzes</h2>
          <Link href="/quizzes" className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--gold)' }}>View all <ChevronRight className="w-3 h-3" /></Link>
        </div>
        {quizzes.length === 0 ? (
          <div style={style.card} className="text-center py-8">
            <BookOpen className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--muted)', opacity: 0.3 }} />
            <p className="text-xs" style={{ color: 'var(--muted)' }}>No quizzes yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quizzes.map(q => (
              <div key={q.id} style={style.miniCard}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: 'color-mix(in oklab, var(--green) 20%, transparent)' }}>
                    <Award className="w-5 h-5" style={{ color: 'var(--green)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm" style={{ color: 'var(--ink)' }}>{q.title}</h3>
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--muted)' }}>{q.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px]" style={{ color: 'var(--muted)' }}>
                      <span>{q.question_count} questions</span>
                      <span>{q.estimated_time_minutes} min</span>
                      <span className="font-medium" style={{ color: 'var(--green)' }}>+{q.heshima_reward} Heshima</span>
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
          <h2 className="font-bold" style={{ color: 'var(--ink)' }}>Recommended Professionals</h2>
          <Link href="/professionals" className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--gold)' }}>View all <ChevronRight className="w-3 h-3" /></Link>
        </div>
        {professionals.length === 0 ? (
          <div style={style.card} className="text-center py-8">
            <Users className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--muted)', opacity: 0.3 }} />
            <p className="text-xs" style={{ color: 'var(--muted)' }}>No professionals available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {professionals.map(pro => {
              const p = pro.profiles
              if (!p) return null
              return (
                <div key={pro.id} style={style.miniCard}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--green), var(--gold))', color: 'var(--night)' }}>
                      {getInitials(p.full_name || p.username)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/profile/${p.username}`} className="font-bold text-sm truncate" style={{ color: 'var(--ink)' }}>{p.full_name || p.username}</Link>
                        {p.is_verified_expert && <Zap className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--green)' }} />}
                      </div>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--gold)' }}>{pro.title}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px]" style={{ color: 'var(--muted)' }}>
                        <span>{pro.county}</span>
                        <span className="flex items-center gap-0.5"><Star className="w-3 h-3" style={{ color: 'var(--gold)' }} />{pro.rating.toFixed(1)}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {pro.expertise.slice(0, 2).map(e => <span key={e} className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: 'var(--raised)', color: 'var(--muted)' }}>{e}</span>)}
                      </div>
                      <button onClick={() => setBookingPro(pro)} style={{ ...style.btn, ...style.primaryBtn, width: '100%', justifyContent: 'center', marginTop: 8, fontSize: 10, padding: '8px 12px' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)' }}
                        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'color-mix(in oklab, var(--night) 80%, transparent)' }}>
          <div className="animate-rise" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 24, width: 'min(480px, 100%)' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-lg" style={{ color: 'var(--ink)' }}>Book a Session</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>with {bookingPro.profiles?.full_name || 'Professional'}</p>
              </div>
              <button onClick={() => setBookingPro(null)} className="w-8 h-8 rounded-full grid place-items-center" style={{ background: 'var(--raised)', color: 'var(--muted)', border: 0, cursor: 'pointer' }}>&times;</button>
            </div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>What do you want to learn?</label>
            <input type="text" placeholder="e.g. M-Pesa API integration" value={bookingTopic} onChange={e => setBookingTopic(e.target.value)} style={style.input} className="!mb-3" />
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>Your goal (optional)</label>
            <textarea placeholder="What do you hope to achieve?" value={bookingGoal} onChange={e => setBookingGoal(e.target.value)} rows={3}
              style={{ ...style.input, resize: 'none' }} className="!mb-4" />
            <div className="flex items-center justify-between mb-4 text-xs" style={{ color: 'var(--muted)' }}>
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Flexibly scheduled</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> 45 min session</span>
              <span className="font-medium" style={{ color: 'var(--gold)' }}>KSh {bookingPro.rate}</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setBookingPro(null)} style={{ ...style.btn, ...style.secondaryBtn, flex: 1, justifyContent: 'center' }}>Cancel</button>
              <button onClick={handleBookSession} disabled={sendingBooking || !bookingTopic.trim()}
                style={{ ...style.btn, ...style.primaryBtn, flex: 1, justifyContent: 'center', opacity: (sendingBooking || !bookingTopic.trim()) ? 0.5 : 1 }}>
                {sendingBooking ? 'Sending...' : 'Request Session'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="rounded-[18px] p-5" style={{ background: 'linear-gradient(135deg, var(--raised), var(--surface))', border: '1px solid', borderColor: 'color-mix(in oklab, var(--gold) 30%, transparent)' }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'color-mix(in oklab, var(--gold) 20%, transparent)' }}>
            <MessageCircle className="w-6 h-6" style={{ color: 'var(--gold)' }} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-sm" style={{ color: 'var(--ink)' }}>Stuck on something?</h3>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Ask the circle — get answers from verified experts and peers</p>
            <Link href="/create" style={{ ...style.btn, ...style.primaryBtn, marginTop: 8 }}>
              Ask the Circle
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
