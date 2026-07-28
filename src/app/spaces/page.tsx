'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSupabase, useUser, toast } from '@/app/providers'
import { Users, Hash, Plus, X, Filter, Search } from 'lucide-react'

interface Space {
  id: string; name: string; slug: string; description: string; icon: string; category: string; member_count: number; post_count: number; created_by: string
}

const FALLBACK_SPACES: Space[] = [
  { id: '1', name: '#KilimoSmart', slug: 'kilimo-smart', description: 'Modern farming techniques, smart agriculture, and agribusiness tips for Kenyan farmers.', icon: '🌱', category: 'Agriculture', member_count: 1420, post_count: 89, created_by: '' },
  { id: '2', name: 'Nairobi Tech', slug: 'nairobi-tech', description: 'Kenyan tech scene — startups, AI, fintech, and developer meetups in Nairobi.', icon: '💻', category: 'Technology', member_count: 2340, post_count: 156, created_by: '' },
  { id: '3', name: 'Mombasa Trade', slug: 'mombasa-trade', description: 'Coastal business hub — import/export, port trade, tourism ventures & biashara.', icon: '🚢', category: 'Business', member_count: 980, post_count: 67, created_by: '' },
  { id: '4', name: 'Learn Together', slug: 'learn-together', description: 'Peer-to-peer learning groups, study circles, and educational resources across Kenya.', icon: '📚', category: 'Education', member_count: 1870, post_count: 112, created_by: '' },
  { id: '5', name: 'Hustler Fund', slug: 'hustler-fund', description: 'Discussions on SACCOs, table banking, M-Pesa, credit access, and financial literacy.', icon: '💰', category: 'Finance', member_count: 2150, post_count: 134, created_by: '' },
  { id: '6', name: 'Mama Mboga Network', slug: 'mama-mboga-network', description: 'Market vendors, fresh produce supply chains, and small-scale trading community.', icon: '🛒', category: 'Business', member_count: 760, post_count: 45, created_by: '' },
]

const CATEGORIES = ['All', 'Agriculture', 'Technology', 'Business', 'Education', 'Finance', 'Health', 'Culture', 'Legal']

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
  const [createIcon, setCreateIcon] = useState('#')
  const [createCategory, setCreateCategory] = useState('Technology')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (userLoading) return
    fetchSpaces()
    fetchMemberships()
  }, [userLoading])

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
      setShowCreate(false); setCreateName(''); setCreateDesc(''); setCreateIcon('#')
      toast('Space created!')
    } catch { toast('Failed to create space') }
    finally { setCreating(false) }
  }

  const filtered = spaces.filter(s => {
    if (category !== 'All' && s.category !== category) return false
    if (searchTerm && !s.name.toLowerCase().includes(searchTerm.toLowerCase()) && !s.description.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  if (userLoading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-2 border-green border-t-transparent rounded-full" /></div>

  return (
    <div className="pb-8">
      <section className="page-head flex items-center justify-between">
        <div>
          <h1 className="page-title">Spaces</h1>
          <p className="text-muted text-sm">Focused communities around topics you care about</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[11px] bg-[oklch(75%_.14_84)] text-[oklch(14%_.025_151)] text-sm font-bold hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Create Space
        </button>
      </section>

      {/* Search & Filter */}
      <div className="card section mb-6">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(65%_.028_151)]" />
          <input type="text" placeholder="Search spaces..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[oklch(18%_.028_151)] border border-[oklch(29%_.025_151)] rounded-[11px] pl-10 pr-4 py-2.5 text-sm text-cream placeholder-[oklch(65%_.028_151)] focus:outline-none focus:border-[oklch(55%_.13_151)]" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`flex-none px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${category === c ? 'bg-[oklch(55%_.13_151)] text-[oklch(14%_.025_151)]' : 'bg-[oklch(21%_.03_151)] text-[oklch(65%_.028_151)] border border-[oklch(29%_.025_151)] hover:text-cream'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Spaces Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-green border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card section text-center py-12">
          <Hash className="w-12 h-12 text-[oklch(30%_.025_151)] mx-auto mb-4 opacity-50" />
          <p className="text-muted mb-2">No spaces found</p>
          <p className="text-xs text-[oklch(65%_.028_151)] mb-6">Try a different category or search</p>
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[11px] bg-[oklch(75%_.14_84)] text-[oklch(14%_.025_151)] text-sm font-bold hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> Create the first space
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(space => {
            const isMember = memberSpaces.has(space.id)
            return (
              <div key={space.id} className="rounded-[18px] p-5 border border-[oklch(29%_.025_151)] bg-[oklch(18%_.028_151)] hover:border-[oklch(55%_.13_151)]/40 transition-all group">
                <div className="flex items-start gap-4">
                  <span className="text-3xl flex-shrink-0">{space.icon || '#'}</span>
                  <div className="flex-1 min-w-0">
                    <Link href={`/spaces/${space.slug}`} className="font-bold text-base hover:text-[oklch(55%_.13_151)] transition-colors truncate block">{space.name}</Link>
                    <p className="text-xs text-[oklch(65%_.028_151)] mt-1 line-clamp-2 leading-relaxed">{space.description}</p>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-[oklch(29%_.025_151)]">
                      <div className="flex items-center gap-3 text-xs text-[oklch(65%_.028_151)]">
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{space.member_count}</span>
                        <span>{space.post_count} posts</span>
                      </div>
                      {isMember ? (
                        <button onClick={() => handleLeave(space)} className="px-3 py-1.5 rounded-[8px] text-xs font-medium border border-[oklch(29%_.025_151)] text-[oklch(65%_.028_151)] hover:text-red hover:border-red/50 transition-colors">Leave</button>
                      ) : (
                        <button onClick={() => handleJoin(space)} className="px-3 py-1.5 rounded-[8px] text-xs font-medium bg-[oklch(55%_.13_151)] text-[oklch(14%_.025_151)] hover:opacity-90 transition-opacity">Join</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-md rounded-[18px] bg-[oklch(18%_.028_151)] border border-[oklch(29%_.025_151)] p-6 animate-rise">
            <button onClick={() => setShowCreate(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[oklch(21%_.03_151)] flex items-center justify-center hover:bg-[oklch(29%_.025_151)] transition-colors">
              <X className="w-4 h-4" />
            </button>
            <h2 className="font-bold text-lg mb-1">Create a Space</h2>
            <p className="text-xs text-[oklch(65%_.028_151)] mb-5">Build a focused community around a topic</p>

            <label className="text-xs text-[oklch(65%_.028_151)] font-medium block mb-1.5">Icon</label>
            <input type="text" placeholder="Emoji or #" value={createIcon} onChange={e => setCreateIcon(e.target.value)} maxLength={2}
              className="w-full bg-[oklch(14%_.025_151)] border border-[oklch(29%_.025_151)] rounded-[11px] px-3 py-2.5 text-sm text-cream placeholder-[oklch(65%_.028_151)] focus:outline-none focus:border-[oklch(55%_.13_151)] mb-4" />

            <label className="text-xs text-[oklch(65%_.028_151)] font-medium block mb-1.5">Name</label>
            <input type="text" placeholder="e.g. Kilimo Smart" value={createName} onChange={e => setCreateName(e.target.value)}
              className="w-full bg-[oklch(14%_.025_151)] border border-[oklch(29%_.025_151)] rounded-[11px] px-3 py-2.5 text-sm text-cream placeholder-[oklch(65%_.028_151)] focus:outline-none focus:border-[oklch(55%_.13_151)] mb-4" />

            <label className="text-xs text-[oklch(65%_.028_151)] font-medium block mb-1.5">Description</label>
            <textarea placeholder="What is this space about?" value={createDesc} onChange={e => setCreateDesc(e.target.value)} rows={3}
              className="w-full bg-[oklch(14%_.025_151)] border border-[oklch(29%_.025_151)] rounded-[11px] px-3 py-2.5 text-sm text-cream placeholder-[oklch(65%_.028_151)] focus:outline-none focus:border-[oklch(55%_.13_151)] resize-none mb-4" />

            <label className="text-xs text-[oklch(65%_.028_151)] font-medium block mb-1.5">Category</label>
            <select value={createCategory} onChange={e => setCreateCategory(e.target.value)}
              className="w-full bg-[oklch(14%_.025_151)] border border-[oklch(29%_.025_151)] rounded-[11px] px-3 py-2.5 text-sm text-cream focus:outline-none focus:border-[oklch(55%_.13_151)] mb-5">
              {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <button onClick={handleCreate} disabled={creating || !createName.trim() || !createDesc.trim()}
              className="w-full py-2.5 rounded-[11px] bg-[oklch(75%_.14_84)] text-[oklch(14%_.025_151)] text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
              {creating ? 'Creating...' : 'Create Space'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
