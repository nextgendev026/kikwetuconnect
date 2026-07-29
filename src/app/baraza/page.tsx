'use client'
import Link from 'next/link'
import { MapPin, Users, TrendingUp, ArrowRight, Compass, Clock, Sparkles } from 'lucide-react'
import { useUser } from '@/app/providers'
import { useEffect, useState, useCallback } from 'react'

interface CountyHub {
  id: string; slug: string; name: string; county: string; description: string | null
  member_count: number; post_count: number; active_member_count: number; category: string; trend: number
}

const s = {
  card: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20, boxShadow: 'var(--card-shadow)' },
  tag: { padding: '8px 16px', borderRadius: 99, fontSize: 12, fontWeight: 600, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--muted)', cursor: 'pointer', transition: 'all .2s var(--ease)' },
  tagActive: { background: 'var(--green)', color: 'var(--surface)', borderColor: 'var(--green)' },
}

const Skeleton = ({ style }: { style?: React.CSSProperties }) => (
  <div style={{ height: 16, borderRadius: 8, background: 'var(--line)', opacity: 0.3, animation: 'pulse 1.5s ease-in-out infinite', ...style }} />
)

export default function BarazaPage() {
  const { profile } = useUser()
  const [hubs, setHubs] = useState<CountyHub[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [activeFilter, setActiveFilter] = useState<'all' | 'trending' | 'county'>('all')

  const fetchHubs = useCallback(async (p: number, append: boolean) => {
    try {
      const params = new URLSearchParams({ page: p.toString(), page_size: '20', sort: 'trend' })
      if (activeFilter === 'trending') params.set('sort', 'trend')
      if (activeFilter === 'county') params.set('category', 'county_hub')
      const res = await fetch(`/api/barazas?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      if (append) {
        setHubs(prev => [...prev, ...data.items])
      } else {
        setHubs(data.items || [])
      }
      setTotal(data.total || 0)
      setHasMore(data.has_more || false)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [activeFilter])

  useEffect(() => {
    setLoading(true)
    setPage(1)
    fetchHubs(1, false)
  }, [fetchHubs])

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    fetchHubs(next, true)
  }

  const filtered = hubs

  return (
    <>
      <style>{`@keyframes pulse{0%,100%{opacity:0.3}50%{opacity:0.6}}`}</style>
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
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ ...s.card, display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Skeleton style={{ width: 70 }} />
                  <Skeleton style={{ width: 50 }} />
                </div>
                <Skeleton style={{ width: '70%', marginBottom: 8 }} />
                <Skeleton style={{ width: '100%', marginBottom: 12, height: 32 }} />
                <div style={{ display: 'flex', gap: 16, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                  <Skeleton style={{ width: 60 }} />
                  <Skeleton style={{ width: 60 }} />
                </div>
              </div>
            ))
          ) : (
            filtered.sort((a, b) => b.trend - a.trend).slice(0, 6).map(hub => (
              <Link key={hub.id} href={`/baraza/${hub.slug}`}
                className="baraza-hub-card"
                style={{ ...s.card, display: 'block', textDecoration: 'none', transition: 'all 0.3s var(--ease)' }}>
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
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--ink)' }}>
          <MapPin className="w-5 h-5" style={{ color: 'var(--green)' }} /> All Regional Hubs <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)' }}>({total})</span>
        </h2>
        <div className="space-y-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ ...s.card, display: 'flex', alignItems: 'center', gap: 16 }}>
                <Skeleton style={{ width: 40, height: 40, borderRadius: '50%' }} />
                <div style={{ flex: 1 }}>
                  <Skeleton style={{ width: '40%', marginBottom: 6 }} />
                  <Skeleton style={{ width: '60%' }} />
                </div>
              </div>
            ))
          ) : (
            filtered.map(hub => (
              <Link key={hub.id} href={`/baraza/${hub.slug}`}
                className="baraza-row-card"
                style={{ ...s.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', transition: 'all 0.2s var(--ease)' }}>
                <div className="flex items-center gap-4 flex-1">
                  <div className="baraza-row-icon w-10 h-10 rounded-full flex items-center justify-center text-lg transition-transform" style={{ background: 'color-mix(in oklab, var(--green) 20%, var(--gold) 20%, var(--surface))', fontSize: 18 }}>📍</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold" style={{ color: 'var(--ink)' }}>{hub.name}</h3>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{hub.county} · {hub.post_count.toLocaleString()} posts · {hub.member_count.toLocaleString()} active</p>
                  </div>
                </div>
                <ArrowRight className="baraza-row-arrow w-5 h-5 transition-all" style={{ color: 'var(--muted)' }} />
              </Link>
            ))
          )}
        </div>
        {hasMore && (
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button onClick={loadMore} style={{ height: 42, padding: '0 20px', borderRadius: 10, background: 'var(--raised)', border: '1px solid var(--line)', color: 'var(--ink)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Load more hubs
            </button>
          </div>
        )}
      </section>
    </>
  )
}
