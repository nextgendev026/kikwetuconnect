'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar, Clock, MapPin, Star, Send, X, ChevronLeft, ChevronRight, Video, RefreshCw, AlertTriangle, Ban, CheckCircle, User, BookOpen, Zap } from 'lucide-react'
import { useSupabase, useUser, toast } from '@/app/providers'
import { Button, Textarea } from '@/components/ui/form'

interface SessionProfile {
  id: string
  full_name: string
  username: string
  avatar_url: string | null
}

interface Session {
  id: string
  student_id: string
  professional_id: string
  post_id: string | null
  status: string
  topic: string
  goal: string | null
  scheduled_at: string | null
  duration_minutes: number
  format: string
  language: string
  notes: string | null
  student_rating: number | null
  student_review: string | null
  tip_amount: number | null
  tip_status: string | null
  created_at: string
  updated_at: string
  student: SessionProfile | null
  professional: SessionProfile | null
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  requested: { bg: 'bg-[var(--gold)]/15', text: 'text-[var(--gold)]', label: 'Requested' },
  accepted: { bg: 'bg-[var(--green)]/15', text: 'text-[var(--green)]', label: 'Accepted' },
  rescheduled: { bg: 'bg-[var(--earth)]/15', text: 'text-[var(--earth)]', label: 'Rescheduled' },
  active: { bg: 'bg-[var(--green)]/20', text: 'text-[var(--green)]', label: 'Active' },
  completed: { bg: 'bg-[var(--green)]/10', text: 'text-[var(--green)]', label: 'Completed' },
  cancelled: { bg: 'bg-[var(--red)]/10', text: 'text-[var(--red)]', label: 'Cancelled' },
  'no-show': { bg: 'bg-[var(--red)]/15', text: 'text-[var(--red)]', label: 'No-show' },
  disputed: { bg: 'bg-[var(--red)]/20', text: 'text-[var(--red)]', label: 'Disputed' },
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function SessionsPage() {
  const { profile, loading: userLoading } = useUser()
  const supabase = useSupabase()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({})
  const [rateModal, setRateModal] = useState<Session | null>(null)
  const [rating, setRating] = useState(5)
  const [review, setReview] = useState('')
  const [tipModal, setTipModal] = useState<Session | null>(null)
  const [tipAmount, setTipAmount] = useState(100)
  const [calDate, setCalDate] = useState(new Date())

  useEffect(() => {
    if (profile) fetchSessions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  const fetchSessions = async () => {
    if (!profile) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          student:student_id (
            id, full_name, username, avatar_url
          ),
          professional:professional_id (
            id, full_name, username, avatar_url
          )
        `)
        .or(`student_id.eq.${profile.id},professional_id.eq.${profile.id}`)
        .order('scheduled_at', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setSessions((data || []) as unknown as Session[])
    } catch (err) {
      console.error('Error fetching sessions:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (sessionId: string, status: string) => {
    try {
      const { error } = await supabase.from('sessions').update({ status, updated_at: new Date().toISOString() }).eq('id', sessionId)
      if (error) throw error
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status } : s))
      toast(`Session ${status}`)
    } catch {
      toast('Failed to update session')
    }
  }

  const saveNotes = async (sessionId: string) => {
    setSavingNotes(prev => ({ ...prev, [sessionId]: true }))
    try {
      const { error } = await supabase.from('sessions').update({ notes: notes[sessionId] }).eq('id', sessionId)
      if (error) throw error
      toast('Notes saved')
    } catch {
      toast('Failed to save notes')
    } finally {
      setSavingNotes(prev => ({ ...prev, [sessionId]: false }))
    }
  }

  const handleRate = async () => {
    if (!rateModal) return
    try {
      const { error } = await supabase.from('sessions').update({
        student_rating: rating,
        student_review: review,
      }).eq('id', rateModal.id)
      if (error) throw error
      setSessions(prev => prev.map(s => s.id === rateModal.id ? { ...s, student_rating: rating, student_review: review } : s))
      toast('Rating submitted')
      setRateModal(null)
      setReview('')
    } catch {
      toast('Failed to submit rating')
    }
  }

  const handleTip = async () => {
    if (!tipModal || !profile) return
    try {
      const fee = Math.round(tipAmount * 0.1)
      const { error } = await supabase.from('tips').insert({
        sender_id: profile.id,
        professional_id: tipModal.professional_id,
        session_id: tipModal.id,
        amount: tipAmount,
        fee,
        net_amount: tipAmount - fee,
      })
      if (error) throw error
      await supabase.from('sessions').update({ tip_amount: tipAmount, tip_status: 'sent' }).eq('id', tipModal.id)
      toast(`Tip of KSh ${tipAmount} sent`)
      setTipModal(null)
    } catch {
      toast('Failed to send tip')
    }
  }

  const filteredSessions = statusFilter === 'all'
    ? sessions
    : sessions.filter(s => s.status === statusFilter)

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const formatDate = (d: string | null) => {
    if (!d) return 'TBD'
    return new Date(d).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatTime = (d: string | null) => {
    if (!d) return ''
    return new Date(d).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
  }

  const calMonth = calDate.getMonth()
  const calYear = calDate.getFullYear()
  const firstDay = new Date(calYear, calMonth, 1).getDay()
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const calDays = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const calStart = Array.from({ length: firstDay }, (_, i) => null)

  const sessionsOnDay = (day: number) =>
    filteredSessions.filter(s => {
      if (!s.scheduled_at) return false
      const d = new Date(s.scheduled_at)
      return d.getDate() === day && d.getMonth() === calMonth && d.getFullYear() === calYear
    })

  if (userLoading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-2 border-green border-t-transparent rounded-full" /></div>

  return (
    <>
      <section className="page-head flex items-center justify-between">
        <div>
          <h1 className="page-title">Sessions</h1>
          <p className="text-muted text-sm">Manage your learning sessions</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setView('list')}
            className={`px-3 py-1.5 rounded-[10px] text-xs font-medium transition-colors ${view === 'list' ? 'bg-[var(--green)] text-[var(--night)]' : 'bg-[var(--surface)] text-[var(--muted)] border border-[var(--line)]'}`}
          >
            List
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`px-3 py-1.5 rounded-[10px] text-xs font-medium transition-colors ${view === 'calendar' ? 'bg-[var(--green)] text-[var(--night)]' : 'bg-[var(--surface)] text-[var(--muted)] border border-[var(--line)]'}`}
          >
            Calendar
          </button>
        </div>
      </section>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1 mb-6">
        {['all', 'requested', 'accepted', 'active', 'completed', 'cancelled', 'rescheduled', 'no-show', 'disputed'].map(st => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === st
                ? 'bg-[var(--green)] text-[var(--night)]'
                : 'bg-[var(--surface)] text-[var(--muted)] hover:text-cream border border-[var(--line)]'
            }`}
          >
            {st === 'all' ? 'All' : st.charAt(0).toUpperCase() + st.slice(1).replace('-', ' ')}
          </button>
        ))}
      </div>

      {view === 'calendar' ? (
        /* Calendar View */
        <div className="card section">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCalDate(new Date(calYear, calMonth - 1, 1))} className="p-1.5 rounded-[8px] text-[var(--muted)] hover:text-cream hover:bg-[var(--raised)]">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-sm">{MONTHS[calMonth]} {calYear}</span>
            <button onClick={() => setCalDate(new Date(calYear, calMonth + 1, 1))} className="p-1.5 rounded-[8px] text-[var(--muted)] hover:text-cream hover:bg-[var(--raised)]">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-[var(--muted)] font-medium mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calStart.map((_, i) => <div key={`empty-${i}`} />)}
            {calDays.map(day => {
              const daySessions = sessionsOnDay(day)
              return (
                <div key={day} className={`min-h-[60px] rounded-[8px] p-1 ${daySessions.length > 0 ? 'bg-[var(--green)]/10 border border-[var(--green)]/30' : 'border border-transparent'}`}>
                  <span className="text-[10px] font-medium">{day}</span>
                  {daySessions.slice(0, 2).map(s => (
                    <div key={s.id} className="mt-0.5 text-[8px] leading-tight truncate rounded-[4px] px-1 py-0.5 bg-[var(--surface)]" title={s.topic}>
                      {s.topic}
                    </div>
                  ))}
                  {daySessions.length > 2 && (
                    <span className="text-[8px] text-[var(--muted)]">+{daySessions.length - 2} more</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* List View */
        <>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin w-8 h-8 border-2 border-green border-t-transparent rounded-full" />
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="card section text-center py-12">
              <Calendar className="w-12 h-12 text-[var(--muted)] mx-auto mb-4 opacity-50" />
              <p className="text-[var(--muted)] mb-2">No sessions found</p>
              <p className="text-xs text-[var(--muted)]">Book a session with an expert to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSessions.map(session => {
                const st = STATUS_STYLES[session.status] || STATUS_STYLES.requested
                const isStudent = profile?.id === session.student_id
                const otherUser = isStudent ? session.professional : session.student
                const isActionable = ['requested', 'accepted', 'active', 'completed'].includes(session.status)

                return (
                  <div key={session.id} className="card section">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--green)] to-[var(--gold)] flex items-center justify-center text-xs font-bold text-[var(--night)] flex-shrink-0 relative">
                          {otherUser?.avatar_url ? (
                            <img src={otherUser.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" onError={e => { e.currentTarget.style.display = 'none'; const fb = e.currentTarget.parentElement!.querySelector('.af-s'); if (fb) fb.classList.remove('hidden') }} />
                          ) : null}
                          <span className={`af-s ${otherUser?.avatar_url ? 'hidden' : ''}`} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{getInitials(otherUser?.full_name || otherUser?.username || '?')}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Link href={`/profile/${otherUser?.username || ''}`} className="font-bold text-sm hover:underline truncate">
                              {otherUser?.full_name || otherUser?.username || 'Unknown'}
                            </Link>
                            <span className="text-[10px] text-[var(--muted)]">
                              ({isStudent ? 'Expert' : 'Student'})
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold text-cream mt-0.5">{session.topic}</h3>
                          <div className="flex items-center gap-3 mt-1 text-xs text-[var(--muted)]">
                            {session.scheduled_at && (
                              <>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(session.scheduled_at)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(session.scheduled_at)}
                                </span>
                              </>
                            )}
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {session.format}
                            </span>
                          </div>
                          {session.goal && (
                            <p className="text-xs text-[var(--muted)] mt-2 italic">
                              Goal: {session.goal}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-semibold ${st.bg} ${st.text}`}>
                        {st.label}
                      </span>
                    </div>

                    {/* Action buttons */}
                    {isActionable && (
                      <div className="flex flex-wrap gap-2 pt-4 border-t border-[var(--line)]">
                        {(session.status === 'requested' || session.status === 'accepted') && (
                          <>
                            <Button variant="danger" size="sm" onClick={() => updateStatus(session.id, 'cancelled')}>
                              <Ban className="w-3 h-3" />
                              Cancel
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => updateStatus(session.id, 'rescheduled')}>
                              <RefreshCw className="w-3 h-3" />
                              Reschedule
                            </Button>
                          </>
                        )}
                        {session.status === 'active' && (
                          <Button variant="primary" size="sm">
                            <Video className="w-3 h-3" />
                            Join Room
                          </Button>
                        )}
                        {session.status === 'completed' && (
                          <>
                            {!session.student_rating && (
                              <Button variant="gold" size="sm" onClick={() => { setRateModal(session); setRating(session.student_rating || 5) }}>
                                <Star className="w-3 h-3" />
                                Rate
                              </Button>
                            )}
                            <Button variant="primary" size="sm" onClick={() => setTipModal(session)}>
                              <Zap className="w-3 h-3" />
                              Send Tip
                            </Button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Notes section */}
                    <div className="mt-4 pt-4 border-t border-[var(--line)]">
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="w-4 h-4 text-[var(--muted)]" />
                        <span className="text-xs font-medium text-[var(--muted)]">Session Notes</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={notes[session.id] ?? session.notes ?? ''}
                          onChange={e => setNotes(prev => ({ ...prev, [session.id]: e.target.value }))}
                          placeholder="Add notes about this session..."
                          className="flex-1 bg-[var(--surface)] border border-[var(--line)] rounded-[11px] px-3 py-2 text-sm text-cream placeholder-[var(--muted)] focus:outline-none focus:border-[var(--green)]"
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={savingNotes[session.id]}
                          onClick={() => saveNotes(session.id)}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Rate Modal */}
      {rateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 modal-center-scroll">
          <div className="bg-[var(--surface)] border border-[var(--line)] rounded-[18px] p-6 w-full max-w-md animate-sheet">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-cream">Rate Session</h3>
              <button onClick={() => setRateModal(null)} className="p-1 text-[var(--muted)] hover:text-cream">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-[var(--muted)] mb-4">How was your session with {rateModal.professional?.full_name}?</p>
            <div className="flex items-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setRating(n)} className="p-1">
                  <Star className={`w-8 h-8 ${n <= rating ? 'text-[var(--gold)]' : 'text-[var(--line)]'}`} fill={n <= rating ? 'var(--gold)' : 'none'} />
                </button>
              ))}
            </div>
            <Textarea
              value={review}
              onChange={e => setReview(e.target.value)}
              placeholder="Leave a review (optional)"
              rows={3}
            />
            <div className="flex gap-2 mt-4">
              <Button variant="secondary" className="flex-1" onClick={() => setRateModal(null)}>Cancel</Button>
              <Button className="flex-1" onClick={handleRate}>Submit Rating</Button>
            </div>
          </div>
        </div>
      )}

      {/* Tip Modal */}
      {tipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 modal-center-scroll">
          <div className="bg-[var(--surface)] border border-[var(--line)] rounded-[18px] p-6 w-full max-w-md animate-sheet">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-cream">Send Tip</h3>
              <button onClick={() => setTipModal(null)} className="p-1 text-[var(--muted)] hover:text-cream">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-[var(--muted)] mb-4">
              Show appreciation to {tipModal.professional?.full_name} for their help
            </p>
            <div className="flex gap-2 mb-4">
              {[50, 100, 200, 500].map(amt => (
                <button
                  key={amt}
                  onClick={() => setTipAmount(amt)}
                  className={`flex-1 py-3 rounded-[11px] text-sm font-bold transition-colors ${
                    tipAmount === amt
                      ? 'bg-[var(--gold)] text-[var(--night)]'
                      : 'bg-[var(--raised)] text-cream border border-[var(--line)] hover:border-[var(--gold)]'
                  }`}
                >
                  KSh {amt}
                </button>
              ))}
            </div>
            <div className="mb-4">
              <label className="text-xs text-[var(--muted)] block mb-1">Custom amount</label>
              <input
                type="number"
                value={tipAmount}
                onChange={e => setTipAmount(Number(e.target.value))}
                className="w-full bg-[var(--night)] border border-[var(--line)] rounded-[11px] px-4 py-2.5 text-sm text-cream focus:outline-none focus:border-[var(--green)]"
              />
            </div>
            <p className="text-xs text-[var(--muted)] mb-4">A 10% platform fee of KSh {Math.round(tipAmount * 0.1)} will be deducted</p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setTipModal(null)}>Cancel</Button>
              <Button className="flex-1" onClick={handleTip}>Send KSh {tipAmount}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
