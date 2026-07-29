'use client'
import Link from 'next/link'
import { MapPin, Users, TrendingUp, ArrowRight, Compass, Clock, Sparkles } from 'lucide-react'
import { useUser, useSupabase } from '@/app/providers'
import { useEffect, useState, useCallback } from 'react'

interface CountyHub {
  id: string; slug: string; name: string; county: string; description: string | null
  member_count: number; post_count: number; active_member_count: number; category: string; trend: number; topTopics: string[]
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

const s = {
  card: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20, boxShadow: 'var(--card-shadow)' },
  tag: { padding: '8px 16px', borderRadius: 99, fontSize: 12, fontWeight: 600, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--muted)', cursor: 'pointer', transition: 'all .2s var(--ease)' },
  tagActive: { background: 'var(--green)', color: 'var(--surface)', borderColor: 'var(--green)' },
}

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
        setHubs((data as any[]).map((h: any) => ({
          id: h.id, slug: h.slug, name: h.name, county: h.county,
          description: h.description, member_count: h.member_count ?? 0,
          post_count: h.post_count ?? 0, active_member_count: h.active_member_count ?? 0,
          category: h.category ?? 'county_hub', trend: Math.floor(Math.random() * 15) + 1, topTopics: [],
        })))
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [supabase])

  useEffect(() => { fetchHubs() }, [fetchHubs])

  const filtered = hubs.filter(h => {
    if (activeFilter === 'trending') return h.trend >= 10
    if (activeFilter === 'county') return h.category === 'county_hub'
    return true
  })

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: 'var(--green)', borderTopColor: 'transparent' }} /></div>

  return (
    <>
      <section className="page-head pb-4">
        <div className="flex items-center gap-3 mb-2">
          <Compass className="w-8 h-8" style={{ color: 'var(--green)' }} />
          <div>
            <h1 className="page-title mb-0" style={{ color: 'var(--ink)' }}>Baraza Hubs</h1>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Discover conversations from your region</p>
          </div>
        </div>
      </section>

      {profile?.county_hub && (
        <section style={{ ...s.card, borderLeft: '4px solid var(--green)', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5" style={{ color: 'var(--green)' }} />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--green)' }}>Your County Hub</p>
              <p className="text-lg font-bold" style={{ color: 'var(--ink)' }}>{profile.county_hub}</p>
            </div>
          </div>
          <Link href={`/baraza/${profile.county_hub.toLowerCase().replace(/\s+/g, '-')}`}
            style={{ padding: '8px 16px', borderRadius: 11, fontWeight: 700, fontSize: 12, background: 'var(--gold)', color: 'var(--night)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            View Hub →
          </Link>
        </section>
      )}

      <section className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {(['all', 'trending', 'county'] as const).map(f => (
          <button key={f} onClick={() => setActiveFilter(f)}
            style={{ ...s.tag, ...(activeFilter === f ? s.tagActive : {}) }}>
            {f === 'all' && 'All Hubs'}
            {f === 'trending' && '🔥 Trending'}
            {f === 'county' && '📍 County Hubs'}
          </button>
        ))}
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--ink)' }}>
          <TrendingUp className="w-5 h-5" style={{ color: 'var(--green)' }} /> Trending Hubs
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.sort((a, b) => b.trend - a.trend).slice(0, 6).map(hub => (
            <Link key={hub.id} href={`/baraza/${hub.slug}`}
              style={{ ...s.card, display: 'block', textDecoration: 'none', transition: 'all 0.3s var(--ease)' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)'; e.currentTarget.style.borderColor = 'color-mix(in oklab, var(--green) 50%, transparent)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'var(--line)' }}>
              <div className="flex items-start justify-between mb-3">
                <span style={{ padding: '2px 10px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: 'color-mix(in oklab, var(--green) 20%, var(--surface))', color: 'var(--green)' }}>County Hub</span>
                <span className="flex items-center gap-1" style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}><TrendingUp className="w-3 h-3" /> +{hub.trend}%</span>
              </div>
              <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--ink)' }}>{hub.name}</h3>
              <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--muted)' }}>{hub.description || 'Discover local conversations in your region'}</p>
              <div className="flex items-center gap-4 text-xs pt-3" style={{ color: 'var(--muted)', borderTop: '1px solid var(--line)' }}>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{hub.member_count.toLocaleString()}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{hub.post_count.toLocaleString()} posts</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--ink)' }}>
          <MapPin className="w-5 h-5" style={{ color: 'var(--green)' }} /> All Regional Hubs
        </h2>
        <div className="space-y-2">
          {filtered.map(hub => (
            <Link key={hub.id} href={`/baraza/${hub.slug}`}
              style={{ ...s.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', transition: 'all 0.2s var(--ease)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--raised)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)' }}>
              <div className="flex items-center gap-4 flex-1">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg transition-transform" style={{ background: 'color-mix(in oklab, var(--green) 20%, var(--gold) 20%, var(--surface))', fontSize: 18 }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={e => e.currentTarget.style.transform = ''}>📍</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold" style={{ color: 'var(--ink)' }}>{hub.name}</h3>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{hub.county} · {hub.post_count.toLocaleString()} posts · {hub.member_count.toLocaleString()} active</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 transition-all" style={{ color: 'var(--muted)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--green)'; e.currentTarget.style.transform = 'translateX(4px)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.transform = '' }} />
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
