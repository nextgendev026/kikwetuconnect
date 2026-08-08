'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSupabase, useUser, toast } from '@/app/providers'
import { useToolbar } from '@/lib/toolbar'
import { ArrowLeft, Users, Hash, Sparkles, Plus, Send, Clock, MessageCircle, Heart, Share2, Flag, MoreHorizontal, Globe, BookOpen, LogIn, LogOut } from 'lucide-react'
import PostActions from '@/components/PostActions'
import { spaceCategoryMeta, resolveSpaceIcon } from '@/lib/space-meta'

interface Space {
  id: string; name: string; slug: string; description: string; icon: string; category: string
  member_count: number; post_count: number; cover_url: string | null; created_by: string; created_at: string
}

interface Post {
  id: string; content: string; title: string; created_at: string; user_id: string
  profiles: { id: string; full_name: string | null; username: string; avatar_url: string | null } | null
}

interface Member {
  user_id: string; role: string
  profiles: { id: string; full_name: string | null; username: string; avatar_url: string | null } | null
}

const CATEGORY_COLORS: Record<string, string> = {
  Agriculture: '#2d6a4f', Technology: '#302b63', Business: '#b8860b',
  Education: '#6c5ce7', Finance: '#00b894', Health: '#e17055',
  Culture: '#fd79a8', Legal: '#2c3e50', Biashara: '#b8860b',
  Politics: '#c94b4b', Community: '#0f3460', General: '#2d6a4f',
}

const s = {
  card: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20, boxShadow: 'var(--card-shadow)' },
  input: { width: '100%', background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: 11, padding: '10px 14px', fontSize: 13, color: 'var(--ink)', outline: 'none' },
  btn: { padding: '8px 16px', borderRadius: 11, fontWeight: 700, fontSize: 12, border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all .2s var(--ease)' },
  primaryBtn: { background: 'var(--gold)', color: 'var(--night)' },
  secondaryBtn: { background: 'var(--raised)', color: 'var(--ink)', border: '1px solid var(--line)' },
}

export default function SpaceDetailPage() {
  const { slug } = useParams()
  const router = useRouter()
  const supabase = useSupabase()
  const { profile, loading: userLoading } = useUser()
  const [space, setSpace] = useState<Space | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [isMember, setIsMember] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [newPost, setNewPost] = useState('')
  const [posting, setPosting] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [showNewPost, setShowNewPost] = useState(false)

  useEffect(() => {
    if (!slug || userLoading) return
    fetchSpace()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, userLoading])

  // Realtime: subscribe to space, posts, and member changes
  useEffect(() => {
    if (!space || !supabase) return
    const channel = supabase.channel(`space-${space.id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'spaces', filter: `id=eq.${space.id}` },
        (payload: any) => {
          setSpace(prev => prev ? { ...prev, ...payload.new } : prev)
        })
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts', filter: `space_id=eq.${space.id}` },
        (payload: any) => {
          const newPost = payload.new as Post
          supabase.from('profiles').select('id, full_name, username, avatar_url').eq('id', newPost.user_id).single()
            .then(({ data }) => {
              setPosts(prev => {
                if (prev.some(p => p.id === newPost.id)) return prev
                return [{ ...newPost, profiles: data }, ...prev]
              })
            })
          setSpace(prev => prev ? { ...prev, post_count: (prev.post_count || 0) + 1 } : prev)
        })
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'space_members', filter: `space_id=eq.${space.id}` },
        (payload: any) => {
          const newMember = payload.new as any
          setMembers(prev => {
            if (prev.some(m => m.user_id === newMember.user_id)) return prev
            supabase.from('profiles').select('id, full_name, username, avatar_url').eq('id', newMember.user_id).single()
              .then(({ data }) => {
                if (data) setMembers(p => p.some(m => m.user_id === newMember.user_id) ? p : [...p, { user_id: newMember.user_id, role: newMember.role, profiles: data }])
              })
            return prev
          })
          setSpace(prev => prev ? { ...prev, member_count: (prev.member_count || 0) + 1 } : prev)
        })
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'space_members', filter: `space_id=eq.${space.id}` },
        (payload: any) => {
          const deletedUserId = payload.old.user_id
          setMembers(prev => prev.filter(m => m.user_id !== deletedUserId))
          setSpace(prev => prev ? { ...prev, member_count: Math.max(0, (prev.member_count || 0) - 1) } : prev)
          if (deletedUserId === profile?.id) setIsMember(false)
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [space?.id, supabase])

  const fetchSpace = async () => {
    setLoading(true)
    try {
      const { data: sData } = await supabase.from('spaces').select('*').eq('slug', String(slug)).maybeSingle()
      if (!sData) { toast('Space not found'); router.push('/spaces'); return }
      setSpace(sData as Space)

      const { data: pData } = await supabase
        .from('posts').select('*, profiles:user_id(id, full_name, username, avatar_url)')
        .eq('space_id', sData.id).order('created_at', { ascending: false }).limit(50)
      if (pData) setPosts(pData as unknown as Post[])

      const { data: mData } = await supabase
        .from('space_members').select('user_id, role, profiles:user_id(id, full_name, username, avatar_url)')
        .eq('space_id', sData.id).limit(50)
      if (mData) setMembers(mData as unknown as Member[])

      if (profile) {
        const { data: membership } = await supabase.from('space_members')
          .select('role').eq('space_id', sData.id).eq('user_id', profile.id).maybeSingle()
        if (membership) { setIsMember(true); if (membership.role === 'admin') setIsAdmin(true) }
      }
    } catch { toast('Error loading space') }
    finally { setLoading(false) }
  }

  const handleJoin = async () => {
    if (!profile) return toast('Sign in to join')
    if (!space) return
    try {
      await supabase.from('space_members').insert({ space_id: space.id, user_id: profile.id, role: 'member' })
      await supabase.from('spaces').update({ member_count: (space.member_count || 0) + 1 }).eq('id', space.id)
      setIsMember(true)
      setSpace(prev => prev ? { ...prev, member_count: (prev.member_count || 0) + 1 } : prev)
      setMembers(prev => [...prev, { user_id: profile.id, role: 'member', profiles: { id: profile.id, full_name: profile.full_name || '', username: profile.username || '', avatar_url: profile.avatar_url } }])
      toast(`Joined ${space.name}`)
    } catch { toast('Failed to join') }
  }

  const handleLeave = async () => {
    if (!profile || !space) return
    try {
      await supabase.from('space_members').delete().eq('space_id', space.id).eq('user_id', profile.id)
      await supabase.from('spaces').update({ member_count: Math.max(0, (space.member_count || 0) - 1) }).eq('id', space.id)
      setIsMember(false)
      setSpace(prev => prev ? { ...prev, member_count: Math.max(0, (prev.member_count || 0) - 1) } : prev)
      setMembers(prev => prev.filter(m => m.user_id !== profile.id))
      toast(`Left ${space.name}`)
    } catch { toast('Failed to leave') }
  }

  const handlePost = async () => {
    if (!newPost.trim()) return toast('Write something')
    if (!profile || !space) return
    setPosting(true)
    try {
      const { error } = await supabase.from('posts').insert({
        user_id: profile.id, post_type: 'baraza', content: newPost.trim(),
        title: newPost.split('\n')[0].slice(0, 100), space_id: space.id,
      })
      if (error) throw error
      await supabase.from('spaces').update({ post_count: (space.post_count || 0) + 1 }).eq('id', space.id)
      setNewPost(''); setShowNewPost(false); toast('Posted to space')
      fetchSpace()
    } catch { toast('Failed to post') }
    finally { setPosting(false) }
  }

  const { setConfig } = useToolbar()

  useEffect(() => {
    if (!space) return
    setConfig({
      backUrl: '/spaces',
      actions: [
        ...(isMember
          ? [{ icon: Plus as any, label: 'Post', onClick: () => { setShowNewPost(true); setTimeout(() => document.getElementById('space-post-input')?.focus(), 100) }, variant: 'gold' as const }]
          : [{ icon: LogIn as any, label: 'Join', onClick: handleJoin, variant: 'primary' as const }]),
      ],
    })
    return () => setConfig(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [space, isMember, setConfig])

  const formatTime = (d: string) => {
    const diff = Date.now() - new Date(d).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'Now'; if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  if (loading || userLoading) return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: 'var(--green)', borderTopColor: 'transparent' }} />
    </div>
  )

  if (!space) return null

  const catMeta = spaceCategoryMeta(space.category)
  const catColor = CATEGORY_COLORS[space.category] || catMeta.color

  return (
    <div className="pb-8 animate-fade-in-up">
      {/* Back button */}
      <button onClick={() => router.push('/spaces')}
        style={{ ...s.secondaryBtn, marginBottom: 16, padding: '6px 12px', fontSize: 10 }}>
        <ArrowLeft className="w-3.5 h-3.5" /> All Spaces
      </button>

      {/* Space Header */}
      <div style={{ ...s.card, overflow: 'hidden', padding: 0, marginBottom: 20 }}>
        <div style={{ height: 160, background: `linear-gradient(135deg, ${catColor} 0%, color-mix(in oklab, ${catColor} 60%, var(--night)) 100%)`, position: 'relative', display: 'flex', alignItems: 'flex-end', padding: 24 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 60%)' }} />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 16, width: '100%' }}>
            <span className="text-4xl" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }}>{resolveSpaceIcon(space.icon, space.category)}</span>
            <div style={{ flex: 1 }}>
              <h1 style={{ font: '800 24px var(--jakarta)', letterSpacing: '-.04em', color: '#fff', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>{space.name}</h1>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 }}>{space.category} · Created {formatTime(space.created_at)}</p>
            </div>
            {isMember ? (
              <button onClick={handleLeave} style={{ ...s.secondaryBtn, padding: '8px 16px', fontSize: 11, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
                Leave
              </button>
            ) : (
              <button onClick={handleJoin} style={{ ...s.primaryBtn, padding: '8px 16px', fontSize: 11 }}>
                <Sparkles className="w-3.5 h-3.5" /> Join
              </button>
            )}
          </div>
        </div>
        <div style={{ padding: 20 }}>
          <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>{space.description}</p>
          <div className="flex items-center gap-4 mt-4 pt-3" style={{ borderTop: '1px solid var(--line)', color: 'var(--muted)', fontSize: 12 }}>
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{space.member_count} members</span>
            <span className="flex items-center gap-1.5"><MessageCircle className="w-4 h-4" />{space.post_count} posts</span>
            <button onClick={() => setShowMembers(!showMembers)}
              style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--gold)', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
              {showMembers ? 'Hide members' : 'View members'}
            </button>
          </div>

          {/* Members list */}
          {showMembers && (
            <div className="mt-4 pt-3 animate-rise" style={{ borderTop: '1px solid var(--line)' }}>
              <p className="text-xs font-semibold mb-3" style={{ color: 'var(--muted)' }}>Members ({members.length})</p>
              {members.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--muted)' }}>No members yet</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {members.map(m => (
                    <div key={m.user_id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--raised)' }}>
                      <div className="w-7 h-7 rounded-full grid place-items-center text-[9px] font-bold flex-shrink-0 relative overflow-hidden" style={{ background: 'var(--earth)', color: 'var(--gold)', border: '1px solid var(--line)' }}>
                        {m.profiles?.avatar_url ? (
                          <img src={m.profiles.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; const fb = e.currentTarget.parentElement!.querySelector('.sp-fb'); if (fb) (fb as HTMLElement).style.display = 'grid' }} />
                        ) : null}
                        <span className="sp-fb" style={{ position: 'absolute', inset: 0, display: m.profiles?.avatar_url ? 'none' : 'grid', placeItems: 'center' }}>
                          {(m.profiles?.full_name || m.profiles?.username || '?')[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium truncate" style={{ color: 'var(--ink)' }}>{m.profiles?.full_name || m.profiles?.username || 'User'}</p>
                        <p className="text-[8px]" style={{ color: 'var(--muted)' }}>{m.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New Post */}
      {isMember && (
        <div style={s.card} className="mb-5">
          {!showNewPost ? (
            <button onClick={() => setShowNewPost(true)}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 11, fontSize: 12, color: 'var(--muted)', textAlign: 'left', background: 'var(--raised)', border: '1px solid var(--line)', cursor: 'pointer' }}>
              Share something in {space.name}...
            </button>
          ) : (
            <div className="animate-rise">
              <textarea id="space-post-input" value={newPost} onChange={e => setNewPost(e.target.value)}
                placeholder={`Share with ${space.name}...`} rows={3}
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

      {/* Posts Feed */}
      <section>
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--ink)' }}>
          <BookOpen className="w-4 h-4" style={{ color: 'var(--gold)' }} /> Posts in this space
        </h3>
        {posts.length === 0 ? (
          <div style={s.card} className="text-center py-12">
            <Hash className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--muted)', opacity: 0.3 }} />
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>No posts yet</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>{isMember ? 'Be the first to post!' : 'Join the space to contribute.'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map(post => (
              <div key={post.id} style={s.card} className="feature-card">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full grid place-items-center text-[10px] font-bold flex-shrink-0" style={{ background: 'var(--earth)', color: 'var(--gold)' }}>
                    {(post.profiles?.full_name || post.profiles?.username || '?')[0].toUpperCase()}
                  </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>{post.profiles?.full_name || post.profiles?.username || 'User'}</span>
                        <span className="text-[9px]" style={{ color: 'var(--muted)' }}>{formatTime(post.created_at)}</span>
                        <div style={{ marginLeft: 'auto' }}>
                          {profile && (
                            <PostActions postId={post.id} currentUserId={profile.id} authorId={post.user_id} />
                          )}
                        </div>
                      </div>
                      <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--ink)' }}>{post.content}</p>
                    </div>
                </div>
                <div className="flex gap-3 pt-3" style={{ borderTop: '1px solid var(--line)', color: 'var(--muted)', fontSize: 11 }}>
                  <button style={{ background: 'none', border: 0, cursor: 'pointer', color: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Heart className="w-3.5 h-3.5" /> Like
                  </button>
                  <button style={{ background: 'none', border: 0, cursor: 'pointer', color: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MessageCircle className="w-3.5 h-3.5" /> Reply
                  </button>
                  <button style={{ background: 'none', border: 0, cursor: 'pointer', color: 'inherit', display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
