'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSupabase, useUser, toast } from '@/app/providers'
import { Search, MapPin, TrendingUp, Users, BookOpen, Zap, Star, ChevronRight, Award } from 'lucide-react'

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

const TOPICS = [
  { name: 'Agriculture', count: '1.8k', icon: '🌱', color: 'oklch(55% .13 151)' },
  { name: 'Tech & Startups', count: '2.4k', icon: '💻', color: 'oklch(55% .14 240)' },
  { name: 'Biashara', count: '3.1k', icon: '💼', color: 'oklch(75% .14 84)' },
  { name: 'Legal Rights', count: '940', icon: '⚖️', color: 'oklch(48% .10 55)' },
  { name: 'Education', count: '2.2k', icon: '📚', color: 'oklch(69% .12 151)' },
  { name: 'Culture', count: '1.4k', icon: '🎭', color: 'oklch(62% .15 28)' },
]

const POPULAR_SEARCHES = ['NairobiTechWeek', 'Farming in Kitale', 'M-Pesa for Business']

const COUNTIES = ['Nairobi', 'Mombasa', 'Kisumu', 'Eldoret', 'Nakuru', 'Machakos', 'Kericho', 'Nyeri']

export default function ExplorePage() {
  const supabase = useSupabase()
  const { profile, loading: userLoading } = useUser()
  const [search, setSearch] = useState('')
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [spaces, setSpaces] = useState<Space[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userLoading) return
    fetchExploreData()
  }, [userLoading])

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) window.location.href = `/search?q=${encodeURIComponent(search.trim())}`
  }

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  if (userLoading || loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-2 border-green border-t-transparent rounded-full" /></div>

  return (
    <div className="pb-8">
      <section className="page-head">
        <h1 className="page-title">Explore</h1>
        <p className="text-muted text-sm">Discover knowledge, people & communities</p>
      </section>

      {/* Search */}
      <form onSubmit={handleSearch} className="card section mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[oklch(65%_.028_151)]" />
          <input
            type="text"
            placeholder="Search posts, people, spaces, professionals..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[oklch(18%_.028_151)] border border-[oklch(29%_.025_151)] rounded-[11px] pl-12 pr-4 py-3 text-sm text-cream placeholder-[oklch(65%_.028_151)] focus:outline-none focus:border-[oklch(55%_.13_151)]"
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="text-xs text-[oklch(65%_.028_151)]">Popular:</span>
          {POPULAR_SEARCHES.map(s => (
            <button key={s} type="button" onClick={() => { setSearch(s); window.location.href = `/search?q=${encodeURIComponent(s)}` }}
              className="text-xs px-3 py-1 rounded-full bg-[oklch(21%_.03_151)] text-[oklch(65%_.028_151)] border border-[oklch(29%_.025_151)] hover:text-cream hover:border-[oklch(75%_.14_84)] transition-colors">
              {s}
            </button>
          ))}
        </div>
      </form>

      {/* Topic Grid */}
      <section className="mb-8">
        <h2 className="text-lg font-bold mb-4">Browse by Topic</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {TOPICS.map(t => (
            <Link key={t.name} href={`/topics/${t.name.toLowerCase().replace(/[ &]+/g, '-')}`}
              className="rounded-[16px] p-5 border border-[oklch(29%_.025_151)] hover:border-[oklch(55%_.13_151)]/50 transition-all group bg-[oklch(18%_.028_151)]"
              style={{ borderLeftColor: t.color, borderLeftWidth: '3px' }}>
              <span className="text-2xl">{t.icon}</span>
              <h3 className="font-bold text-sm mt-2 group-hover:text-[oklch(55%_.13_151)] transition-colors">{t.name}</h3>
              <p className="text-xs text-[oklch(65%_.028_151)] mt-1">{t.count} posts</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Professionals */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Featured Professionals</h2>
          <Link href="/professionals" className="text-xs text-[oklch(75%_.14_84)] font-medium flex items-center gap-1 hover:underline">View all <ChevronRight className="w-3 h-3" /></Link>
        </div>
        {professionals.length === 0 ? (
          <div className="card section text-center py-8">
            <Users className="w-8 h-8 text-[oklch(30%_.025_151)] mx-auto mb-3" />
            <p className="text-xs text-muted">No professionals listed yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {professionals.map(pro => {
              const p = pro.profiles
              if (!p) return null
              return (
                <Link key={pro.id} href={`/profile/${p.username}`} className="rounded-[14px] p-4 border border-[oklch(29%_.025_151)] bg-[oklch(18%_.028_151)] hover:border-[oklch(75%_.14_84)]/40 transition-colors group">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[oklch(55%_.13_151)] to-[oklch(75%_.14_84)] flex items-center justify-center text-xs font-bold text-[oklch(14%_.025_151)] flex-shrink-0">
                      {getInitials(p.full_name || p.username)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-sm truncate group-hover:text-[oklch(75%_.14_84)] transition-colors">{p.full_name || p.username}</p>
                        {p.is_verified_expert && <Zap className="w-3.5 h-3.5 text-[oklch(55%_.13_151)] flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-[oklch(75%_.14_84)] mt-0.5">{pro.title}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[oklch(65%_.028_151)]">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{pro.county}</span>
                        <span className="flex items-center gap-1"><Star className="w-3 h-3 text-[oklch(75%_.14_84)]" fill="oklch(75%_.14_84)" />{pro.rating.toFixed(1)}</span>
                        <span>{pro.session_count} sessions</span>
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
        <h2 className="text-lg font-bold mb-4">Trending Counties</h2>
        <div className="flex overflow-x-auto gap-3 pb-2 -mx-5 px-5">
          {COUNTIES.map(c => (
            <Link key={c} href={`/baraza/${c.toLowerCase().replace(/\s+/g, '-')}`}
              className="flex-none rounded-[14px] p-4 bg-[oklch(18%_.028_151)] border border-[oklch(29%_.025_151)] hover:border-[oklch(55%_.13_151)]/50 transition-all min-w-[130px]">
              <MapPin className="w-5 h-5 text-[oklch(55%_.13_151)] mb-2" />
              <p className="font-bold text-sm">{c}</p>
              <p className="text-[10px] text-[oklch(65%_.028_151)] mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Active hub</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Recommended Spaces */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Recommended Spaces</h2>
          <Link href="/spaces" className="text-xs text-[oklch(75%_.14_84)] font-medium flex items-center gap-1 hover:underline">View all <ChevronRight className="w-3 h-3" /></Link>
        </div>
        {spaces.length === 0 ? (
          <div className="card section text-center py-8">
            <Users className="w-8 h-8 text-[oklch(30%_.025_151)] mx-auto mb-3" />
            <p className="text-xs text-muted">No spaces yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {spaces.map(s => (
              <Link key={s.id} href={`/spaces/${s.slug}`} className="rounded-[14px] p-4 border border-[oklch(29%_.025_151)] bg-[oklch(18%_.028_151)] hover:border-[oklch(55%_.13_151)]/50 transition-colors group">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{s.icon || '#'}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm group-hover:text-[oklch(55%_.13_151)] transition-colors truncate">{s.name}</h3>
                    <p className="text-xs text-[oklch(65%_.028_151)] mt-0.5 line-clamp-2">{s.description}</p>
                    <p className="text-[10px] text-[oklch(65%_.028_151)] mt-2">{s.member_count} members · {s.post_count} posts</p>
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
          <h2 className="text-lg font-bold">Quiz Recommendations</h2>
          <Link href="/quizzes" className="text-xs text-[oklch(75%_.14_84)] font-medium flex items-center gap-1 hover:underline">View all <ChevronRight className="w-3 h-3" /></Link>
        </div>
        {quizzes.length === 0 ? (
          <div className="card section text-center py-8">
            <BookOpen className="w-8 h-8 text-[oklch(30%_.025_151)] mx-auto mb-3" />
            <p className="text-xs text-muted">No quizzes available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quizzes.map(q => (
              <div key={q.id} className="rounded-[14px] p-4 border border-[oklch(29%_.025_151)] bg-[oklch(18%_.028_151)]">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-[10px] bg-[oklch(75%_.14_84)]/20 flex items-center justify-center flex-shrink-0">
                    <Award className="w-5 h-5 text-[oklch(75%_.14_84)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate">{q.title}</h3>
                    <p className="text-xs text-[oklch(65%_.028_151)] mt-0.5 line-clamp-2">{q.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-[oklch(65%_.028_151)]">
                      <span>{q.question_count} questions</span>
                      <span>{q.estimated_time_minutes} min</span>
                      <span className="text-[oklch(75%_.14_84)] font-medium">+{q.heshima_reward} Heshima</span>
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
