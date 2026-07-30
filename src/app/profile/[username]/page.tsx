'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSupabase, useUser, toast } from '@/app/providers'
import { useToolbar } from '@/lib/toolbar'
import ProfileHeader from '@/components/profile/ProfileHeader'
import { MessageCircle, Heart, Award, Calendar, MapPin, Globe, ThumbsUp, MessageSquare, ChevronDown } from 'lucide-react'

type Tab = 'posts' | 'about' | 'heshima'

const PAGE_SIZE = 10

export default function UserProfilePage() {
  const params = useParams()
  const username = params.username as string
  const supabase = useSupabase()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('posts')
  const [postCount, setPostCount] = useState(0)
  const [posts, setPosts] = useState<any[]>([])
  const [postsCursor, setPostsCursor] = useState<string | null>(null)
  const [hasMorePosts, setHasMorePosts] = useState(true)
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [heshimaEarnings, setHeshimaEarnings] = useState<any[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const { user } = useUser()
  const router = useRouter()
  const { setConfig } = useToolbar()

  useEffect(() => {
    if (!username) return
    supabase.from('profiles')
      .select('*')
      .eq('username', username)
      .maybeSingle()
      .then(({ data, error }: { data: any; error: any }) => {
        if (error) { toast(error.message); return }
        if (!data) { setNotFound(true); return }
        setProfile(data)
      })
      .finally(() => setLoading(false))
  }, [username, supabase])

  useEffect(() => {
    if (!profile || !user) return
    supabase.from('follows').select('id').eq('follower_id', user.id).eq('following_id', profile.id).maybeSingle()
      .then(({ data }: { data: any }) => setIsFollowing(!!data))
  }, [profile, user, supabase])

  useEffect(() => {
    if (!profile || !user) return
    if (profile.id === user.id) { setConfig(null); return }
    setConfig({
      actions: [
        { icon: Heart, label: isFollowing ? 'Following' : 'Follow', onClick: handleFollow, variant: isFollowing ? 'default' : 'gold', active: isFollowing },
        { icon: MessageCircle, label: 'Message', onClick: handleMessage },
      ],
    })
    return () => setConfig(null)
  }, [profile, user, isFollowing, setConfig])

  const handleFollow = async () => {
    if (!profile) return
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'follow', target_user_id: profile.id }),
    })
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      toast(errBody?.error || 'Follow failed')
      return
    }
    const { following } = await res.json()
    setIsFollowing(following)
    setProfile((prev: any) => ({ ...prev, follower_count: Math.max(0, (prev?.follower_count || 0) + (following ? 1 : -1)) }))
  }

  const handleMessage = async () => {
    if (!profile) return
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'dm', member_ids: [profile.id] }),
    })
    if (!res.ok) { toast('Failed to open chat'); return }
    const { conversation_id } = await res.json()
    router.push(`/messages?conversation_id=${conversation_id}`)
  }

  useEffect(() => {
    if (!profile) return
    supabase.from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .then(({ count }: { count: number | null }) => { if (count !== null) setPostCount(count) })
    supabase.from('heshima_earnings')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }: { data: any }) => { if (data) setHeshimaEarnings(data) })
    fetchPosts(true)
  }, [profile, supabase])

  const fetchPosts = useCallback(async (reset = false) => {
    if (!profile) return
    setLoadingPosts(true)
    try {
      const cursor = reset ? null : postsCursor
      let query = supabase.from('posts').select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE + 1)
      if (cursor) query = query.lt('created_at', cursor)

      const { data, error } = await query
      if (error) throw error

      const page = (data || []).slice(0, PAGE_SIZE)
      setHasMorePosts((data?.length || 0) > PAGE_SIZE)
      if (page.length > 0) setPostsCursor(page[page.length - 1].created_at)
      setPosts(prev => reset ? page : [...prev, ...page])
    } catch { toast('Failed to load posts') }
    finally { setLoadingPosts(false) }
  }, [profile, postsCursor, supabase])

  const formatTime = (d: string) => {
    const diff = Date.now() - new Date(d).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'Just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'posts', label: 'Posts' },
    { key: 'about', label: 'About' },
    { key: 'heshima', label: 'Heshima' },
  ]

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ width: 30, height: 30, border: '3px solid var(--line)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
  </div>

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <h2 style={{ fontWeight: 800, fontSize: 28, color: 'var(--ink)' }}>Profile not found</h2>
      <p style={{ color: 'var(--muted)' }}>@{username} doesn't exist on KikwetuConnect</p>
    </div>
  )

  return (
    <section className="page active" style={{ paddingTop: 33, paddingBottom: 94 }}>
      <ProfileHeader profile={profile} isOwn={false} postCount={postCount}
        isFollowing={isFollowing} onFollow={handleFollow} onMessage={handleMessage} />

      {/* Sticky Tab Bar */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--line)',
        position: 'sticky', top: 68, zIndex: 10,
        background: 'var(--surface)', marginBottom: 16, borderRadius: '12px 12px 0 0',
        overflow: 'hidden',
      }} role="tablist">
        {tabs.map(tab => (
          <button key={tab.key} role="tab" aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1, padding: '12px 0', fontSize: 13, fontWeight: 700,
              border: 'none', borderBottom: activeTab === tab.key ? '2px solid var(--gold)' : '2px solid transparent',
              color: activeTab === tab.key ? 'var(--ink)' : 'var(--muted)',
              background: 'transparent', cursor: 'pointer',
              transition: 'all .2s var(--ease)',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Posts Tab */}
      {activeTab === 'posts' && (
        <div>
          {posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
              <MessageSquare className="w-10 h-10 mx-auto mb-3" style={{ opacity: 0.3 }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>No posts yet</p>
              <p style={{ fontSize: 12, marginBottom: 16 }}>
                {profile.full_name || profile.username} hasn't posted anything yet.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {posts.map(post => (
                <Link key={post.id} href={`/posts/${post.id}`}
                  style={{
                    display: 'block', textDecoration: 'none',
                    background: 'var(--surface)', border: '1px solid var(--line)',
                    borderRadius: 12, padding: 16,
                    transition: 'all .2s var(--ease)',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>
                      {post.post_type === 'baraza' ? '💬' : post.post_type === 'inquiry' ? '❓' : '📄'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                        {post.title || post.content.slice(0, 80)}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, fontSize: 11, color: 'var(--muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <ThumbsUp className="w-3 h-3" /> {post.upvotes_count || 0}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <MessageSquare className="w-3 h-3" /> {post.answers_count || 0}
                        </span>
                        <span>{formatTime(post.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              {hasMorePosts && (
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <button onClick={() => fetchPosts(false)} disabled={loadingPosts}
                    style={{
                      padding: '8px 20px', borderRadius: 11, fontWeight: 700, fontSize: 12,
                      background: 'var(--raised)', color: 'var(--ink)',
                      border: '1px solid var(--line)', cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}>
                    {loadingPosts ? 'Loading...' : <><ChevronDown className="w-3.5 h-3.5" /> Load more</>}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* About Tab */}
      {activeTab === 'about' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 12, padding: 20,
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', margin: '0 0 12px' }}>Bio</h3>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
              {profile.bio || 'No bio yet.'}
            </p>
          </div>

          <div style={{
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 12, padding: 20,
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', margin: '0 0 12px' }}>Details</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {profile.county_hub && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)' }}>
                  <MapPin className="w-4 h-4" style={{ color: 'var(--gold)' }} /> {profile.county_hub}
                </div>
              )}
              {profile.website && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)' }}>
                  <Globe className="w-4 h-4" style={{ color: 'var(--gold)' }} />
                  <a href={profile.website} target="_blank" rel="noopener noreferrer"
                    style={{ color: 'var(--gold)', textDecoration: 'none' }}>
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)' }}>
                <Calendar className="w-4 h-4" style={{ color: 'var(--gold)' }} />
                Joined {new Date(profile.created_at).toLocaleDateString('en-KE', { year: 'numeric', month: 'long' })}
              </div>
            </div>
          </div>

          {profile.is_verified_expert && (
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--line)',
              borderRadius: 12, padding: 20,
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', margin: '0 0 12px' }}>Expert</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--green)' }}>
                <Award className="w-4 h-4" /> Verified Expert
              </div>
            </div>
          )}
        </div>
      )}

      {/* Heshima Tab */}
      {activeTab === 'heshima' && (
        <div>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 12, padding: 20, marginBottom: 12,
          }}>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Award className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--gold)' }} />
              <p style={{ fontSize: 32, fontWeight: 800, color: 'var(--gold)', margin: 0 }}>
                {profile.heshima_rating || 0}
              </p>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Heshima Rating</p>
            </div>
          </div>

          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', margin: '0 0 8px 4px' }}>Recent Activity</h3>
          {heshimaEarnings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)', fontSize: 12 }}>
              No Heshima activity yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 6 }}>
              {heshimaEarnings.map((e: any) => (
                <div key={e.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 10,
                  background: 'var(--surface)', border: '1px solid var(--line)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                      background: e.amount > 0
                        ? 'color-mix(in oklab, var(--green) 15%, transparent)'
                        : 'color-mix(in oklab, var(--red) 15%, transparent)',
                      color: e.amount > 0 ? 'var(--green)' : 'var(--red)',
                      textTransform: 'capitalize', whiteSpace: 'nowrap',
                    }}>
                      {e.source_type?.replace(/_/g, ' ') || 'earned'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.description || ''}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 13, fontWeight: 700, flexShrink: 0, marginLeft: 8,
                    color: e.amount > 0 ? 'var(--green)' : 'var(--red)',
                  }}>
                    {e.amount > 0 ? '+' : ''}{e.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
