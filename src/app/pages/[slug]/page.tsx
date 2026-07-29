'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSupabase, useUser, toast } from '@/app/providers'
import { ArrowLeft, Users, Sparkles, Plus, Send, Clock, MessageCircle, Heart, Share2, Flag, MoreHorizontal, Globe, BookOpen, Building2, MapPin, Phone, Mail, ExternalLink, Hash, Check } from 'lucide-react'

interface PageDetail {
  id: string; name: string; slug: string; category: string; description: string
  cover_url: string | null; avatar_url: string | null
  website: string | null; phone: string | null; email: string | null; address: string | null
  is_verified: boolean; followers_count: number; posts_count: number
  created_by: string; created_at: string
}

interface Post {
  id: string; content: string; title: string; created_at: string; user_id: string; page_id: string
  profiles: { id: string; full_name: string; username: string; avatar_url: string | null } | null
}

interface FollowInfo { id: string; user_id: string }

const CATEGORY_COLORS: Record<string, string> = {
  Business: '#b8860b', Agriculture: '#2d6a4f', Technology: '#1a1a2e',
  Education: '#6c5ce7', Health: '#e17055', Finance: '#00b894',
  Culture: '#fd79a8', Legal: '#2c3e50', Nonprofit: '#0984e3',
  Media: '#d63031', Government: '#636e72',
}

const s = {
  card: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20, boxShadow: 'var(--card-shadow)' },
  input: { width: '100%', background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: 11, padding: '10px 14px', fontSize: 13, color: 'var(--ink)', outline: 'none' },
  btn: { padding: '8px 16px', borderRadius: 11, fontWeight: 700, fontSize: 12, border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all .2s var(--ease)' },
  primaryBtn: { background: 'var(--gold)', color: 'var(--night)' },
  secondaryBtn: { background: 'var(--raised)', color: 'var(--ink)', border: '1px solid var(--line)' },
}

export default function PageDetailPage() {
  const { slug } = useParams()
  const router = useRouter()
  const supabase = useSupabase()
  const { profile, loading: userLoading } = useUser()
  const [page, setPage] = useState<PageDetail | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [isFollowed, setIsFollowed] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminRole, setAdminRole] = useState<string | null>(null)
  const [newPost, setNewPost] = useState('')
  const [posting, setPosting] = useState(false)
  const [showNewPost, setShowNewPost] = useState(false)
  const [activeTab, setActiveTab] = useState<'posts' | 'about'>('posts')
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  useEffect(() => {
    if (!slug || userLoading) return
    fetchPage()
  }, [slug, userLoading])

  const fetchApi = async (path: string, opts?: RequestInit) => {
    const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Request failed')
    return json
  }

  const fetchPage = async () => {
    setLoading(true)
    try {
      const { data: pData } = await supabase.from('pages').select('*').eq('slug', slug).single()
      if (!pData) { toast('Page not found'); router.push('/pages'); return }
      setPage(pData as PageDetail)

      const { data: postsData } = await supabase
        .from('posts').select('*, profiles:user_id(id, full_name, username, avatar_url)')
        .eq('page_id', pData.id).order('created_at', { ascending: false }).limit(50)
      if (postsData) setPosts(postsData as Post[])

      if (profile) {
        const { data: follow } = await supabase.from('page_follows')
          .select('id').eq('page_id', pData.id).eq('user_id', profile.id).maybeSingle()
        setIsFollowed(!!follow)

        const { data: admin } = await supabase.from('page_admins')
          .select('role').eq('page_id', pData.id).eq('user_id', profile.id).maybeSingle()
        if (admin) { setIsAdmin(true); setAdminRole(admin.role) }
      }
    } catch { toast('Error loading page') }
    finally { setLoading(false) }
  }

  const handleFollow = async () => {
    if (!profile) return toast('Sign in to follow')
    if (!page) return
    try {
      await fetchApi('/api/pages', { method: 'POST', body: JSON.stringify({ action: 'follow', page_id: page.id }) })
      setIsFollowed(true)
      setPage(prev => prev ? { ...prev, followers_count: prev.followers_count + 1 } : prev)
      toast(`Following ${page.name}`)
    } catch { toast('Failed to follow') }
  }

  const handleUnfollow = async () => {
    if (!profile || !page) return
    try {
      await fetchApi('/api/pages', { method: 'POST', body: JSON.stringify({ action: 'unfollow', page_id: page.id }) })
      setIsFollowed(false)
      setPage(prev => prev ? { ...prev, followers_count: Math.max(0, prev.followers_count - 1) } : prev)
      toast(`Unfollowed ${page.name}`)
    } catch { toast('Failed to unfollow') }
  }

  const handlePost = async () => {
    if (!newPost.trim()) return toast('Write something')
    if (!profile || !page) return
    setPosting(true)
    try {
      const json = await fetchApi('/api/pages', {
        method: 'POST',
        body: JSON.stringify({
          action: 'post', page_id: page.id, content: newPost.trim(),
          title: newPost.split('\n')[0].slice(0, 100),
        }),
      })
      setPosts(prev => [json.data as Post, ...prev])
      setPage(prev => prev ? { ...prev, posts_count: prev.posts_count + 1 } : prev)
      setNewPost(''); setShowNewPost(false); toast('Posted to page')
    } catch { toast('Failed to post') }
    finally { setPosting(false) }
  }

  const formatTime = (d: string) => {
    const diff = Date.now() - new Date(d).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'Now'; if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  if (loading || userLoading) return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: 'var(--green)', borderTopColor: 'transparent' }} />
    </div>
  )

  if (!page) return null

  const catColor = CATEGORY_COLORS[page.category] || 'var(--green)'
  const canPost = isAdmin && adminRole && ['owner', 'admin', 'editor'].includes(adminRole)

  return (
    <div className="pb-8 animate-fade-in-up">
      <button onClick={() => router.push('/pages')}
        style={{ ...s.secondaryBtn, marginBottom: 16, padding: '6px 12px', fontSize: 10 }}>
        <ArrowLeft className="w-3.5 h-3.5" /> All Pages
      </button>

      <div style={{ ...s.card, overflow: 'hidden', padding: 0, marginBottom: 20 }}>
        <div style={{
          height: 180, background: `linear-gradient(135deg, ${catColor} 0%, color-mix(in oklab, ${catColor} 60%, var(--night)) 100%)`,
          position: 'relative', display: 'flex', alignItems: 'flex-end', padding: 24,
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 60%)' }} />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 16, width: '100%' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16, background: 'var(--surface)',
              display: 'grid', placeItems: 'center', fontSize: 28, fontWeight: 800,
              color: catColor, flexShrink: 0, border: '3px solid rgba(255,255,255,0.3)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}>
              {(page.name || '?')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div className="flex items-center gap-2">
                <h1 style={{ font: '800 28px var(--jakarta)', letterSpacing: '-.04em', color: '#fff', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                  {page.name}
                </h1>
                {page.is_verified && (
                  <span style={{ background: '#0ea5e9', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'grid', placeItems: 'center', fontSize: 12 }}>✓</span>
                )}
              </div>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 }}>
                {page.category} · Created {formatTime(page.created_at)}
              </p>
            </div>
            {isAdmin ? (
              <Link href={`/pages/${page.slug}`}
                style={{ ...s.secondaryBtn, padding: '8px 16px', fontSize: 11, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
                Manage
              </Link>
            ) : isFollowed ? (
              <button onClick={handleUnfollow}
                style={{ ...s.secondaryBtn, padding: '8px 16px', fontSize: 11 }}>
                Following
              </button>
            ) : (
              <button onClick={handleFollow} style={{ ...s.primaryBtn, padding: '8px 16px', fontSize: 11 }}>
                <Sparkles className="w-3.5 h-3.5" /> Follow
              </button>
            )}
          </div>
        </div>

        <div style={{ padding: 20 }}>
          <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>{page.description}</p>
          <div className="flex items-center gap-4 mt-4 pt-3" style={{ borderTop: '1px solid var(--line)', color: 'var(--muted)', fontSize: 12 }}>
            <span className="flex items-center gap-1.5"><Heart className="w-4 h-4" />{page.followers_count} followers</span>
            <span className="flex items-center gap-1.5"><MessageCircle className="w-4 h-4" />{page.posts_count} posts</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5" role="tablist" aria-label="Page sections">
        {(['posts', 'about'] as const).map(tab => {
          const isActive = activeTab === tab
          return (
            <button key={tab} ref={el => { tabRefs.current[tab] = el }}
              role="tab" aria-selected={isActive}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: 11, fontWeight: 700, fontSize: 12,
                border: isActive ? '2px solid var(--gold)' : '1px solid var(--line)',
                background: isActive ? 'var(--gold)' : 'var(--surface)',
                color: isActive ? 'var(--night)' : 'var(--muted)',
                cursor: 'pointer', transition: 'all .2s var(--ease)',
              }}>
              {tab === 'posts' ? 'Posts' : 'About'}
            </button>
          )
        })}
      </div>

      {activeTab === 'about' && (
        <div style={s.card} className="mb-5">
          <h3 className="font-bold text-sm mb-4" style={{ color: 'var(--ink)' }}>About {page.name}</h3>
          <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--muted)' }}>{page.description}</p>
          <div className="space-y-3">
            {page.address && (
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
                <MapPin className="w-4 h-4" style={{ color: 'var(--gold)' }} /> {page.address}
              </div>
            )}
            {page.phone && (
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
                <Phone className="w-4 h-4" style={{ color: 'var(--green)' }} /> {page.phone}
              </div>
            )}
            {page.email && (
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
                <Mail className="w-4 h-4" style={{ color: 'var(--blue)' }} /> {page.email}
              </div>
            )}
            {page.website && (
              <a href={page.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs" style={{ color: 'var(--gold)' }}>
                <ExternalLink className="w-4 h-4" /> {page.website}
              </a>
            )}
          </div>
        </div>
      )}

      {activeTab === 'posts' && (
        <>
          {canPost && (
            <div style={s.card} className="mb-5">
              {!showNewPost ? (
                <button onClick={() => setShowNewPost(true)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 11, fontSize: 12, color: 'var(--muted)', textAlign: 'left', background: 'var(--raised)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                  Post as {page.name}...
                </button>
              ) : (
                <div className="animate-rise">
                  <textarea value={newPost} onChange={e => setNewPost(e.target.value)}
                    placeholder={`Share with followers of ${page.name}...`} rows={3}
                    style={{ ...s.input, resize: 'none', minHeight: 80, marginBottom: 12 }} />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setShowNewPost(false); setNewPost('') }}
                      style={{ ...s.secondaryBtn, padding: '8px 16px', fontSize: 11 }}>
                      Cancel
                    </button>
                    <button onClick={handlePost} disabled={posting || !newPost.trim()}
                      style={{ ...s.btn, ...s.primaryBtn, padding: '8px 16px', fontSize: 11, opacity: (posting || !newPost.trim()) ? 0.5 : 1 }}>
                      {posting ? 'Posting...' : <><Send className="w-3.5 h-3.5" /> Post</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <section>
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--ink)' }}>
              <BookOpen className="w-4 h-4" style={{ color: 'var(--gold)' }} /> Posts
            </h3>
            {posts.length === 0 ? (
              <div style={s.card} className="text-center py-12">
                <Hash className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--muted)', opacity: 0.3 }} />
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>No posts yet</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{canPost ? 'Be the first to post!' : 'Follow this page for updates.'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map(post => (
                  <div key={post.id} style={s.card} className="feature-card">
                    <div className="flex items-start gap-3 mb-3">
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: catColor, display: 'grid', placeItems: 'center',
                        fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0,
                      }}>
                        {(page.name || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold" style={{ color: catColor }}>{page.name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'color-mix(in oklab, var(--gold) 15%, transparent)', color: 'var(--gold)' }}>Page</span>
                          <span className="text-[9px]" style={{ color: 'var(--muted)' }}>{formatTime(post.created_at)}</span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                          by {post.profiles?.full_name || post.profiles?.username || 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>{post.content}</p>
                    <div className="flex gap-3 mt-3 pt-3" style={{ borderTop: '1px solid var(--line)', color: 'var(--muted)', fontSize: 11 }}>
                      <Link href={`/posts/${post.id}`} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'inherit', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                        <MessageCircle className="w-3.5 h-3.5" /> Reply
                      </Link>
                      <button style={{ background: 'none', border: 0, cursor: 'pointer', color: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
