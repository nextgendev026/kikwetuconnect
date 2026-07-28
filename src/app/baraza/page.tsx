'use client'

import Link from 'next/link'
import { MapPin, Users, TrendingUp, ArrowRight, Compass, Clock, Sparkles } from 'lucide-react'
import { useUser, useSupabase } from '@/app/providers'
import { useEffect, useState, useCallback } from 'react'

interface CountyHub {
  id: string
  slug: string
  name: string
  county: string
  description: string | null
  member_count: number
  post_count: number
  active_member_count: number
  category: string
  trend: number
  topTopics: string[]
}

const DEFAULT_HUBS: CountyHub[] = [
  { id: '1', slug: 'nairobi', name: 'Nairobi Hub', county: 'Nairobi', description: 'Discover conversations from your region', member_count: 8934, post_count: 2450, active_member_count: 8934, category: 'county_hub', trend: 12, topTopics: ['Tech & Startups', 'Biashara', 'County Politics'] },
  { id: '2', slug: 'mombasa', name: 'Mombasa Hub', county: 'Mombasa', description: 'Coastal conversations', member_count: 6234, post_count: 1820, active_member_count: 6234, category: 'county_hub', trend: 8, topTopics: ['Tourism', 'Biashara', 'Culture'] },
  { id: '3', slug: 'kisumu', name: 'Kisumu Hub', county: 'Kisumu', description: 'Lake Victoria region hub', member_count: 4567, post_count: 1456, active_member_count: 4567, category: 'county_hub', trend: 15, topTopics: ['Agriculture', 'Biashara', 'Culture'] },
  { id: '4', slug: 'eldoret', name: 'Eldoret Hub', county: 'Eldoret', description: 'Heartland agricultural hub', member_count: 3245, post_count: 987, active_member_count: 3245, category: 'county_hub', trend: 6, topTopics: ['Agriculture', 'Sports', 'Tech'] },
  { id: '5', slug: 'nakuru', name: 'Nakuru Hub', county: 'Nakuru', description: 'Rift Valley conversations', member_count: 2890, post_count: 856, active_member_count: 2890, category: 'county_hub', trend: 9, topTopics: ['Agriculture', 'Tech', 'Biashara'] },
  { id: '6', slug: 'kakamega', name: 'Kakamega Hub', county: 'Kakamega', description: 'Western Kenya cultural center', member_count: 2876, post_count: 823, active_member_count: 2876, category: 'county_hub', trend: 11, topTopics: ['Agriculture', 'Culture', 'Education'] },
  { id: '7', slug: 'nyeri', name: 'Nyeri Hub', county: 'Nyeri', description: 'Coffee country heartland', member_count: 2456, post_count: 745, active_member_count: 2456, category: 'county_hub', trend: 7, topTopics: ['Agriculture', 'Biashara', 'Education'] },
  { id: '8', slug: 'kericho', name: 'Kericho Hub', county: 'Kericho', description: 'Tea capital highlands', member_count: 2123, post_count: 654, active_member_count: 2123, category: 'county_hub', trend: 5, topTopics: ['Agriculture', 'Health', 'Culture'] },
  { id: '9', slug: 'kisii', name: 'Kisii Hub', county: 'Kisii', description: 'Highlands cultural center', member_count: 2234, post_count: 698, active_member_count: 2234, category: 'county_hub', trend: 4, topTopics: ['Agriculture', 'Tech', 'Culture'] },
  { id: '10', slug: 'machakos', name: 'Machakos Hub', county: 'Machakos', description: 'Gateway to the east', member_count: 1876, post_count: 567, active_member_count: 1876, category: 'county_hub', trend: 3, topTopics: ['Agriculture', 'Biashara', 'Health'] },
]

export default function BarazaPage() {
  const supabase = useSupabase()
  const { profile } = useUser()
  const [hubs, setHubs] = useState<CountyHub[]>(DEFAULT_HUBS)
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<'all' | 'trending' | 'county'>('all')

  const fetchHubs = useCallback(async () => {
    try {
      const { data } = await supabase.from('barazas').select('*').order('member_count', { ascending: false })
      if (data) {
        const mapped = (data as any[]).map((h: any) => ({
          id: h.id, slug: h.slug, name: h.name, county: h.county,
          description: h.description, member_count: h.member_count ?? 0,
          post_count: h.post_count ?? 0, active_member_count: h.active_member_count ?? 0,
          category: h.category ?? 'county_hub', trend: Math.floor(Math.random() * 15) + 1, topTopics: [],
        }))
        setHubs(mapped)
      }
    } catch (e) { console.error('Error fetching hubs:', e) }
    finally { setLoading(false) }
  }, [supabase])

  useEffect(() => { fetchHubs() }, [fetchHubs])

  const filtered = hubs.filter(h => {
    if (activeFilter === 'trending') return h.trend >= 10
    if (activeFilter === 'county') return h.category === 'county_hub'
    return true
  })

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-2 border-green border-t-transparent rounded-full" /></div>

  return (
    <>
      <section className="page-head pb-4">
        <div className="flex items-center gap-3 mb-2">
          <Compass className="w-8 h-8 text-green" />
          <div>
            <h1 className="page-title mb-0">Baraza Hubs</h1>
            <p className="text-muted text-sm">Discover conversations from your region</p>
          </div>
        </div>
      </section>

      {profile?.county_hub && (
        <section className="mb-6 card section border-l-4 border-l-green flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-green" />
            <div>
              <p className="text-xs text-green uppercase tracking-wider font-medium">Your County Hub</p>
              <p className="text-lg font-bold">{profile.county_hub}</p>
            </div>
          </div>
          <Link href={`/baraza/${profile.county_hub.toLowerCase().replace(/\s+/g, '-')}`} className="btn btn-primary text-sm py-2 px-4">View Hub →</Link>
        </section>
      )}

      <section className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {(['all', 'trending', 'county'] as const).map(f => (
          <button key={f} onClick={() => setActiveFilter(f)} className={`flex-none px-4 py-2 rounded-full text-xs font-medium transition-all ${activeFilter === f ? 'bg-green text-night' : 'bg-night2 text-muted border border-line hover:text-cream'}`}>
            {f === 'all' && 'All Hubs'}
            {f === 'trending' && '🔥 Trending'}
            {f === 'county' && '📍 County Hubs'}
          </button>
        ))}
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green" /> Trending Hubs
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.sort((a, b) => b.trend - a.trend).slice(0, 6).map(hub => (
            <Link key={hub.id} href={`/baraza/${hub.slug}`} className="card section group hover:border-green/50 transition-all duration-300 hover:shadow-lg hover:shadow-green/10 hover:-translate-y-1">
              <div className="flex items-start justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green/20 text-green">County Hub</span>
                <span className="text-xs text-green font-medium flex items-center gap-1"><TrendingUp className="w-3 h-3" /> +{hub.trend}%</span>
              </div>
              <h3 className="font-bold text-lg mb-1 group-hover:text-green transition-colors">{hub.name}</h3>
              <p className="text-xs text-muted mb-3 line-clamp-2">{hub.description || 'Discover local conversations in your region'}</p>
              <div className="flex items-center gap-4 text-xs text-muted pt-3 border-t border-line">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{hub.member_count.toLocaleString()}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{hub.post_count.toLocaleString()} posts</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-green" /> All Regional Hubs
        </h2>
        <div className="space-y-2">
          {filtered.map(hub => (
            <Link key={hub.id} href={`/baraza/${hub.slug}`} className="card section flex items-center justify-between hover:bg-surface-2 transition-all duration-200 group">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green/20 to-gold/20 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">📍</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold group-hover:text-green transition-colors">{hub.name}</h3>
                  <p className="text-xs text-muted">{hub.county} · {hub.post_count.toLocaleString()} posts · {hub.member_count.toLocaleString()} active</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted group-hover:text-green group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}