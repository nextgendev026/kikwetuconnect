'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSupabase, useUser, toast } from '@/app/providers'
import { Users, Hash, Plus, X, Filter, Search, Globe, Sparkles, Sprout, Cpu, Ship, BookOpen, Coins, ShoppingBag, Leaf, Building2, Microscope, Scale, HeartPulse } from 'lucide-react'

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

const SPACE_COVERS: Record<string, { gradient: string }> = {
  '1': { gradient: 'linear-gradient(135deg, #2d6a4f 0%, #40916c 50%, #52b788 100%)' },
  '2': { gradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' },
  '3': { gradient: 'linear-gradient(135deg, #0c3483 0%, #a2b6df 50%, #6b8cce 100%)' },
  '4': { gradient: 'linear-gradient(135deg, #780206 0%, #061161 50%, #1a2a6c 100%)' },
  '5': { gradient: 'linear-gradient(135deg, #134e5e 0%, #71b280 50%, #2c6e49 100%)' },
  '6': { gradient: 'linear-gradient(135deg, #c94b4b 0%, #4b134f 50%, #8e44ad 100%)' },
}

const FALLBACK_SPACES: Space[] = [
  { id: '1', name: '#KilimoSmart', slug: 'kilimo-smart', description: 'Modern farming techniques, smart agriculture, and agribusiness tips for Kenyan farmers.', icon: '🌱', category: 'Agriculture', member_count: 1420, post_count: 89, created_by: '' },
  { id: '2', name: 'Nairobi Tech', slug: 'nairobi-tech', description: 'Kenyan tech scene — startups, AI, fintech, and developer meetups in Nairobi.', icon: '💻', category: 'Technology', member_count: 2340, post_count: 156, created_by: '' },
  { id: '3', name: 'Mombasa Trade', slug: 'mombasa-trade', description: 'Coastal business hub — import/export, port trade, tourism ventures & biashara.', icon: '🚢', category: 'Business', member_count: 980, post_count: 67, created_by: '' },
  { id: '4', name: 'Learn Together', slug: 'learn-together', description: 'Peer-to-peer learning groups, study circles, and educational resources across Kenya.', icon: '📚', category: 'Education', member_count: 1870, post_count: 112, created_by: '' },
  { id: '5', name: 'Hustler Fund', slug: 'hustler-fund', description: 'Discussions on SACCOs, table banking, M-Pesa, credit access, and financial literacy.', icon: '💰', category: 'Finance', member_count: 2150, post_count: 134, created_by: '' },
  { id: '6', name: 'Mama Mboga Network', slug: 'mama-mboga-network', description: 'Market vendors, fresh produce supply chains, and small-scale trading community.', icon: '🛒', category: 'Business', member_count: 760, post_count: 45, created_by: '' },
]

const style = {
  card: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20, boxShadow: 'var(--card-shadow)' },
  input: { width: '100%', background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: 11, padding: '10px 14px', fontSize: 13, color: 'var(--ink)', outline: 'none' },
  btn: { padding: '10px 20px', borderRadius: 11, fontWeight: 700, fontSize: 12, border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all .2s var(--ease)' },
  primaryBtn: { background: 'var(--gold)', color: 'var(--night)' },
  secondaryBtn: { background: 'var(--raised)', color: 'var(--ink)', border: '1px solid var(--line)' },
  tag: { padding: '6px 14px', borderRadius: 99, fontSize: 10, fontWeight: 600, border: '1px solid var(--line)', background: 'var(--raised)', color: 'var(--muted)', cursor: 'pointer', transition: 'all .2s var(--ease)' },
  tagActive: { background: 'var(--gold)', color: 'var(--night)', borderColor: 'var(--gold)' },
  spaceCard: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--card-shadow)' },
  modalOverlay: { background: 'color-mix(in oklab, var(--night) 80%, transparent)' },
  modalContent: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 24, width: 'min(480px, 100%)' },
}

export default function SpacesPage() {
  const supabase = useSupabase()
  const { profile, loading: userLoading } = useUser()
  const [spaces, setSpaces] = useState<Space[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [memberSpaces, setMemberSpaces] = useState<Set<string>>(new Set())
  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [createIcon, setCreateIcon] = useState('🌍')
  const [createCategory, setCreateCategory] = useState('Technology')
  const [creating, setCreating] = useState(false)
  const [seeding, setSeeding] = useState(false)

  useEffect(() => { if (!userLoading) { fetchSpaces(); fetchMemberships() } }, [userLoading])

  const fetchSpaces = async () => {
    setLoading(true)
    try {
      const { data } = await supabase.from('spaces').select('*').order('member_count', { ascending: false })
      if (data && data.length > 0) setSpaces(data as Space[])
      else setSpaces(FALLBACK_SPACES)
    } catch { setSpaces(FALLBACK_SPACES) }
    finally { setLoading(false) }
  }

  const fetchMemberships = async () => {
    if (!profile) return
    const { data } = await supabase.from('space_members').select('space_id').eq('user_id', profile.id)
    if (data) setMemberSpaces(new Set(data.map((m: { space_id: string }) => m.space_id)))
  }

  const handleSeedSpaces = async () => {
    if (!profile) return toast('Sign in to seed spaces')
    setSeeding(true)
    try {
      const { data: existing } = await supabase.from('spaces').select('id').limit(1)
      if (existing && existing.length > 0) { toast('Spaces already exist in database'); return }
      const { error } = await supabase.from('spaces').insert(
        FALLBACK_SPACES.map(s => ({
          name: s.name, slug: s.slug, description: s.description, icon: s.icon,
          category: s.category, member_count: s.member_count, post_count: s.post_count,
          created_by: profile.id, cover_url: s.cover_url || '',
        }))
      )
      if (error) throw error
      toast('Default spaces seeded!')
      fetchSpaces()
    } catch (err: any) { toast(err.message || 'Failed to seed spaces') }
    finally { setSeeding(false) }
  }

  const handleJoin = async (space: Space) => {
    if (!profile) return toast('Sign in to join spaces')
    try {
      const { error } = await supabase.from('space_members').insert({ space_id: space.id, user_id: profile.id, role: 'member' })
      if (error) throw error
      await supabase.from('spaces').update({ member_count: space.member_count + 1 }).eq('id', space.id)
      setMemberSpaces(prev => new Set(prev).add(space.id))
      setSpaces(prev => prev.map(s => s.id === space.id ? { ...s, member_count: s.member_count + 1 } : s))
      toast(`Joined ${space.name}`)
    } catch { toast('Failed to join space') }
  }

  const handleLeave = async (space: Space) => {
    if (!profile) return
    try {
      const { error } = await supabase.from('space_members').delete().eq('space_id', space.id).eq('user_id', profile.id)
      if (error) throw error
      await supabase.from('spaces').update({ member_count: Math.max(0, space.member_count - 1) }).eq('id', space.id)
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
      const slug = createName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const { data, error } = await supabase.from('spaces').insert({
        name: createName.trim(), slug, description: createDesc.trim(), icon: createIcon,
        category: createCategory, created_by: profile.id, member_count: 1,
      }).select().single()
      if (error) throw error
      if (data) {
        await supabase.from('space_members').insert({ space_id: data.id, user_id: profile.id, role: 'admin' })
        setSpaces(prev => [data as Space, ...prev])
        setMemberSpaces(prev => new Set(prev).add(data.id))
      }
      setShowCreate(false); setCreateName(''); setCreateDesc(''); setCreateIcon('🌍')
      toast('Space created!')
    } catch { toast('Failed to create space') }
    finally { setCreating(false) }
  }

  const filtered = spaces.filter(s => {
    if (category !== 'All' && s.category !== category) return false
    if (searchTerm && !s.name.toLowerCase().includes(searchTerm.toLowerCase()) && !s.description.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
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

      {/* Search & Filter */}
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

      {/* Spaces Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2" style={{ borderColor: 'var(--green)', borderTopColor: 'transparent', borderRadius: '50%' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={style.card} className="text-center py-12">
          <Hash className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--muted)', opacity: 0.3 }} />
          <p className="font-medium mb-1" style={{ color: 'var(--ink)' }}>No spaces found</p>
          <p className="text-xs mb-6" style={{ color: 'var(--muted)' }}>Try a different category or search</p>
          <button onClick={() => setShowCreate(true)} style={{ ...style.btn, ...style.primaryBtn }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
            <Plus className="w-4 h-4" /> Create the first space
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>{filtered.length} space{filtered.length !== 1 ? 's' : ''}</p>
            <div className="flex gap-2">
              <button onClick={handleSeedSpaces} disabled={seeding}
                style={{ ...style.secondaryBtn, padding: '6px 12px', fontSize: 10 }}>
                {seeding ? 'Seeding...' : 'Seed defaults'}
              </button>
              <button onClick={() => setShowCreate(true)} style={{ ...style.btn, ...style.primaryBtn }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
                <Plus className="w-4 h-4" /> New Space
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(space => {
              const isMember = memberSpaces.has(space.id)
              const cover = SPACE_COVERS[space.id] || { gradient: 'linear-gradient(135deg, var(--gold), var(--green))' }
              const catMeta = CATEGORY_META[space.category] || CATEGORY_META.Technology
              const CatIcon = catMeta.icon
              return (
                <div key={space.id} style={style.spaceCard} className="card-hover feature-card">
                  {/* Cover thumbnail */}
                  <div style={{ height: 120, background: cover.gradient, position: 'relative', display: 'flex', alignItems: 'flex-end', padding: 16 }}>
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
                          style={{ ...style.secondaryBtn, padding: '6px 12px', fontSize: 10 }}>
                          Leave
                        </button>
                      ) : (
                        <button onClick={() => handleJoin(space)}
                          style={{ ...style.btn, ...style.primaryBtn, padding: '6px 12px', fontSize: 10 }}>
                          <Sparkles className="w-3 h-3" /> Join
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={style.modalOverlay} onClick={e => { if (e.target === e.currentTarget) setShowCreate(false) }}>
          <div className="animate-rise" style={style.modalContent}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-lg" style={{ color: 'var(--ink)' }}>Create a Space</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Build a focused community around a topic</p>
              </div>
              <button onClick={() => setShowCreate(false)}
                className="w-8 h-8 rounded-full grid place-items-center transition-colors"
                style={{ background: 'var(--raised)', color: 'var(--muted)', border: 0, cursor: 'pointer' }}>&times;</button>
            </div>

            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>Icon</label>
            <input type="text" placeholder="Emoji icon" value={createIcon} onChange={e => setCreateIcon(e.target.value)} maxLength={2}
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
          </div>
        </div>
      )}
    </div>
  )
}
