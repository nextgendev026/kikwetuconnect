'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useUser, toast } from '@/app/providers'
import { Users, Hash, Plus, X, Search, Globe, BookOpen, Building2, Sparkles, Heart, MessageCircle, MapPin, Phone, Mail, ExternalLink } from 'lucide-react'

const CATEGORIES = ['All', 'Business', 'Agriculture', 'Technology', 'Education', 'Health', 'Finance', 'Culture', 'Legal', 'Nonprofit', 'Media', 'Government']

const CATEGORY_COLORS: Record<string, string> = {
  Business: '#b8860b', Agriculture: '#2d6a4f', Technology: '#1a1a2e',
  Education: '#6c5ce7', Health: '#e17055', Finance: '#00b894',
  Culture: '#fd79a8', Legal: '#2c3e50', Nonprofit: '#0984e3',
  Media: '#d63031', Government: '#636e72',
}

const GRADIENTS = [
  'linear-gradient(135deg, #b8860b 0%, #daa520 50%, #f0e68c 100%)',
  'linear-gradient(135deg, #2d6a4f 0%, #40916c 50%, #52b788 100%)',
  'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  'linear-gradient(135deg, #6c5ce7 0%, #a29bfe 50%, #dfe6e9 100%)',
  'linear-gradient(135deg, #e17055 0%, #fab1a0 50%, #ffeaa7 100%)',
  'linear-gradient(135deg, #00b894 0%, #00cec9 50%, #81ecec 100%)',
  'linear-gradient(135deg, #fd79a8 0%, #e84393 50%, #6c5ce7 100%)',
  'linear-gradient(135deg, #2c3e50 0%, #3498db 50%, #2980b9 100%)',
]

interface Page {
  id: string; name: string; slug: string; category: string; description: string
  cover_url: string | null; avatar_url: string | null
  website: string | null; phone: string | null; email: string | null; address: string | null
  is_verified: boolean; followers_count: number; posts_count: number
  created_by: string; created_at: string
}

const style = {
  card: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20, boxShadow: 'var(--card-shadow)' },
  input: { width: '100%', background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: 11, padding: '10px 14px', fontSize: 13, color: 'var(--ink)', outline: 'none' },
  btn: { padding: '10px 20px', borderRadius: 11, fontWeight: 700, fontSize: 12, border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all .2s var(--ease)' },
  primaryBtn: { background: 'var(--gold)', color: 'var(--night)' },
  secondaryBtn: { background: 'var(--raised)', color: 'var(--ink)', border: '1px solid var(--line)' },
  tag: { padding: '6px 14px', borderRadius: 99, fontSize: 10, fontWeight: 600, border: '1px solid var(--line)', background: 'var(--raised)', color: 'var(--muted)', cursor: 'pointer', transition: 'all .2s var(--ease)' },
  tagActive: { background: 'var(--gold)', color: 'var(--night)', borderColor: 'var(--gold)' },
  pageCard: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--card-shadow)' },
  modalOverlay: { background: 'color-mix(in oklab, var(--night) 80%, transparent)' },
  modalContent: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 24, width: 'min(520px, 100%)' },
}

export default function PagesPage() {
  const { profile, loading: userLoading } = useUser()
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [category, setCategory] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [followedPages, setFollowedPages] = useState<Set<string>>(new Set())
  const [myAdminPageIds, setMyAdminPageIds] = useState<Set<string>>(new Set())
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)

  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [createCategory, setCreateCategory] = useState('Business')
  const [creating, setCreating] = useState(false)

  const firstFieldRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (!userLoading) { fetchPages(); fetchFollowsAndAdmins() } }, [userLoading])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowCreate(false) }
    if (showCreate) { document.addEventListener('keydown', handleEsc); firstFieldRef.current?.focus() }
    return () => document.removeEventListener('keydown', handleEsc)
  }, [showCreate])

  const fetchApi = async (path: string, opts?: RequestInit) => {
    const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Request failed')
    return json
  }

  const fetchPages = async (append = false) => {
    if (!append) setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '12' })
      if (category !== 'All') params.set('category', category)
      if (searchTerm) params.set('search', searchTerm)
      if (append && pages.length > 0) params.set('cursor', String(pages[pages.length - 1].followers_count))
      const json = await fetchApi(`/api/pages?${params}`)
      const newPages = json.data || []
      setPages(prev => append ? [...prev, ...newPages] : newPages)
      setHasMore(!!json.nextCursor)
      setTotalCount(json.count || 0)
    } catch { /* keep existing */ }
    finally { setLoading(false); setLoadingMore(false) }
  }

  useEffect(() => {
    if (!userLoading) { setPages([]); setHasMore(false); fetchPages() }
  }, [category, searchTerm])

  const fetchFollowsAndAdmins = async () => {
    if (!profile) return
    try {
      const params = new URLSearchParams({ limit: '1' })
      const json = await fetchApi(`/api/pages?${params}`)
      setFollowedPages(new Set(json.userFollows || []))
      setMyAdminPageIds(new Set(json.userAdmins || []))
    } catch { /* ignore */ }
  }

  const handleFollow = async (pageId: string) => {
    if (!profile) return toast('Sign in to follow pages')
    try {
      await fetchApi('/api/pages', { method: 'POST', body: JSON.stringify({ action: 'follow', page_id: pageId }) })
      setFollowedPages(prev => new Set(prev).add(pageId))
      setPages(prev => prev.map(p => p.id === pageId ? { ...p, followers_count: p.followers_count + 1 } : p))
      toast('Following page')
    } catch { toast('Failed to follow') }
  }

  const handleUnfollow = async (pageId: string) => {
    if (!profile) return
    try {
      await fetchApi('/api/pages', { method: 'POST', body: JSON.stringify({ action: 'unfollow', page_id: pageId }) })
      setFollowedPages(prev => { const n = new Set(prev); n.delete(pageId); return n })
      setPages(prev => prev.map(p => p.id === pageId ? { ...p, followers_count: Math.max(0, p.followers_count - 1) } : p))
      toast('Unfollowed page')
    } catch { toast('Failed to unfollow') }
  }

  const handleCreate = async () => {
    if (!createName.trim() || !createDesc.trim()) return toast('Name and description required')
    if (!profile) return toast('Sign in to create a page')
    setCreating(true)
    try {
      const json = await fetchApi('/api/pages', {
        method: 'POST',
        body: JSON.stringify({ action: 'create', name: createName.trim(), description: createDesc.trim(), category: createCategory }),
      })
      setPages(prev => [json.data, ...prev])
      setMyAdminPageIds(prev => new Set(prev).add(json.data.id))
      setShowCreate(false); setCreateName(''); setCreateDesc('')
      toast('Page created!')
    } catch { toast('Failed to create page') }
    finally { setCreating(false) }
  }

  const handleLoadMore = () => { setLoadingMore(true); fetchPages(true) }

  const gradientForPage = (page: Page) => {
    let hash = 0
    for (let i = 0; i < page.id.length; i++) hash = ((hash << 5) - hash) + page.id.charCodeAt(i)
    return GRADIENTS[Math.abs(hash) % GRADIENTS.length]
  }

  if (userLoading) return <div className="flex items-center justify-center min-h-[80vh]"><div className="animate-spin w-8 h-8 border-2" style={{ borderColor: 'var(--green)', borderTopColor: 'transparent', borderRadius: '50%' }} /></div>

  return (
    <div className="pb-8 animate-fade-in-up">
      <section className="page-head">
        <div className="flex items-center gap-3">
          <Building2 className="w-7 h-7" style={{ color: 'var(--green)' }} />
          <div>
            <h1 className="page-title">Pages</h1>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Follow organizations, brands, and public figures</p>
          </div>
        </div>
      </section>

      <div style={style.card} className="mb-6">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted)' }} />
          <input type="text" placeholder="Search pages..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
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
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2" style={{ borderColor: 'var(--green)', borderTopColor: 'transparent', borderRadius: '50%' }} />
        </div>
      ) : pages.length === 0 ? (
        <div style={style.card} className="text-center py-12">
          <Hash className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--muted)', opacity: 0.3 }} />
          <p className="font-medium mb-1" style={{ color: 'var(--ink)' }}>No pages found</p>
          <p className="text-xs mb-6" style={{ color: 'var(--muted)' }}>Try a different category or search</p>
          <button onClick={() => setShowCreate(true)} style={{ ...style.btn, ...style.primaryBtn }}>
            <Plus className="w-4 h-4" /> Create the first page
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>{totalCount} page{totalCount !== 1 ? 's' : ''}</p>
            <button onClick={() => setShowCreate(true)} style={{ ...style.btn, ...style.primaryBtn }}>
              <Plus className="w-4 h-4" /> New Page
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pages.map(page => {
              const isFollowed = followedPages.has(page.id)
              const gradient = gradientForPage(page)
              const catColor = CATEGORY_COLORS[page.category] || 'var(--green)'
              return (
                <div key={page.id} style={style.pageCard} className="card-hover feature-card">
                  <div style={{ height: 100, background: gradient, position: 'relative', display: 'flex', alignItems: 'flex-end', padding: 16 }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,0.5) 0%, transparent 60%)' }} />
                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--surface)', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 700, color: catColor, flexShrink: 0, border: '2px solid rgba(255,255,255,0.3)' }}>
                        {(page.name || '?')[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="flex items-center gap-2">
                          <Link href={`/pages/${page.slug}`}
                            className="font-bold text-sm block truncate transition-colors"
                            style={{ color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                            {page.name}
                          </Link>
                          {page.is_verified && (
                            <span style={{ color: '#0ea5e9', fontSize: 14, flexShrink: 0 }}>✓</span>
                          )}
                        </div>
                        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.8)' }}>{page.category}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: 16 }}>
                    <p className="text-xs line-clamp-2 leading-relaxed mb-3" style={{ color: 'var(--muted)', minHeight: 32 }}>{page.description}</p>
                    <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--line)' }}>
                      <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--muted)' }}>
                        <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{page.followers_count}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" />{page.posts_count} posts</span>
                      </div>
                      {myAdminPageIds.has(page.id) ? (
                        <Link href={`/pages/${page.slug}`}
                          style={{ ...style.secondaryBtn, padding: '6px 12px', fontSize: 10 }}>
                          Manage
                        </Link>
                      ) : isFollowed ? (
                        <button onClick={() => handleUnfollow(page.id)}
                          style={{ ...style.secondaryBtn, padding: '6px 12px', fontSize: 10 }}>
                          Following
                        </button>
                      ) : (
                        <button onClick={() => handleFollow(page.id)}
                          style={{ ...style.btn, ...style.primaryBtn, padding: '6px 12px', fontSize: 10 }}>
                          <Sparkles className="w-3 h-3" /> Follow
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
                style={{ ...style.secondaryBtn, padding: '10px 24px', fontSize: 12 }}>
                {loadingMore ? 'Loading...' : 'Load more pages'}
              </button>
            </div>
          )}
        </>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={style.modalOverlay}
          role="dialog" aria-modal="true" aria-labelledby="create-page-title"
          onClick={e => { if (e.target === e.currentTarget) setShowCreate(false) }}>
          <div className="animate-rise" style={style.modalContent}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 id="create-page-title" className="font-bold text-lg" style={{ color: 'var(--ink)' }}>Create a Page</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Build a presence for your organization or brand</p>
              </div>
              <button onClick={() => setShowCreate(false)} aria-label="Close create page dialog"
                className="w-8 h-8 rounded-full grid place-items-center"
                style={{ background: 'var(--raised)', color: 'var(--muted)', border: 0, cursor: 'pointer' }}><X className="w-4 h-4" /></button>
            </div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>Page name</label>
            <input ref={firstFieldRef} type="text" placeholder="e.g. Nairobi Tech Hub" value={createName} onChange={e => setCreateName(e.target.value)}
              style={style.input} className="!mb-3" />
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>Description</label>
            <textarea placeholder="What is your page about?" value={createDesc} onChange={e => setCreateDesc(e.target.value)} rows={3}
              style={{ ...style.input, resize: 'none' }} className="!mb-3" />
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>Category</label>
            <select value={createCategory} onChange={e => setCreateCategory(e.target.value)}
              style={style.input} className="!mb-5">
              {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={handleCreate} disabled={creating || !createName.trim() || !createDesc.trim()}
              style={{ ...style.btn, ...style.primaryBtn, width: '100%', justifyContent: 'center', opacity: (creating || !createName.trim() || !createDesc.trim()) ? 0.5 : 1 }}>
              {creating ? 'Creating...' : 'Create Page'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
