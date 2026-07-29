'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MapPin, Star, Shield, Clock, Search, Filter, Briefcase, BookOpen, Zap } from 'lucide-react'
import { useSupabase, useUser, toast } from '@/app/providers'
import { Button } from '@/components/ui/form'

interface Professional {
  id: string; user_id: string; title: string; bio: string; expertise: string[]; languages: string[]; county: string; rate: number; currency: string; heshima_rating: number; session_count: number; rating: number; status: string; created_at: string
  profiles: { id: string; full_name: string; username: string; avatar_url: string | null; is_verified_expert: boolean } | null
}

const ALL_COUNTIES = ['Nairobi', 'Mombasa', 'Kisumu', 'Eldoret', 'Nakuru', 'Kericho', 'Nyeri', 'Kakamega', 'Kisii', 'Machakos', 'Meru', 'Embu', 'Bungoma', 'Siaya', 'Garissa']
const ALL_EXPERTISE = ['Agriculture', 'Technology', 'Business', 'Health', 'Education', 'Finance', 'Legal', 'Engineering', 'Arts', 'Tourism']
const ALL_LANGUAGES = ['English', 'Swahili', 'Kikuyu', 'Luo', 'Kamba', 'Kalenjin', 'Luhya', 'Meru', 'Maasai']

const style = {
  card: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20, boxShadow: 'var(--card-shadow)' },
  input: { width: '100%', background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: 11, padding: '10px 14px 10px 40px', fontSize: 13, color: 'var(--ink)', outline: 'none' },
  select: { width: '100%', background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: 11, padding: '8px 12px', fontSize: 13, color: 'var(--ink)', outline: 'none' },
  tag: { padding: '6px 12px', borderRadius: 99, fontSize: 10, fontWeight: 600, border: '1px solid var(--line)', background: 'var(--raised)', color: 'var(--muted)', cursor: 'pointer', transition: 'all .2s var(--ease)' },
  tagActive: { background: 'var(--gold)', color: 'var(--night)', borderColor: 'var(--gold)' },
}

export default function ProfessionalsPage() {
  const { profile, loading: userLoading } = useUser()
  const supabase = useSupabase()
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'recommended' | 'top_rated' | 'available'>('recommended')
  const [countyFilter, setCountyFilter] = useState('')
  const [expertiseFilter, setExpertiseFilter] = useState('')
  const [langFilter, setLangFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => { fetchProfessionals() }, [tab, countyFilter, expertiseFilter, langFilter])

  const fetchProfessionals = async () => {
    setLoading(true)
    try {
      let query = supabase.from('professionals').select(`*, profiles:user_id (id, full_name, username, avatar_url, is_verified_expert)`).eq('status', 'approved')
      if (countyFilter) query = query.eq('county', countyFilter)
      if (expertiseFilter) query = query.contains('expertise', [expertiseFilter])
      if (langFilter) query = query.contains('languages', [langFilter])
      if (tab === 'top_rated') query = query.order('rating', { ascending: false })
      else if (tab === 'recommended') query = query.order('heshima_rating', { ascending: false })
      else if (tab === 'available') query = query.eq('availability', 'available').order('created_at', { ascending: false })
      const { data, error } = await query
      if (error) throw error
      setProfessionals((data || []) as unknown as Professional[])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleBook = async (pro: Professional) => {
    if (!profile) return toast('Please sign in to book a session')
    try {
      const { error } = await supabase.from('sessions').insert({ student_id: profile.id, professional_id: pro.user_id, topic: `Session with ${pro.profiles?.full_name || 'Professional'}`, status: 'requested', format: 'video', language: 'English' })
      if (error) throw error
      toast('Session requested successfully!')
    } catch { toast('Failed to book session') }
  }

  const filtered = professionals.filter(p => {
    if (!searchTerm) return true
    const q = searchTerm.toLowerCase()
    return (p.profiles?.full_name || '').toLowerCase().includes(q) || p.title.toLowerCase().includes(q) || p.bio.toLowerCase().includes(q) || p.expertise.some(e => e.toLowerCase().includes(q))
  })

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  if (userLoading) return <div className="flex items-center justify-center min-h-[80vh]"><div className="animate-spin w-8 h-8 border-2" style={{ borderColor: 'var(--green)', borderTopColor: 'transparent', borderRadius: '50%' }} /></div>

  return (
    <div className="pb-8 animate-fade-in-up">
      <section className="page-head">
        <h1 className="page-title flex items-center gap-3">
          <Briefcase className="w-7 h-7" style={{ color: 'var(--gold)' }} />
          Professionals
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Connect with verified experts across Kenya</p>
      </section>

      {/* Search & Filters */}
      <div style={style.card} className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted)' }} />
            <input type="text" placeholder="Search professionals..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={style.input} />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className="p-2.5 rounded-[11px] transition-colors"
            style={{ border: '1px solid', borderColor: showFilters ? 'var(--gold)' : 'var(--line)', background: showFilters ? 'color-mix(in oklab, var(--gold) 10%, transparent)' : 'transparent', color: showFilters ? 'var(--gold)' : 'var(--muted)' }}>
            <Filter className="w-4 h-4" />
          </button>
        </div>
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>County</label>
              <select value={countyFilter} onChange={e => setCountyFilter(e.target.value)} style={style.select}>
                <option value="">All counties</option>
                {ALL_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>Expertise</label>
              <select value={expertiseFilter} onChange={e => setExpertiseFilter(e.target.value)} style={style.select}>
                <option value="">All expertise</option>
                {ALL_EXPERTISE.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>Language</label>
              <select value={langFilter} onChange={e => setLangFilter(e.target.value)} style={style.select}>
                <option value="">All languages</option>
                {ALL_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['recommended', 'top_rated', 'available'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ ...style.tag, ...(tab === t ? style.tagActive : {}) }}>
            {t === 'recommended' ? 'Recommended' : t === 'top_rated' ? 'Top Rated' : 'Available Today'}
          </button>
        ))}
      </div>

      {/* Listings */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-2" style={{ borderColor: 'var(--green)', borderTopColor: 'transparent', borderRadius: '50%' }} /></div>
      ) : filtered.length === 0 ? (
        <div style={style.card} className="text-center py-12">
          <Briefcase className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--muted)', opacity: 0.3 }} />
          <p className="font-medium mb-2" style={{ color: 'var(--ink)' }}>No professionals found</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {filtered.map(pro => {
            const p = pro.profiles
            if (!p) return null
            return (
              <div key={pro.id} style={style.card} className="card-hover">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--green), var(--gold))', color: 'var(--night)' }}>
                    {p.avatar_url ? <img src={p.avatar_url} alt={p.full_name} className="w-14 h-14 rounded-full object-cover" /> : getInitials(p.full_name || p.username)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/profile/${p.username}`} className="font-bold text-sm truncate" style={{ color: 'var(--ink)' }}>{p.full_name || p.username}</Link>
                      {p.is_verified_expert && <Shield className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--green)' }} />}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--gold)' }}>{pro.title}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: 'var(--muted)' }}>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{pro.county}</span>
                      <span className="flex items-center gap-1"><Star className="w-3 h-3" style={{ color: 'var(--gold)' }} />{pro.rating.toFixed(1)}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{pro.session_count} sessions</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {pro.expertise.slice(0, 3).map(e => (
                        <span key={e} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--raised)', color: 'var(--muted)', border: '1px solid var(--line)' }}>{e}</span>
                      ))}
                      {pro.expertise.length > 3 && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--raised)', color: 'var(--muted)' }}>+{pro.expertise.length - 3}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
                  <div>
                    <span className="text-lg font-bold" style={{ color: 'var(--gold)' }}>{pro.currency === 'KES' ? 'KSh' : '$'}{pro.rate}</span>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>/session</span>
                  </div>
                  <Button size="sm" onClick={() => handleBook(pro)}>Book</Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Become a pro panel */}
      <div className="rounded-[18px] p-6 mb-8" style={{ background: 'linear-gradient(135deg, var(--raised), var(--surface))', border: '1px solid', borderColor: 'color-mix(in oklab, var(--gold) 30%, transparent)' }}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'color-mix(in oklab, var(--gold) 20%, transparent)' }}>
            <Zap className="w-6 h-6" style={{ color: 'var(--gold)' }} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-base" style={{ color: 'var(--ink)' }}>Become a Professional</h3>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Share your expertise, earn Kikwetu tokens, and help your community. Get listed on this directory.</p>
            <div className="flex flex-wrap gap-3 mt-4">
              <Link href="/profile/edit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[11px] font-bold text-sm transition-opacity" style={{ background: 'var(--gold)', color: 'var(--night)' }}>
                <Briefcase className="w-4 h-4" /> Apply as Pro
              </Link>
              <Link href="/sessions" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[11px] text-sm transition-colors" style={{ border: '1px solid var(--line)', color: 'var(--muted)' }}>
                <BookOpen className="w-4 h-4" /> Learn More
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
