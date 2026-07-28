'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MapPin, Star, Shield, Clock, Search, Filter, X, ChevronRight, Briefcase, BookOpen, Mic, Zap } from 'lucide-react'
import { useSupabase, useUser, toast } from '@/app/providers'
import { Button } from '@/components/ui/form'

interface Professional {
  id: string
  user_id: string
  title: string
  bio: string
  expertise: string[]
  languages: string[]
  county: string
  rate: number
  currency: string
  heshima_rating: number
  session_count: number
  rating: number
  status: string
  created_at: string
  profiles: {
    id: string
    full_name: string
    username: string
    avatar_url: string | null
    is_verified_expert: boolean
  } | null
}

const ALL_COUNTIES = ['Nairobi', 'Mombasa', 'Kisumu', 'Eldoret', 'Nakuru', 'Kericho', 'Nyeri', 'Kakamega', 'Kisii', 'Machakos', 'Meru', 'Embu', 'Bungoma', 'Siaya', 'Garissa']
const ALL_EXPERTISE = ['Agriculture', 'Technology', 'Business', 'Health', 'Education', 'Finance', 'Legal', 'Engineering', 'Arts', 'Tourism']
const ALL_LANGUAGES = ['English', 'Swahili', 'Kikuyu', 'Luo', 'Kamba', 'Kalenjin', 'Luhya', 'Meru', 'Maasai']

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

  useEffect(() => {
    fetchProfessionals()
  }, [tab, countyFilter, expertiseFilter, langFilter])

  const fetchProfessionals = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('professionals')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            username,
            avatar_url,
            is_verified_expert
          )
        `)
        .eq('status', 'approved')

      if (countyFilter) query = query.eq('county', countyFilter)
      if (expertiseFilter) query = query.contains('expertise', [expertiseFilter])
      if (langFilter) query = query.contains('languages', [langFilter])

      if (tab === 'top_rated') {
        query = query.order('rating', { ascending: false })
      } else if (tab === 'recommended') {
        query = query.order('heshima_rating', { ascending: false })
      } else if (tab === 'available') {
        query = query.eq('availability', 'available').order('created_at', { ascending: false })
      }

      const { data, error } = await query
      if (error) throw error
      setProfessionals((data || []) as unknown as Professional[])
    } catch (err) {
      console.error('Error fetching professionals:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleBook = async (pro: Professional) => {
    if (!profile) return toast('Please sign in to book a session')
    try {
      const { error } = await supabase.from('sessions').insert({
        student_id: profile.id,
        professional_id: pro.user_id,
        topic: `Session with ${pro.profiles?.full_name || 'Professional'}`,
        status: 'requested',
        format: 'video',
        language: 'English',
      })
      if (error) throw error
      toast('Session requested successfully!')
    } catch (err) {
      toast('Failed to book session')
    }
  }

  const filtered = professionals.filter(p => {
    if (!searchTerm) return true
    const q = searchTerm.toLowerCase()
    return (
      (p.profiles?.full_name || '').toLowerCase().includes(q) ||
      p.title.toLowerCase().includes(q) ||
      p.bio.toLowerCase().includes(q) ||
      p.expertise.some(e => e.toLowerCase().includes(q))
    )
  })

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  if (userLoading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-2 border-green border-t-transparent rounded-full" /></div>

  return (
    <>
      <section className="page-head">
        <h1 className="page-title">Professionals</h1>
        <p className="text-muted text-sm">Connect with verified experts across Kenya</p>
      </section>

      {/* Search & Filters */}
      <div className="card section mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(65%_.028_151)]" />
            <input
              type="text"
              placeholder="Search professionals..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-[oklch(18%_.028_151)] border border-[oklch(29%_.025_151)] rounded-[11px] pl-10 pr-4 py-2.5 text-sm text-cream placeholder-[oklch(65%_.028_151)] focus:outline-none focus:border-[oklch(55%_.13_151)]"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-[11px] border transition-colors ${showFilters ? 'border-[oklch(55%_.13_151)] bg-[oklch(55%_.13_151)]/10 text-[oklch(55%_.13_151)]' : 'border-[oklch(29%_.025_151)] text-[oklch(65%_.028_151)] hover:text-cream'}`}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[oklch(29%_.025_151)]">
            <div>
              <label className="text-xs text-[oklch(65%_.028_151)] font-medium block mb-1.5">County</label>
              <select value={countyFilter} onChange={e => setCountyFilter(e.target.value)}
                className="w-full bg-[oklch(14%_.025_151)] border border-[oklch(29%_.025_151)] rounded-[11px] px-3 py-2 text-sm text-cream focus:outline-none focus:border-[oklch(55%_.13_151)]">
                <option value="">All counties</option>
                {ALL_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[oklch(65%_.028_151)] font-medium block mb-1.5">Expertise</label>
              <select value={expertiseFilter} onChange={e => setExpertiseFilter(e.target.value)}
                className="w-full bg-[oklch(14%_.025_151)] border border-[oklch(29%_.025_151)] rounded-[11px] px-3 py-2 text-sm text-cream focus:outline-none focus:border-[oklch(55%_.13_151)]">
                <option value="">All expertise</option>
                {ALL_EXPERTISE.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[oklch(65%_.028_151)] font-medium block mb-1.5">Language</label>
              <select value={langFilter} onChange={e => setLangFilter(e.target.value)}
                className="w-full bg-[oklch(14%_.025_151)] border border-[oklch(29%_.025_151)] rounded-[11px] px-3 py-2 text-sm text-cream focus:outline-none focus:border-[oklch(55%_.13_151)]">
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
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-[oklch(55%_.13_151)] text-[oklch(14%_.025_151)]'
                : 'bg-[oklch(18%_.028_151)] text-[oklch(65%_.028_151)] hover:text-cream border border-[oklch(29%_.025_151)]'
            }`}
          >
            {t === 'recommended' && 'Recommended'}
            {t === 'top_rated' && 'Top Rated'}
            {t === 'available' && 'Available Today'}
          </button>
        ))}
      </div>

      {/* Listings */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-green border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card section text-center py-12">
          <Briefcase className="w-12 h-12 text-[oklch(65%_.028_151)] mx-auto mb-4 opacity-50" />
          <p className="text-[oklch(65%_.028_151)] mb-2">No professionals found</p>
          <p className="text-xs text-[oklch(65%_.028_151)]">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {filtered.map((pro) => {
            const p = pro.profiles
            if (!p) return null
            return (
              <div key={pro.id} className="card section group">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[oklch(55%_.13_151)] to-[oklch(75%_.14_84)] flex items-center justify-center text-lg font-bold text-[oklch(14%_.025_151)] flex-shrink-0">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt={p.full_name} className="w-14 h-14 rounded-full object-cover" />
                    ) : (
                      getInitials(p.full_name || p.username)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/profile/${p.username}`} className="font-bold text-sm hover:underline truncate">
                        {p.full_name || p.username}
                      </Link>
                      {p.is_verified_expert && (
                        <Shield className="w-4 h-4 text-[oklch(55%_.13_151)] flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-[oklch(75%_.14_84)] mt-0.5">{pro.title}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-[oklch(65%_.028_151)]">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {pro.county}
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-[oklch(75%_.14_84)]" fill="oklch(75%_.14_84)" />
                        {pro.rating.toFixed(1)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {pro.session_count} sessions
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {pro.expertise.slice(0, 3).map(e => (
                        <span key={e} className="text-[10px] px-2 py-0.5 rounded-full bg-[oklch(18%_.028_151)] text-[oklch(65%_.028_151)] border border-[oklch(29%_.025_151)]">
                          {e}
                        </span>
                      ))}
                      {pro.expertise.length > 3 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[oklch(18%_.028_151)] text-[oklch(65%_.028_151)]">
                          +{pro.expertise.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[oklch(29%_.025_151)]">
                  <div>
                    <span className="text-lg font-bold text-[oklch(75%_.14_84)]">
                      {pro.currency === 'KES' ? 'KSh' : '$'}{pro.rate}
                    </span>
                    <span className="text-xs text-[oklch(65%_.028_151)]">/session</span>
                  </div>
                  <Button size="sm" onClick={() => handleBook(pro)}>
                    Book
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Become a pro panel */}
      <div className="bg-gradient-to-br from-[oklch(18%_.028_151)] to-[oklch(14%_.025_151)] border border-[oklch(75%_.14_84)]/30 rounded-[18px] p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-[oklch(75%_.14_84)]/20 flex items-center justify-center flex-shrink-0">
            <Zap className="w-6 h-6 text-[oklch(75%_.14_84)]" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-base text-cream">Become a Professional</h3>
            <p className="text-sm text-[oklch(65%_.028_151)] mt-1">
              Share your expertise, earn Kikwetu tokens, and help your community. Get listed on this directory.
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <Link href="/profile/edit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[11px] bg-[oklch(75%_.14_84)] text-[oklch(14%_.025_151)] text-sm font-bold hover:opacity-90 transition-opacity">
                <Briefcase className="w-4 h-4" />
                Apply as Pro
              </Link>
              <Link href="/sessions" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[11px] border border-[oklch(29%_.025_151)] text-[oklch(65%_.028_151)] text-sm hover:text-cream transition-colors">
                <BookOpen className="w-4 h-4" />
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
