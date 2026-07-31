'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSupabase, useUser, toast } from '@/app/providers'
import { Search, MapPin, TrendingUp, Users, BookOpen, Zap, Star, ChevronRight, Award, Compass, Sprout, Monitor, Briefcase, Scale, GraduationCap, Palette } from 'lucide-react'

interface Professional {
  id: string; user_id: string; title: string; bio: string; expertise: string[]; county: string; rate: number; rating: number; session_count: number
  profiles: { id: string; full_name: string; username: string; avatar_url: string | null; is_verified_expert: boolean } | null
}

interface Space {
  id: string; name: string; slug: string; description: string; icon: string; category: string; member_count: number; post_count: number
}

interface Quiz {
  id: string; title: string; description: string; category: string; difficulty: string; question_count: number; estimated_time_minutes: number; heshima_reward: number
}

const TOPIC_ICONS: Record<string, React.ComponentType<any>> = {
  Agriculture: Sprout, 'Tech & Startups': Monitor, Biashara: Briefcase,
  'Legal Rights': Scale, Education: GraduationCap, Culture: Palette,
}

const TOPICS = [
  { name: 'Agriculture', count: '1.8k', icon: 'Agriculture' },
  { name: 'Tech & Startups', count: '2.4k', icon: 'Tech & Startups' },
  { name: 'Biashara', count: '3.1k', icon: 'Biashara' },
  { name: 'Legal Rights', count: '940', icon: 'Legal Rights' },
  { name: 'Education', count: '2.2k', icon: 'Education' },
  { name: 'Culture', count: '1.4k', icon: 'Culture' },
]

const POPULAR_SEARCHES = ['NairobiTechWeek', 'Farming in Kitale', 'M-Pesa for Business']
const COUNTIES = ['Nairobi', 'Mombasa', 'Kisumu', 'Eldoret', 'Nakuru', 'Machakos', 'Kericho', 'Nyeri']

const style = {
  card: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20, boxShadow: 'var(--card-shadow)' },
  input: { width: '100%', background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: 11, padding: '12px 16px 12px 40px', fontSize: 13, color: 'var(--ink)', outline: 'none' },
  miniCard: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 16, boxShadow: 'var(--card-shadow)' },
}

export default function ExplorePage() {
  const supabase = useSupabase()
  const { profile, loading: userLoading } = useUser()
  const [search, setSearch] = useState('')
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [spaces, setSpaces] = useState<Space[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (!userLoading) fetchExploreData() }, [userLoading])

  const fetchExploreData = async () => {
    setLoading(true)
    try {
      const [proRes, spaceRes, quizRes] = await Promise.all([
        supabase.from('professionals').select(`*, profiles:user_id (id, full_name, username, avatar_url, is_verified_expert)`).eq('status', 'approved').order('rating', { ascending: false }).limit(4),
        supabase.from('spaces').select('*').order('member_count', { ascending: false }).limit(6),
        supabase.from('quizzes').select('*').order('created_at', { ascending: false }).limit(4),
      ])
      if (proRes.data) setProfessionals(proRes.data as unknown as Professional[])
      if (spaceRes.data) setSpaces(spaceRes.data as Space[])
      if (quizRes.data) setQuizzes(quizRes.data as Quiz[])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); if (search.trim()) window.location.href = `/search?q=${encodeURIComponent(search.trim())}` }
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  if (userLoading || loading) return <div className="flex items-center justify-center min-h-[80vh]"><div className="animate-spin w-8 h-8 border-2" style={{ borderColor: 'var(--green)', borderTopColor: 'transparent', borderRadius: '50%' }} /></div>

  return (
    <div className="pb-8 animate-fade-in-up">
      <section className="page-head">
        <h1 className="page-title flex items-center gap-3">
          <Compass className="w-7 h-7" style={{ color: 'var(--gold)' }} />
          Explore
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Discover knowledge, people & communities</p>
      </section>

      {/* Search */}
      <form onSubmit={handleSearch} style={style.card} className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--muted)' }} />
          <input type="text" placeholder="Search posts, people, spaces, experts..." value={search} onChange={e => setSearch(e.target.value)} style={style.input} />
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="text-xs" style={{ color: 'var(--muted)' }}>Popular:</span>
          {POPULAR_SEARCHES.map(s => (
            <button key={s} type="button" onClick={() => { setSearch(s); window.location.href = `/search?q=${encodeURIComponent(s)}` }}
              className="text-xs px-3 py-1 rounded-full transition-colors" style={{ background: 'var(--raised)', color: 'var(--muted)', border: '1px solid var(--line)' }}>
              {s}
            </button>
          ))}
        </div>
      </form>

      {/* Topic Grid */}
      <section className="mb-8">
        <h2 className="font-bold mb-4" style={{ color: 'var(--ink)' }}>Browse by Topic</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {TOPICS.map(t => {
            const Icon = TOPIC_ICONS[t.icon]
            return (
            <Link key={t.name} href={`/topics/${t.name.toLowerCase().replace(/[ &]+/g, '-')}`}
              style={style.miniCard} className="card-hover block transition-all">
              {Icon ? <Icon className="w-8 h-8" style={{ color: 'var(--green)' }} /> : null}
              <h3 className="font-bold text-sm mt-2" style={{ color: 'var(--ink)' }}>{t.name}</h3>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{t.count} posts</p>
            </Link>
            )
          })}
        </div>
      </section>

      {/* Featured Experts */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold" style={{ color: 'var(--ink)' }}>Featured Experts</h2>
          <Link href="/experts" className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--gold)' }}>View all <ChevronRight className="w-3 h-3" /></Link>
        </div>
        {professionals.length === 0 ? (
          <div style={style.card} className="text-center py-8">
            <Users className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--muted)', opacity: 0.3 }} />
            <p className="text-xs" style={{ color: 'var(--muted)' }}>No experts listed yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {professionals.map(pro => {
              const p = pro.profiles
              if (!p) return null
              return (
                <Link key={pro.id} href={`/profile/${p.username}`} style={style.miniCard} className="card-hover block transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--green), var(--gold))', color: 'var(--night)' }}>
                      {getInitials(p.full_name || p.username)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-sm truncate" style={{ color: 'var(--ink)' }}>{p.full_name || p.username}</p>
                        {p.is_verified_expert && <Zap className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--green)' }} />}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--gold)' }}>{pro.title}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px]" style={{ color: 'var(--muted)' }}>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{pro.county}</span>
                        <span className="flex items-center gap-1"><Star className="w-3 h-3" style={{ color: 'var(--gold)' }} />{pro.rating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Trending Counties */}
      <section className="mb-8">
        <h2 className="font-bold mb-4" style={{ color: 'var(--ink)' }}>Trending Counties</h2>
        <div className="flex overflow-x-auto gap-3 pb-2 -mx-5 px-5 scrollbar-thin">
          {COUNTIES.map(c => (
            <Link key={c} href={`/baraza/${c.toLowerCase().replace(/\s+/g, '-')}`}
              style={style.miniCard} className="flex-none min-w-[130px] card-hover block">
              <MapPin className="w-5 h-5 mb-2" style={{ color: 'var(--green)' }} />
              <p className="font-bold text-sm" style={{ color: 'var(--ink)' }}>{c}</p>
              <p className="text-[10px] mt-1 flex items-center gap-1" style={{ color: 'var(--muted)' }}><TrendingUp className="w-3 h-3" /> Active hub</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Recommended Spaces */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold" style={{ color: 'var(--ink)' }}>Recommended Spaces</h2>
          <Link href="/spaces" className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--gold)' }}>View all <ChevronRight className="w-3 h-3" /></Link>
        </div>
        {spaces.length === 0 ? (
          <div style={style.card} className="text-center py-8">
            <Users className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--muted)', opacity: 0.3 }} />
            <p className="text-xs" style={{ color: 'var(--muted)' }}>No spaces yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {spaces.map(s => (
              <Link key={s.id} href={`/spaces/${s.slug}`} style={style.miniCard} className="card-hover block transition-colors">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{s.icon || '#'}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm" style={{ color: 'var(--ink)' }}>{s.name}</h3>
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--muted)' }}>{s.description}</p>
                    <p className="text-[10px] mt-2" style={{ color: 'var(--muted)' }}>{s.member_count} members · {s.post_count} posts</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Quiz Recommendations */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold" style={{ color: 'var(--ink)' }}>Quiz Recommendations</h2>
          <Link href="/quizzes" className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--gold)' }}>View all <ChevronRight className="w-3 h-3" /></Link>
        </div>
        {quizzes.length === 0 ? (
          <div style={style.card} className="text-center py-8">
            <BookOpen className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--muted)', opacity: 0.3 }} />
            <p className="text-xs" style={{ color: 'var(--muted)' }}>No quizzes available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quizzes.map(q => (
              <div key={q.id} style={style.miniCard}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: 'color-mix(in oklab, var(--gold) 20%, transparent)' }}>
                    <Award className="w-5 h-5" style={{ color: 'var(--gold)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm" style={{ color: 'var(--ink)' }}>{q.title}</h3>
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--muted)' }}>{q.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px]" style={{ color: 'var(--muted)' }}>
                      <span>{q.question_count} questions</span>
                      <span>{q.estimated_time_minutes} min</span>
                      <span className="font-medium" style={{ color: 'var(--gold)' }}>+{q.heshima_reward} Heshima</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
