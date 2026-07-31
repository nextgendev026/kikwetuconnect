'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MapPin, Star, Shield, Clock, Search, Filter, Briefcase, BookOpen, Zap, Check, X, ChevronDown, Upload, FileText, Plus } from 'lucide-react'
import { useSupabase, useUser, toast } from '@/app/providers'

interface Professional {
  id: string; user_id: string; title: string; bio: string; expertise: string[]; languages: string[]; county: string; rate: number; currency: string; heshima_rating: number; session_count: number; rating: number; status: string; created_at: string
  profiles: { id: string; full_name: string; username: string; avatar_url: string | null; is_verified_expert: boolean; is_expert: boolean } | null
}

interface ExpertCategory { id: string; name: string; description: string; icon: string }
interface Application { id: string; user_id: string; category_id: string; title: string; qualifications: string; experience: string; certification_urls: string[] | null; status: string; admin_notes: string | null; created_at: string; categories: { name: string; icon: string } | null; profiles: { id: string; full_name: string; username: string } | null }

const ALL_COUNTIES = ['Nairobi', 'Mombasa', 'Kisumu', 'Eldoret', 'Nakuru', 'Kericho', 'Nyeri', 'Kakamega', 'Kisii', 'Machakos', 'Meru', 'Embu', 'Bungoma', 'Siaya', 'Garissa']
const s = {
  card: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20, boxShadow: 'var(--card-shadow)' },
  input: { width: '100%', background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: 11, padding: '10px 14px', fontSize: 13, color: 'var(--ink)', outline: 'none' },
  select: { width: '100%', background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: 11, padding: '8px 12px', fontSize: 13, color: 'var(--ink)', outline: 'none' },
  btn: { padding: '10px 20px', borderRadius: 11, fontWeight: 700, fontSize: 12, border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all .2s var(--ease)' },
  primary: { background: 'var(--gold)', color: 'var(--night)' },
  secondary: { background: 'var(--raised)', color: 'var(--ink)', border: '1px solid var(--line)' },
}

export default function ExpertsPage() {
  const { profile, loading: userLoading } = useUser()
  const supabase = useSupabase()
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [categories, setCategories] = useState<ExpertCategory[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'browse' | 'apply'>('browse')
  const [countyFilter, setCountyFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showApplyForm, setShowApplyForm] = useState(false)
  const [appForm, setAppForm] = useState({ category_id: '', title: '', qualifications: '', experience: '', certs: '' })
  const [submitting, setSubmitting] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!userLoading) { fetchProfessionals(); fetchCategories() }
  }, [userLoading, countyFilter])

  useEffect(() => {
    if (profile) { fetchApplications(); checkAdmin() }
  }, [profile])

  const fetchProfessionals = async () => {
    setLoading(true)
    try {
      let query = supabase.from('professionals').select(`*, profiles:user_id (id, full_name, username, avatar_url, is_verified_expert, is_expert)`).eq('status', 'approved').order('rating', { ascending: false }).limit(50)
      if (countyFilter) query = query.eq('county', countyFilter)
      const { data } = await query
      setProfessionals((data || []) as unknown as Professional[])
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  const fetchCategories = async () => {
    const { data } = await supabase.from('expertise_categories').select('*')
    if (data) setCategories(data as ExpertCategory[])
  }

  const fetchApplications = async () => {
    if (!profile) return
    const { data } = await supabase.from('expert_applications').select(`*, categories:category_id (name, icon), profiles:user_id (id, full_name, username)`).eq('user_id', profile.id).order('created_at', { ascending: false })
    if (data) setApplications(data as unknown as Application[])
  }

  const checkAdmin = async () => {
    if (!profile) return
    const { data } = await supabase.from('profiles').select('is_expert').eq('id', profile.id).maybeSingle()
    if (data?.is_expert) setIsAdmin(true)
  }

  const handleApply = async () => {
    if (!profile) { toast('Sign in to apply'); return }
    if (!appForm.category_id || !appForm.title.trim() || !appForm.qualifications.trim() || !appForm.experience.trim()) { toast('All fields required'); return }
    setSubmitting(true)
    try {
      const { error } = await supabase.from('expert_applications').insert({
        user_id: profile.id, category_id: appForm.category_id, title: appForm.title.trim(),
        qualifications: appForm.qualifications.trim(), experience: appForm.experience.trim(),
        certification_urls: appForm.certs.trim() ? [appForm.certs.trim()] : null,
      })
      if (error) throw error
      toast('Application submitted! An admin will review it.'); setShowApplyForm(false)
      setAppForm({ category_id: '', title: '', qualifications: '', experience: '', certs: '' }); fetchApplications()
    } catch (err: any) { toast(err.message || 'Failed') } finally { setSubmitting(false) }
  }

  const handleReview = async (appId: string, status: 'approved' | 'declined', notes: string = '') => {
    if (!profile) return
    try {
      await supabase.from('expert_applications').update({ status, reviewed_by: profile.id, reviewed_at: new Date().toISOString(), admin_notes: notes || null }).eq('id', appId)
      if (status === 'approved') {
        const app = applications.find(a => a.id === appId)
        if (app) {
          await supabase.from('profiles').update({ is_expert: true, is_verified_expert: true, expert_since: new Date().toISOString() }).eq('id', app.user_id)
          await supabase.from('professionals').upsert({ user_id: app.user_id, title: app.title, expertise: app.categories ? [app.categories.name] : [], status: 'approved' })
        }
      }
      toast(`Application ${status}`); fetchApplications(); fetchProfessionals()
    } catch { toast('Failed to update') }
  }

  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  if (userLoading) return <div className="flex items-center justify-center min-h-[80vh]"><div className="animate-spin w-8 h-8 border-2" style={{ borderColor: 'var(--green)', borderTopColor: 'transparent', borderRadius: '50%' }} /></div>

  return (
    <div className="pb-8 animate-fade-in-up">
      <section className="page-head" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="page-title flex items-center gap-3" style={{ margin: 0 }}>
            <Briefcase className="w-7 h-7" style={{ color: 'var(--gold)' }} />
            Experts
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Anyone can earn the expert badge through usage — or apply to be listed here</p>
        </div>
        <div className="flex gap-2">
          {profile && <button onClick={() => setShowApplyForm(true)} style={{ ...s.btn, ...s.primary }}><Plus className="w-4 h-4" /> Apply</button>}
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-[12px]" style={{ background: 'var(--raised)' }}>
        {(['browse', 'apply'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className="flex-1 py-2 px-3 rounded-[10px] text-[11px] font-semibold transition-all"
            style={tab === t ? { background: 'var(--surface)', color: 'var(--ink)', boxShadow: 'var(--card-shadow)' } : { color: 'var(--muted)' }}>
            {t === 'browse' ? `Browse (${professionals.length})` : `My Applications (${applications.length})`}
          </button>
        ))}
      </div>

      {tab === 'browse' && (
        <>
          {/* Search & Filters */}
          <div style={s.card} className="mb-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted)' }} />
                <input placeholder="Search experts..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  style={{ ...s.input, paddingLeft: 40 }} />
              </div>
              <button onClick={() => setShowFilters(!showFilters)} style={{ padding: '10px', borderRadius: 11, border: '1px solid', borderColor: showFilters ? 'var(--gold)' : 'var(--line)', background: showFilters ? 'color-mix(in oklab, var(--gold) 10%, transparent)' : 'transparent', color: showFilters ? 'var(--gold)' : 'var(--muted)', cursor: 'pointer' }}>
                <Filter className="w-4 h-4" />
              </button>
            </div>
            {showFilters && (
              <div className="pt-4" style={{ borderTop: '1px solid var(--line)' }}>
                <label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--muted)' }}>County</label>
                <select value={countyFilter} onChange={e => setCountyFilter(e.target.value)} style={{ ...s.select, maxWidth: 250 }}>
                  <option value="">All counties</option>
                  {ALL_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Experts grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-2" style={{ borderColor: 'var(--green)', borderTopColor: 'transparent', borderRadius: '50%' }} /></div>
          ) : professionals.length === 0 ? (
            <div style={s.card} className="text-center py-12">
              <Briefcase className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--muted)', opacity: 0.3 }} />
              <p className="font-medium mb-1" style={{ color: 'var(--ink)' }}>No experts yet</p>
              <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>Apply to be the first listed expert</p>
              {profile && <button onClick={() => setShowApplyForm(true)} style={{ ...s.btn, ...s.primary }}><Plus className="w-4 h-4" /> Apply Now</button>}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {professionals.filter(p => {
                if (!searchTerm) return true
                const q = searchTerm.toLowerCase()
                return (p.profiles?.full_name || '').toLowerCase().includes(q) || p.title.toLowerCase().includes(q)
              }).map(pro => {
                const p = pro.profiles
                if (!p) return null
                return (
                  <div key={pro.id} style={s.card} className="card-hover">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 relative" style={{ background: 'linear-gradient(135deg, var(--green), var(--gold))', color: 'var(--night)' }}>
                        {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" onError={e => { e.currentTarget.style.display = 'none'; const fb = e.currentTarget.parentElement!.querySelector('.af-p'); if (fb) fb.classList.remove('hidden') }} /> : null}
                        <span className={`af-p ${p.avatar_url ? 'hidden' : ''}`} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{getInitials(p.full_name || p.username)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link href={`/profile/${p.username}`} className="font-bold text-sm truncate" style={{ color: 'var(--ink)' }}>{p.full_name || p.username}</Link>
                          {(p.is_verified_expert || p.is_expert) && <Shield className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--green)' }} />}
                        </div>
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--gold)' }}>{pro.title}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px]" style={{ color: 'var(--muted)' }}>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{pro.county}</span>
                          <span className="flex items-center gap-1"><Star className="w-3 h-3" style={{ color: 'var(--gold)' }} />{pro.rating?.toFixed(1) || '0.0'}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{pro.session_count || 0} sessions</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {pro.expertise?.slice(0, 3).map(e => (
                            <span key={e} className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: 'var(--raised)', color: 'var(--muted)', border: '1px solid var(--line)' }}>{e}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
                      <span className="text-base font-bold" style={{ color: 'var(--gold)' }}>{pro.currency === 'KES' ? 'KSh' : '$'}{pro.rate}<span className="text-[10px] font-normal" style={{ color: 'var(--muted)' }}>/session</span></span>
                      <button style={{ ...s.btn, padding: '7px 14px', fontSize: 10, background: 'var(--green)', color: 'var(--night)' }}>Book</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {tab === 'apply' && profile && (
        <section>
          {applications.length === 0 ? (
            <div style={s.card} className="text-center py-12">
              <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--muted)', opacity: 0.3 }} />
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>No applications yet</p>
              <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>Apply to become a verified expert in your field</p>
              <button onClick={() => setShowApplyForm(true)} style={{ ...s.btn, ...s.primary }}><Plus className="w-4 h-4" /> Submit Application</button>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map(app => (
                <div key={app.id} style={s.card}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-[13px] font-bold" style={{ color: 'var(--ink)' }}>{app.title}</p>
                      <p className="text-[10px]" style={{ color: 'var(--muted)' }}>{app.categories?.icon} {app.categories?.name} · {new Date(app.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: app.status === 'approved' ? 'color-mix(in oklab, var(--green) 20%, var(--surface))' : app.status === 'declined' ? 'color-mix(in oklab, var(--red) 20%, var(--surface))' : 'color-mix(in oklab, var(--gold) 20%, var(--surface))', color: app.status === 'approved' ? 'var(--green)' : app.status === 'declined' ? 'var(--red)' : 'var(--gold)' }}>
                      {app.status}
                    </span>
                  </div>
                  {app.admin_notes && <p className="text-[10px] mt-2 p-2 rounded-[8px]" style={{ background: 'var(--raised)', color: 'var(--muted)' }}>Admin: {app.admin_notes}</p>}
                  {/* Admin review controls */}
                  {isAdmin && app.status === 'pending' && (
                    <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
                      <button onClick={() => handleReview(app.id, 'approved')} style={{ ...s.btn, padding: '6px 12px', fontSize: 10, background: 'color-mix(in oklab, var(--green) 20%, var(--surface))', color: 'var(--green)' }}>
                        <Check className="w-3 h-3" /> Approve
                      </button>
                      <button onClick={() => handleReview(app.id, 'declined')} style={{ ...s.btn, padding: '6px 12px', fontSize: 10, background: 'color-mix(in oklab, var(--red) 20%, var(--surface))', color: 'var(--red)' }}>
                        <X className="w-3 h-3" /> Decline
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Apply Form Modal */}
      {showApplyForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'color-mix(in oklab, var(--night) 70%, transparent)' }} onClick={() => setShowApplyForm(false)}>
          <div style={{ ...s.card, width: 'min(500px, 100%)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-base" style={{ color: 'var(--ink)' }}>Apply as Expert</h3>
              <button onClick={() => setShowApplyForm(false)} style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--muted)' }}>Expertise Category</label>
                <select value={appForm.category_id} onChange={e => setAppForm(p => ({ ...p, category_id: e.target.value }))} style={s.select}>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <div><label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--muted)' }}>Expert Title</label><input value={appForm.title} onChange={e => setAppForm(p => ({ ...p, title: e.target.value }))} style={s.input} placeholder="e.g. Senior Agronomist, Software Engineer" /></div>
              <div><label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--muted)' }}>Qualifications</label><textarea value={appForm.qualifications} onChange={e => setAppForm(p => ({ ...p, qualifications: e.target.value }))} style={{ ...s.input, minHeight: 70, resize: 'vertical' }} placeholder="Degrees, certifications, training..." rows={3} /></div>
              <div><label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--muted)' }}>Experience</label><textarea value={appForm.experience} onChange={e => setAppForm(p => ({ ...p, experience: e.target.value }))} style={{ ...s.input, minHeight: 70, resize: 'vertical' }} placeholder="Years of experience, notable work, clients..." rows={3} /></div>
              <div><label className="text-[10px] font-semibold block mb-1" style={{ color: 'var(--muted)' }}>Certification URL (optional)</label><input value={appForm.certs} onChange={e => setAppForm(p => ({ ...p, certs: e.target.value }))} style={s.input} placeholder="https://..." /></div>
              <button onClick={handleApply} disabled={submitting} style={{ ...s.btn, ...s.primary, width: '100%', justifyContent: 'center' }}>
                {submitting ? 'Submitting...' : <><Upload className="w-4 h-4" /> Submit Application</>}
              </button>
              <p className="text-[9px] text-center" style={{ color: 'var(--muted)' }}>Applications are reviewed by admins. Approved experts get a verified badge and appear in the directory. You can also earn the badge automatically through consistent usage.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
