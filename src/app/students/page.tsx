'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useSupabase, useUser, toast } from '@/app/providers'
import { BookOpen, MessageCircle, Award, TrendingUp, Zap, Calendar, Clock, Users, Star, ChevronRight, BarChart3, Flame, X, GraduationCap, Play, StopCircle, Timer, HelpCircle, Check, Search, Plus } from 'lucide-react'

interface HelpRequest { id: string; student_id: string; title: string; description: string; subject: string; budget_heshima: number; status: string; created_at: string; profiles: { id: string; full_name: string; username: string } | null }
interface Session { id: string; request_id: string; expert_id: string; student_id: string; started_at: string; ended_at: string | null; duration_minutes: number | null; heshima_earned: number; status: string; expert_notes: string; student_rating: number; expert: { id: string; full_name: string; username: string } | null; student: { id: string; full_name: string; username: string } | null }
interface Subject { id: string; name: string; icon: string }
interface QuestionPost {
  id: string
  post_type: string
  title: string | null
  content: string
  upvotes_count: number
  answers_count: number
  bounty_tokens: number
  created_at: string
  profiles: { id: string; full_name: string | null; username: string; is_verified_expert: boolean } | null
}

const SUBJECTS = ['Mathematics', 'English', 'Kiswahili', 'Sciences', 'History', 'Geography', 'Business', 'Computer', 'CRE', 'Agriculture', 'Home Science', 'Art']
const s = {
  card: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20, boxShadow: 'var(--card-shadow)' },
  cardSm: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 16 },
  input: { width: '100%', background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: 11, padding: '10px 14px', fontSize: 13, color: 'var(--ink)', outline: 'none' },
  btn: { padding: '10px 20px', borderRadius: 11, fontWeight: 700, fontSize: 12, border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all .2s var(--ease)' },
  primary: { background: 'var(--gold)', color: 'var(--night)' },
  secondary: { background: 'var(--raised)', color: 'var(--ink)', border: '1px solid var(--line)' },
  green: { background: 'var(--green)', color: 'var(--night)' },
}

export default function StudentsPage() {
  const supabase = useSupabase()
  const { profile, loading: userLoading } = useUser()
  const [requests, setRequests] = useState<HelpRequest[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [questions, setQuestions] = useState<QuestionPost[]>([])
  const [questionsLoading, setQuestionsLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'help' | 'sessions' | 'questions'>('help')
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [reqForm, setReqForm] = useState({ title: '', description: '', subject: 'Mathematics', budget: 0 })
  const [submitting, setSubmitting] = useState(false)
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [sessionStart, setSessionStart] = useState<Date | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [assigning, setAssigning] = useState<string | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!userLoading) { fetchRequests(); fetchQuestions(); if (profile) fetchSessions() } }, [userLoading])

  useEffect(() => {
    if (activeSession && sessionStart) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - sessionStart.getTime()) / 1000))
      }, 1000)
      return () => { if (timerRef.current) clearInterval(timerRef.current) }
    }
  }, [activeSession, sessionStart])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const { data } = await supabase.from('student_help_requests').select(`*, profiles:student_id (id, full_name, username)`).eq('status', 'open').order('created_at', { ascending: false }).limit(20)
      if (data) setRequests(data as unknown as HelpRequest[])
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  const fetchSessions = async () => {
    if (!profile) return
    const { data } = await supabase.from('student_sessions').select(`*, expert:expert_id (id, full_name, username), student:student_id (id, full_name, username)`)
      .or(`expert_id.eq.${profile.id},student_id.eq.${profile.id}`).order('created_at', { ascending: false }).limit(20)
    if (data) {
      setSessions(data as unknown as Session[])
      const active = data.find((s: any) => s.status === 'active')
      if (active) { setActiveSession(active as unknown as Session); setSessionStart(new Date(active.started_at)); setElapsed(Math.floor((Date.now() - new Date(active.started_at).getTime()) / 1000)) }
    }
  }

  const fetchQuestions = async () => {
    setQuestionsLoading(true)
    try {
      const { data } = await supabase
        .from('posts')
        .select('id, post_type, title, content, upvotes_count, answers_count, bounty_tokens, created_at, profiles:user_id (id, full_name, username, is_verified_expert)')
        .eq('post_type', 'inquiry')
        .is('space_id', null)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .limit(30)
      if (data) setQuestions(data as unknown as QuestionPost[])
    } catch (err) { console.error(err) } finally { setQuestionsLoading(false) }
  }

  const openQuestionComposer = () => {
    if (!profile) { toast('Sign in first'); return }
    document.dispatchEvent(new CustomEvent('open-create-modal', { detail: { type: 'question' } }))
  }

  const handleCreateRequest = async () => {
    if (!profile) { toast('Sign in first'); return }
    if (!reqForm.title.trim() || !reqForm.description.trim()) { toast('Title and description required'); return }
    setSubmitting(true)
    try {
      const { error } = await supabase.from('student_help_requests').insert({
        student_id: profile.id, title: reqForm.title.trim(), description: reqForm.description.trim(),
        subject: reqForm.subject, budget_heshima: reqForm.budget,
      })
      if (error) throw error
      toast('Help request posted!'); setShowRequestForm(false)
      setReqForm({ title: '', description: '', subject: 'Mathematics', budget: 0 }); fetchRequests()
    } catch (err: any) { toast(err.message || 'Failed') } finally { setSubmitting(false) }
  }

  const handleAssign = async (requestId: string) => {
    if (!profile) { toast('Sign in first'); return }
    setAssigning(requestId)
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to assign')
      toast('Session started! Help the student.'); fetchRequests(); fetchSessions()
    } catch (err: any) { toast(err.message || 'Failed') } finally { setAssigning(null) }
  }

  const handleEndSession = async () => {
    if (!activeSession || !sessionStart) return
    try {
      const res = await fetch('/api/sessions', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: activeSession.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to end session')
      toast(data.message || 'Session completed! Heshima awarded.')
      setActiveSession(null); setSessionStart(null); setElapsed(0)
      if (timerRef.current) clearInterval(timerRef.current)
      fetchSessions()
    } catch (err: any) { toast(err.message || 'Failed') }
  }

  const formatTime = (secs: number) => { const m = Math.floor(secs / 60); const s = secs % 60; return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` }

  if (userLoading) return <div className="flex items-center justify-center min-h-[80vh]"><div className="animate-spin w-8 h-8 border-2" style={{ borderColor: 'var(--green)', borderTopColor: 'transparent', borderRadius: '50%' }} /></div>

  return (
    <div className="pb-8 animate-fade-in-up">
      {/* Hero */}
      <section className="rounded-[20px] p-6 mb-6" style={{ background: 'linear-gradient(135deg, var(--raised), var(--surface))', border: '1px solid', borderColor: 'color-mix(in oklab, var(--green) 30%, transparent)' }}>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--green), var(--gold))', color: 'var(--night)' }}>
            <GraduationCap className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--ink)' }}>Student Learning Loop</h1>
            <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--muted)' }}>Ask for homework help, earn Heshima points helping others, and grow together. Experts get tipped for their time.</p>
            <div className="flex flex-wrap items-center gap-3 mt-4">
              {profile && <button onClick={() => setShowRequestForm(true)} style={{ ...s.btn, ...s.primary }}><HelpCircle className="w-4 h-4" /> Ask for Help</button>}
              <Link href="/quizzes" style={s.secondary}><Award className="w-4 h-4" /> Practice Quizzes</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div style={s.cardSm}>
          <BarChart3 className="w-4 h-4 mb-1" style={{ color: 'var(--green)' }} />
          <div className="text-xl font-bold" style={{ color: 'var(--ink)' }}>{profile?.heshima_rating || 0}</div>
          <p className="text-[10px]" style={{ color: 'var(--muted)' }}>Heshima Points</p>
        </div>
        <div style={s.cardSm}>
          <Flame className="w-4 h-4 mb-1" style={{ color: 'var(--gold-text)' }} />
          <div className="text-xl font-bold" style={{ color: 'var(--gold-text)' }}>{Number(profile?.streak_days) || 0}</div>
          <p className="text-[10px]" style={{ color: 'var(--muted)' }}>Day Streak</p>
        </div>
        <div style={s.cardSm}>
          <Award className="w-4 h-4 mb-1" style={{ color: 'var(--green-text)' }} />
          <div className="text-xl font-bold" style={{ color: 'var(--green-text)' }}>{sessions.filter(s => s.status === 'completed').length}</div>
          <p className="text-[10px]" style={{ color: 'var(--muted)' }}>Sessions Done</p>
        </div>
        <div style={s.cardSm}>
          <Clock className="w-4 h-4 mb-1" style={{ color: 'var(--earth)' }} />
          <div className="text-xl font-bold" style={{ color: 'var(--earth)' }}>{Number(profile?.quizzes_completed) || 0}</div>
          <p className="text-[10px]" style={{ color: 'var(--muted)' }}>Quizzes</p>
        </div>
      </div>

      {/* Active Session Timer */}
      {activeSession && (
        <div style={{ ...s.card, marginBottom: 16, textAlign: 'center', borderColor: 'var(--green)' }}>
          <p className="text-[10px] font-semibold mb-2" style={{ color: 'var(--green-text)' }}>Active Session</p>
          <div className="text-[36px] font-mono font-bold" style={{ color: 'var(--ink)', letterSpacing: 2 }}>{formatTime(elapsed)}</div>
          <p className="text-[11px] mb-4" style={{ color: 'var(--muted)' }}>Helping a student — you earn 2 Heshima per minute</p>
          <button onClick={handleEndSession} style={{ ...s.btn, ...s.green, justifyContent: 'center' }}>
            <StopCircle className="w-4 h-4" /> End Session
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-[12px]" style={{ background: 'var(--raised)' }}>
        {(['help', 'sessions', 'questions'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className="flex-1 py-2 px-3 rounded-[10px] text-[11px] font-semibold transition-all"
            style={tab === t ? { background: 'var(--surface)', color: 'var(--ink)', boxShadow: 'var(--card-shadow)' } : { color: 'var(--muted)' }}>
            {t === 'help' ? `Open Help (${requests.length})` : t === 'sessions' ? `My Sessions (${sessions.length})` : `Questions (${questions.length})`}
          </button>
        ))}
      </div>

      {tab === 'help' && (
        <section>
          {requests.length === 0 ? (
            <div style={s.card} className="text-center py-12">
              <HelpCircle className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--muted)', opacity: 0.3 }} />
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>No open requests</p>
              <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>Be the first to ask for help</p>
              {profile && <button onClick={() => setShowRequestForm(true)} style={{ ...s.btn, ...s.primary }}><Plus className="w-4 h-4" /> Ask for Help</button>}
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map(r => (
                <div key={r.id} style={s.card} className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'color-mix(in oklab, var(--green) 15%, var(--surface))', color: 'var(--green-text)' }}>{r.subject}</span>
                      {r.budget_heshima > 0 && <span className="text-[10px] font-medium" style={{ color: 'var(--gold-text)' }}>🎯 {r.budget_heshima} Heshima</span>}
                    </div>
                    <h3 className="text-[13px] font-bold" style={{ color: 'var(--ink)' }}>{r.title}</h3>
                    <p className="text-[11px] mt-1 line-clamp-2" style={{ color: 'var(--muted)' }}>{r.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px]" style={{ color: 'var(--muted)' }}>
                      <span>by {r.profiles?.full_name || r.profiles?.username || 'Student'}</span>
                      <span>{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    {profile && profile.id !== r.student_id && (
                      <button onClick={() => handleAssign(r.id)} disabled={assigning === r.id}
                        style={{ ...s.btn, padding: '6px 14px', fontSize: 10, marginTop: 8, ...s.primary }}>
                        {assigning === r.id ? '...' : <><Zap className="w-3 h-3" /> Help Student</>}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'sessions' && (
        <section>
          {sessions.length === 0 ? (
            <div style={s.card} className="text-center py-12">
              <Clock className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--muted)', opacity: 0.3 }} />
              <p className="text-sm" style={{ color: 'var(--muted)' }}>No sessions yet. Help a student to start one!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map(ses => {
                const isExpert = ses.expert_id === profile?.id
                return (
                  <div key={ses.id} style={s.card}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>
                          {isExpert ? `With ${ses.student?.full_name || ses.student?.username || 'Student'}` : `With ${ses.expert?.full_name || ses.expert?.username || 'Expert'}`}
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--muted)' }}>
                          {new Date(ses.started_at).toLocaleDateString()} · {ses.duration_minutes ? `${ses.duration_minutes} min` : 'In progress'}
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: ses.status === 'completed' ? 'color-mix(in oklab, var(--green) 20%, var(--surface))' : 'color-mix(in oklab, var(--gold) 20%, var(--surface))', color: ses.status === 'completed' ? 'var(--green-text)' : 'var(--gold-text)' }}>
                        {ses.status}
                      </span>
                    </div>
                    {ses.heshima_earned > 0 && <p className="text-[11px] font-semibold" style={{ color: 'var(--green-text)' }}>+{ses.heshima_earned} Heshima earned</p>}
                    {ses.expert_notes && <p className="text-[10px] mt-1" style={{ color: 'var(--muted)' }}>Notes: {ses.expert_notes}</p>}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Community Questions */}
      {tab === 'questions' && (
        <section>
          <div style={s.cardSm} className="mb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[13px] font-bold" style={{ color: 'var(--ink)' }}>Community Questions</h2>
                <p className="text-[10px]" style={{ color: 'var(--muted)' }}>Stuck on something? Ask the community — classmates and experts answer.</p>
              </div>
              {profile && (
                <button onClick={openQuestionComposer} style={{ ...s.btn, ...s.primary, flexShrink: 0 }}>
                  <Plus className="w-4 h-4" /> Ask
                </button>
              )}
            </div>
          </div>

          {questionsLoading ? (
            <div style={s.card} className="text-center py-10"><div className="animate-spin w-6 h-6 mx-auto border-2" style={{ borderColor: 'var(--green)', borderTopColor: 'transparent', borderRadius: '50%' }} /></div>
          ) : questions.length === 0 ? (
            <div style={s.card} className="text-center py-12">
              <HelpCircle className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--muted)', opacity: 0.3 }} />
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>No questions yet</p>
              <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>Be the first to ask the community</p>
              {profile && <button onClick={openQuestionComposer} style={{ ...s.btn, ...s.primary }}><Plus className="w-4 h-4" /> Ask a Question</button>}
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map(q => (
                <Link key={q.id} href={`/posts/${q.id}`} style={s.card} className="flex items-start gap-3 block hover:opacity-95 transition-opacity">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'color-mix(in oklab, var(--blue) 15%, var(--surface))', color: 'var(--blue-text)' }}>Question</span>
                      {q.bounty_tokens > 0 && <span className="text-[10px] font-medium" style={{ color: 'var(--gold-text)' }}>🎯 {q.bounty_tokens} Heshima</span>}
                    </div>
                    <h3 className="text-[13px] font-bold leading-snug" style={{ color: 'var(--ink)' }}>{q.title || q.content?.slice(0, 120)}</h3>
                    <div className="flex items-center gap-3 mt-2 text-[10px]" style={{ color: 'var(--muted)' }}>
                      <span>{q.profiles?.is_verified_expert ? '✓ ' : ''}{q.profiles?.full_name || q.profiles?.username || 'Student'}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {q.answers_count}</span>
                      <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {q.upvotes_count}</span>
                      <span>{new Date(q.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 mt-1 flex-shrink-0" style={{ color: 'var(--muted)' }} />
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Create Help Request Modal */}
      {showRequestForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-center-scroll" style={{ background: 'color-mix(in oklab, var(--night) 70%, transparent)' }} onClick={() => setShowRequestForm(false)}>
          <div style={{ ...s.card, width: 'min(480px, 100%)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-base" style={{ color: 'var(--ink)' }}>Ask for Help</h3>
              <button onClick={() => setShowRequestForm(false)} style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--muted)' }}>Subject</label>
                <select value={reqForm.subject} onChange={e => setReqForm(p => ({ ...p, subject: e.target.value }))} style={s.input}>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--muted)' }}>Title</label><input value={reqForm.title} onChange={e => setReqForm(p => ({ ...p, title: e.target.value }))} style={s.input} placeholder="What do you need help with?" /></div>
              <div><label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--muted)' }}>Description</label><textarea value={reqForm.description} onChange={e => setReqForm(p => ({ ...p, description: e.target.value }))} style={{ ...s.input, minHeight: 80, resize: 'vertical' }} placeholder="Explain what you're stuck on..." rows={3} /></div>
              <div><label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--muted)' }}>Heshima Tip Offer (optional)</label><input type="number" value={reqForm.budget || ''} onChange={e => setReqForm(p => ({ ...p, budget: parseInt(e.target.value) || 0 }))} style={s.input} placeholder="0" /></div>
              <button onClick={handleCreateRequest} disabled={submitting} style={{ ...s.btn, ...s.primary, width: '100%', justifyContent: 'center' }}>
                {submitting ? 'Posting...' : 'Post Help Request'}
              </button>
              <p className="text-[9px] text-center" style={{ color: 'var(--muted)' }}>Offering Heshima points attracts experienced helpers faster</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty state CTA */}
      {requests.length === 0 && (
        <div className="rounded-[18px] p-5 mt-6" style={{ background: 'linear-gradient(135deg, var(--raised), var(--surface))', border: '1px solid', borderColor: 'color-mix(in oklab, var(--gold) 30%, transparent)' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'color-mix(in oklab, var(--gold) 20%, transparent)' }}>
              <GraduationCap className="w-6 h-6" style={{ color: 'var(--gold)' }} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-sm" style={{ color: 'var(--ink)' }}>Knowledge is power — share it</h3>
              <p className="text-[11px] mt-1" style={{ color: 'var(--muted)' }}>Helping classmates earns you Heshima points and builds your reputation. Experts get tipped for their time.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
