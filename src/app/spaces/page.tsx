'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useUser, toast } from '@/app/providers'
import BottomSheet from '@/components/ui/bottom-sheet'
import { Users, Hash, Plus, X, Filter, Search, Globe, Sparkles, Sprout, Cpu, Ship, BookOpen, Coins, Leaf, Building2, Microscope, Scale, HeartPulse } from 'lucide-react'

interface Space {
  id: string; name: string; slug: string; description: string; icon: string; category: string; member_count: number; post_count: number; created_by: string; cover_url?: string
}

const CATEGORIES = ['All', 'Agriculture', 'Technology', 'Business', 'Education', 'Finance', 'Health', 'Culture', 'Legal']

const CATEGORY_META: Record<string, { gradient: string; icon: any }> = {
  Agriculture: { gradient: 'linear-gradient(135deg, #2d6a4f, #52b788)', icon: Sprout },
  Technology: { gradient: 'linear-gradient(135deg, #1a1a2e, #16213e)', icon: Cpu },
  Business: { gradient: 'linear-gradient(135deg, #b8860b, #daa520)', icon: Ship },
  Education: { gradient: 'linear-gradient(135deg, #6c5ce7, #a29bfe)', icon: BookOpen },
  Finance: { gradient: 'linear-gradient(135deg, #00b894, #00cec9)', icon: Coins },
  Health: { gradient: 'linear-gradient(135deg, #e17055, #fab1a0)', icon: HeartPulse },
  Culture: { gradient: 'linear-gradient(135deg, #6c5ce7, #fd79a8)', icon: Building2 },
  Legal: { gradient: 'linear-gradient(135deg, #2c3e50, #3498db)', icon: Scale },
}

const GRADIENTS = [
  'linear-gradient(135deg, #2d6a4f 0%, #40916c 50%, #52b788 100%)',
  'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
  'linear-gradient(135deg, #0c3483 0%, #a2b6df 50%, #6b8cce 100%)',
  'linear-gradient(135deg, #780206 0%, #061161 50%, #1a2a6c 100%)',
  'linear-gradient(135deg, #134e5e 0%, #71b280 50%, #2c6e49 100%)',
  'linear-gradient(135deg, #c94b4b 0%, #4b134f 50%, #8e44ad 100%)',
]

const style = {
  card: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20, boxShadow: 'var(--card-shadow)' },
  input: { width: '100%', background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: 11, padding: '10px 14px', fontSize: 13, color: 'var(--ink)', outline: 'none' },
  btn: { padding: '10px 20px', borderRadius: 11, fontWeight: 700, fontSize: 13, border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'transform .1s var(--ease), box-shadow .2s var(--ease), background .2s var(--ease)' },
  primaryBtn: { background: 'var(--gold)', color: 'var(--night)' },
  secondaryBtn: { background: 'var(--raised)', color: 'var(--ink)', border: '1px solid var(--line)' },
  tag: { padding: '6px 14px', borderRadius: 99, fontSize: 11, fontWeight: 600, border: '1px solid var(--line)', background: 'var(--raised)', color: 'var(--muted)', cursor: 'pointer', transition: 'all .2s var(--ease)' },
  tagActive: { background: 'var(--gold)', color: 'var(--night)', borderColor: 'var(--gold)' },
  spaceCard: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--card-shadow)' },
  modalOverlay: { background: 'color-mix(in oklab, var(--night) 80%, transparent)' },
  modalContent: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 24, width: 'min(480px, 100%)', position: 'relative' as const },
}

function SkeletonCard() {
  return (
    <div style={style.spaceCard}>
      <div style={{ height: 120, background: 'var(--raised)' }} />
      <div style={{ padding: 16 }}>
        <div style={{ height: 14, width: '60%', background: 'var(--raised)', borderRadius: 6, marginBottom: 10 }} />
        <div style={{ height: 12, width: '90%', background: 'var(--raised)', borderRadius: 6, marginBottom: 6 }} />
        <div style={{ height: 12, width: '70%', background: 'var(--raised)', borderRadius: 6, marginBottom: 16 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ height: 12, width: '30%', background: 'var(--raised)', borderRadius: 6 }} />
          <div style={{ height: 28, width: 60, background: 'var(--raised)', borderRadius: 11 }} />
        </div>
      </div>
    </div>
  )
}

export default function SpacesPage() {
  const { profile, loading: userLoading } = useUser()
  const [spaces, setSpaces] = useState<Space[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [category, setCategory] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [memberSpaces, setMemberSpaces] = useState<Set<string>>(new Set())
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)

  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [createIcon, setCreateIcon] = useState('🌍')
  const [createCategory, setCreateCategory] = useState('Technology')
  const [creating, setCreating] = useState(false)

  const firstFieldRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (!userLoading) { fetchSpaces(); fetchMemberships() } }, [userLoading])

  useEffect(() => {
    if (showCreate && firstFieldRef.current) setTimeout(() => firstFieldRef.current?.focus(), 100)
  }, [showCreate])

  const fetchApi = async (path: string, opts?: RequestInit) => {
    const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Request failed')
    return json
  }

  const fetchSpaces = async (append = false) => {
    if (!append) setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '12' })
      if (category !== 'All') params.set('category', category)
      if (searchTerm) params.set('search', searchTerm)
      if (append && spaces.length > 0) {
        const lastSpace = spaces[spaces.length - 1]
        params.set('cursor', String(lastSpace.member_count))
      }
      const json = await fetchApi(`/api/spaces?${params}`)
      const newSpaces = json.data || []
      setSpaces(prev => append ? [...prev, ...newSpaces] : newSpaces)
      setHasMore(!!json.nextCursor)
      setTotalCount(json.count || 0)
    } catch { /* keep existing data */ }
    finally { setLoading(false); setLoadingMore(false) }
  }

  useEffect(() => {
    if (!userLoading) { setSpaces([]); setHasMore(false); fetchSpaces() }
  }, [category, searchTerm])

  const fetchMemberships = async () => {
    if (!profile) return
    try {
      const json = await fetchApi(`/api/spaces?limit=1`)
      setMemberSpaces(new Set(json.userMemberships || []))
    } catch { /* ignore */ }
  }

  const handleJoin = async (space: Space) => {
    if (!profile) return toast('Sign in to join spaces')
    try {
      await fetchApi('/api/spaces', {
        method: 'POST',
        body: JSON.stringify({ action: 'join', space_id: space.id }),
      })
      setMemberSpaces(prev => new Set(prev).add(space.id))
      setSpaces(prev => prev.map(s => s.id === space.id ? { ...s, member_count: s.member_count + 1 } : s))
      toast(`Joined ${space.name}`)
    } catch { toast('Failed to join space') }
  }

  const handleLeave = async (space: Space) => {
    if (!profile) return
    try {
      await fetchApi('/api/spaces', {
        method: 'POST',
        body: JSON.stringify({ action: 'leave', space_id: space.id }),
      })
      setMemberSpaces(prev => { const n = new Set(prev); n.delete(space.id); return n })
      setSpaces(prev => prev.map(s => s.id === space.id ? { ...s, member_count: Math.max(0, s.member_count - 1) } : s))
      toast(`Left ${space.name}`)
    } catch { toast('Failed to leave space') }
  }

  const handleCreate = async () => {
    if (!createName.trim() || !createDesc.trim()) return toast('Name and description required')
    if (!profile) return toast('Sign in to create a space')
    setCreating(true)
    try {
      const json = await fetchApi('/api/spaces', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          name: createName.trim(),
          description: createDesc.trim(),
          icon: createIcon,
          category: createCategory,
        }),
      })
      setSpaces(prev => [json.data, ...prev])
      setMemberSpaces(prev => new Set(prev).add(json.data.id))
      setShowCreate(false); setCreateName(''); setCreateDesc(''); setCreateIcon('🌍')
      toast('Space created!')
    } catch { toast('Failed to create space') }
    finally { setCreating(false) }
  }

  const handleLoadMore = () => {
    setLoadingMore(true); fetchSpaces(true)
  }

  const gradientForSpace = (space: Space) => {
    let hash = 0
    for (let i = 0; i < space.id.length; i++) hash = ((hash << 5) - hash) + space.id.charCodeAt(i)
    return GRADIENTS[Math.abs(hash) % GRADIENTS.length]
  }

  const activeBtn = (base: React.CSSProperties): React.CSSProperties => ({
    ...base,
    transition: 'transform .1s var(--ease), box-shadow .2s var(--ease)',
  })

  if (userLoading) return <div className="flex items-center justify-center min-h-[80vh]"><div className="animate-spin w-8 h-8 border-2" style={{ borderColor: 'var(--green)', borderTopColor: 'transparent', borderRadius: '50%' }} /></div>

  return (
    <div className="pb-8 animate-fade-in-up">
      <section className="page-head">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Globe className="w-7 h-7" style={{ color: 'var(--green)' }} />
            Spaces
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Focused communities around topics you care about</p>
        </div>
      </section>

      <div style={style.card} className="mb-6">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted)' }} />
          <input type="text" placeholder="Search spaces..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            style={style.input} className="!pl-10" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              style={{ ...style.tag, ...(category === c ? style.tagActive : {}) }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : spaces.length === 0 ? (
        <div style={style.card} className="text-center py-12">
          <Hash className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--muted)', opacity: 0.3 }} />
          <p className="font-medium mb-1" style={{ color: 'var(--ink)' }}>No spaces found</p>
          <p className="text-xs mb-6" style={{ color: 'var(--muted)' }}>Try a different category or search</p>
          <button onClick={() => setShowCreate(true)} style={activeBtn({ ...style.btn, ...style.primaryBtn })}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
            <Plus className="w-4 h-4" /> Create the first space
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>{totalCount} space{totalCount !== 1 ? 's' : ''}</p>
            <button onClick={() => setShowCreate(true)} style={activeBtn({ ...style.btn, ...style.primaryBtn })}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
              <Plus className="w-4 h-4" /> New Space
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {spaces.map(space => {
              const isMember = memberSpaces.has(space.id)
              const gradient = gradientForSpace(space)
              const catMeta = CATEGORY_META[space.category] || CATEGORY_META.Technology
              const CatIcon = catMeta.icon
              return (
                <div key={space.id} style={style.spaceCard} className="card-hover feature-card">
                  <div style={{ height: 120, background: gradient, position: 'relative', display: 'flex', alignItems: 'flex-end', padding: 16 }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,0.5) 0%, transparent 60%)' }} />
                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="text-2xl flex-shrink-0" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>{space.icon && space.icon !== '#' ? space.icon : '🌍'}</span>
                      <div>
                        <Link href={`/spaces/${space.slug}`}
                          className="font-bold text-base block truncate transition-colors"
                          style={{ color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                          {space.name}
                        </Link>
                        <span className="flex items-center gap-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
                          <CatIcon className="w-3 h-3" /> {space.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: 16 }}>
                    <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: 'var(--muted)', minHeight: 32 }}>{space.description}</p>
                    <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
                      <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--muted)' }}>
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{space.member_count}</span>
                        <span>{space.post_count} posts</span>
                      </div>
                      {isMember ? (
                        <button onClick={() => handleLeave(space)}
                          style={{ ...style.secondaryBtn, padding: '8px 16px', fontSize: 12 }}>
                          Leave
                        </button>
                      ) : (
                        <button onClick={() => handleJoin(space)}
                          style={{ ...style.btn, ...style.primaryBtn, padding: '8px 16px', fontSize: 12 }}>
                          <Sparkles className="w-3 h-3" /> Join
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {hasMore && (
            <div className="flex justify-center mt-6">
              <button onClick={handleLoadMore} disabled={loadingMore}
                style={{ ...style.secondaryBtn, padding: '12px 28px', fontSize: 13 }}>
                {loadingMore ? 'Loading...' : 'Load more spaces'}
              </button>
            </div>
          )}
        </>
      )}

      <BottomSheet open={showCreate} onClose={() => setShowCreate(false)} title="Create a Space">
        <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>Build a focused community around a topic</p>

        <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>Icon</label>
        <input ref={firstFieldRef} type="text" placeholder="Emoji icon" value={createIcon} onChange={e => setCreateIcon(e.target.value)} maxLength={2}
          style={style.input} className="!mb-3" />

        <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>Name</label>
        <input type="text" placeholder="e.g. Kilimo Smart" value={createName} onChange={e => setCreateName(e.target.value)}
          style={style.input} className="!mb-3" />

        <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>Description</label>
        <textarea placeholder="What is this space about?" value={createDesc} onChange={e => setCreateDesc(e.target.value)} rows={3}
          style={{ ...style.input, resize: 'none' }} className="!mb-3" />

        <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>Category</label>
        <select value={createCategory} onChange={e => setCreateCategory(e.target.value)}
          style={style.input} className="!mb-5">
          {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <button onClick={handleCreate} disabled={creating || !createName.trim() || !createDesc.trim()}
          style={{ ...style.btn, ...style.primaryBtn, width: '100%', justifyContent: 'center', opacity: (creating || !createName.trim() || !createDesc.trim()) ? 0.5 : 1 }}>
          {creating ? 'Creating...' : 'Create Space'}
        </button>
      </BottomSheet>
    </div>
  )
}
