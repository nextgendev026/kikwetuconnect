'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSupabase, useUser, toast } from '@/app/providers'

const COUNTIES = [
  'Nairobi', 'Mombasa', 'Kisumu', 'Eldoret', 'Kitale', 'Nakuru', 'Thika', 'Kericho',
  'Isiolo', 'Garissa', 'Lamu', 'Wajir', 'Mandera', 'Kilifi', 'Kwale', 'Taita-Taveta',
  'Makueni', 'Kajiado', 'Narok', 'Bomet', 'Nyamira', 'Kisii', 'Homa Bay', 'Siaya',
  'Bungoma', 'Busia', 'Kakamega', 'Vihiga', 'Nandi', 'Baringo', 'West Pokot', 'Samburu',
  'Laikipia', 'Embu', 'Meru', 'Tharaka-Nithi', 'Nyeri', 'Murang\'a', 'Kirinyaga', 'Machakos',
  'Kiambu', 'Turkana', 'Trans Nzoia', 'Uasin Gishu',
]

const TABS = [
  { id: 'for_you', label: 'For you' },
  { id: 'following', label: 'Following' },
  { id: 'near_you', label: 'Near you' },
  { id: 'questions', label: 'Questions' },
  { id: 'latest', label: 'Latest' },
  { id: 'saved', label: 'Saved' },
] as const

const TYPE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'baraza', label: 'Baraza' },
  { id: 'inquiry', label: 'Inquiry' },
  { id: 'article', label: 'Article' },
  { id: 'poll', label: 'Poll' },
] as const

const CREATE_TYPES = [
  { id: 'baraza', label: 'Post', icon: '💬' },
  { id: 'inquiry', label: 'Question', icon: '❓' },
  { id: 'poll', label: 'Poll', icon: '📊' },
  { id: 'alert', label: 'Mtaa listing', icon: '📍' },
  { id: 'alert', label: 'Safety update', icon: '🚨' },
]

const EMOJI_REACTIONS = ['🔥', '❤️', '😂', '😮', '😢', '🙏', '💡', '🗳️']

type TabId = typeof TABS[number]['id']
type TypeFilter = typeof TYPE_FILTERS[number]['id']

interface Profile {
  id: string
  full_name: string | null
  username: string
  avatar_url: string | null
  heshima_rating: number
  is_verified_expert: boolean
  county_hub: string | null
}

interface Post {
  id: string
  user_id: string
  post_type: string
  title: string | null
  content: string
  media_url: string | null
  media_type: string | null
  county_tag: string | null
  bounty_tokens: number
  upvotes_count: number
  answers_count: number
  is_pinned: boolean
  created_at: string
  profiles: Profile | null
  user_vote?: 1 | -1 | null
  user_saved?: boolean
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function SkeletonCard() {
  return (
    <div className="bg-night2 border border-[var(--line)] rounded-[16px] p-[18px] mb-[12px] animate-rise">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-[40px] h-[40px] rounded-full skeleton" />
        <div className="flex-1">
          <div className="h-[14px] w-[120px] skeleton mb-2" />
          <div className="h-[11px] w-[80px] skeleton" />
        </div>
        <div className="h-[11px] w-[50px] skeleton" />
      </div>
      <div className="h-[13px] w-full skeleton mb-2" />
      <div className="h-[13px] w-[85%] skeleton mb-2" />
      <div className="h-[13px] w-[60%] skeleton mb-4" />
      <div className="flex gap-3">
        <div className="h-[32px] w-[70px] skeleton rounded-full" />
        <div className="h-[32px] w-[70px] skeleton rounded-full" />
        <div className="h-[32px] w-[70px] skeleton rounded-full" />
      </div>
    </div>
  )
}

function EmptyState({ tab, hasCountyFilter }: { tab: TabId; hasCountyFilter: boolean }) {
  const messages: Record<TabId, { title: string; desc: string }> = {
    for_you: { title: 'Your feed is quiet', desc: 'Follow topics and people to personalize your feed' },
    following: { title: 'No posts from people you follow', desc: 'Follow more people to see their posts here' },
    near_you: { title: hasCountyFilter ? 'No posts in this county yet' : 'Select a county to see local posts', desc: 'Be the first to post from your area' },
    questions: { title: 'No questions yet', desc: 'Ask the community something' },
    latest: { title: 'No posts yet', desc: 'The first post is waiting for you' },
    saved: { title: 'No saved posts', desc: 'Bookmark posts to find them later' },
  }
  const m = messages[tab]
  return (
    <div className="bg-night2 border border-[var(--line)] rounded-[16px] p-[32px_18px] text-center animate-rise">
      <div className="text-[32px] mb-3 opacity-50">🌿</div>
      <p className="text-cream font-semibold text-[14px] mb-1">{m.title}</p>
      <p className="text-[var(--muted)] text-[12px] mb-4">{m.desc}</p>
      {tab !== 'saved' && (
        <button onClick={() => document.getElementById('composer-input')?.focus()} className="bg-gold text-night text-[12px] font-bold px-[18px] py-[10px] rounded-full transition-opacity hover:opacity-90">
          Create your first post
        </button>
      )}
    </div>
  )
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-night2 border border-red/30 rounded-[16px] p-[16px] mb-[12px] flex items-start gap-3 animate-rise">
      <span className="text-red text-[18px]">⚠️</span>
      <div className="flex-1 min-w-0">
        <p className="text-cream text-[13px] font-semibold mb-1">Something went wrong</p>
        <p className="text-[var(--muted)] text-[11px] mb-2">{message}</p>
        <button onClick={onRetry} className="text-[11px] font-bold text-gold hover:underline">Try again</button>
      </div>
    </div>
  )
}

function PostCardComponent({
  post,
  currentUserId,
  onVote,
  onSave,
  onReact,
}: {
  post: Post
  currentUserId: string | null
  onVote: (postId: string, voteType: 1 | -1 | null) => void
  onSave: (postId: string) => void
  onReact: (postId: string, emoji: string) => void
}) {
  const author = post.profiles
  const initials = getInitials(author?.full_name || author?.username)
  const [showReactions, setShowReactions] = useState(false)
  const [reactions, setReactions] = useState<Record<string, number>>({})

  useEffect(() => {
    const stored = localStorage.getItem(`reactions-${post.id}`)
    if (stored) try { setReactions(JSON.parse(stored)) } catch {}
  }, [post.id])

  const handleReact = (emoji: string) => {
    const updated = { ...reactions, [emoji]: (reactions[emoji] || 0) + 1 }
    setReactions(updated)
    localStorage.setItem(`reactions-${post.id}`, JSON.stringify(updated))
    onReact(post.id, emoji)
    setShowReactions(false)
  }

  return (
    <div className="bg-night2 border border-[var(--line)] rounded-[16px] p-[18px] mb-[12px] animate-rise">
      {/* Header */}
      <div className="flex items-start gap-3 mb-[12px]">
        <Link href={`/profile/${author?.username || ''}`} className="flex-shrink-0 relative">
          {author?.avatar_url ? (
            <img src={author.avatar_url} alt="" className="w-[40px] h-[40px] rounded-full object-cover" />
          ) : (
            <div className="w-[40px] h-[40px] rounded-full bg-gradient-to-br from-gold to-green flex items-center justify-center text-[12px] font-extrabold text-night">{initials}</div>
          )}
          {author?.is_verified_expert && (
            <span className="absolute -bottom-1 -right-1 w-[18px] h-[18px] bg-green rounded-full flex items-center justify-center border-2 border-night2">
              <svg viewBox="0 0 24 24" className="w-[10px] h-[10px] stroke-night fill-none" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
            </span>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-[6px] flex-wrap">
            <Link href={`/profile/${author?.username || ''}`} className="text-cream font-bold text-[13px] hover:underline">{author?.full_name || author?.username || 'Unknown'}</Link>
            {author?.is_verified_expert && <span className="text-[10px] font-bold text-green">Expert</span>}
          </div>
          <div className="flex items-center gap-[8px] mt-[2px]">
            <span className="text-[var(--muted)] text-[11px]">@{author?.username || 'unknown'}</span>
            {author && author.heshima_rating > 0 && (
              <span className="text-[10px] font-semibold text-gold">{author.heshima_rating} Heshima</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span style={{
            padding: '3px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
            background: post.post_type === 'inquiry' ? 'color-mix(in oklab, var(--blue) 20%, transparent)' : post.post_type === 'article' ? 'color-mix(in oklab, var(--gold) 20%, transparent)' : 'color-mix(in oklab, var(--green) 20%, transparent)',
            color: post.post_type === 'inquiry' ? 'var(--blue)' : post.post_type === 'article' ? 'var(--gold)' : 'var(--green)',
          }}>
            {post.post_type === 'baraza' ? 'Post' : post.post_type === 'inquiry' ? 'Question' : post.post_type === 'article' ? 'Article' : post.post_type === 'poll' ? 'Poll' : post.post_type}
          </span>
          <span className="text-[var(--muted)] text-[11px] whitespace-nowrap">{timeAgo(post.created_at)}</span>
        </div>
      </div>

      {/* Title for inquiries/articles */}
      {post.title && (
        <Link href={`/posts/${post.id}`} className="block text-cream font-bold text-[15px] mb-[6px] leading-[1.3] hover:text-gold transition-colors">{post.title}</Link>
      )}

      {/* Content */}
      <p className="text-cream text-[13px] leading-[1.6] mb-[12px] whitespace-pre-wrap break-words">{post.content}</p>

      {/* Media */}
      {post.media_url && (
        <div className="mb-[12px] rounded-[12px] overflow-hidden bg-deep border border-[var(--line)]">
          {post.media_type?.startsWith('video/') ? (
            <div className="h-[200px] flex items-center justify-center bg-deep">
              <span className="text-[40px] opacity-50">🎥</span>
            </div>
          ) : (
            <img src={post.media_url} alt="" className="w-full h-auto max-h-[300px] object-cover" loading="lazy" />
          )}
        </div>
      )}

      {/* County & Bounty */}
      <div className="flex flex-wrap items-center gap-[8px] mb-[12px]">
        {post.county_tag && (
          <span className="flex items-center gap-1 text-[var(--muted)] text-[11px]">
            📍 {post.county_tag}
          </span>
        )}
        {post.bounty_tokens > 0 && (
          <span className="flex items-center gap-1 px-[8px] py-[3px] rounded-full bg-gold/20 text-gold text-[10px] font-bold">
            🪙 {post.bounty_tokens}
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-[4px] pt-[12px] border-t border-[var(--line)]">
        <button
          onClick={() => onVote(post.id, post.user_vote === 1 ? null : 1)}
          className={`flex items-center gap-1 px-[12px] py-[6px] rounded-full text-[11px] font-semibold transition-all ${post.user_vote === 1 ? 'bg-green/20 text-green' : 'text-[var(--muted)] hover:bg-deep hover:text-cream'}`}
        >
          <span className={post.user_vote === 1 ? 'text-green' : ''}>▲</span>
          <span>{post.upvotes_count || 0}</span>
        </button>

        <Link
          href={`/posts/${post.id}`}
          className="flex items-center gap-1 px-[12px] py-[6px] rounded-full text-[11px] font-semibold transition-all"
          style={{ color: 'var(--muted)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--raised)'; e.currentTarget.style.color = 'var(--gold)' }}
          onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--muted)' }}
        >
          <span>{post.post_type === 'inquiry' ? '✏️' : '💬'}</span>
          <span>{post.answers_count || 0}</span>
          <span style={{ fontSize: 10, marginLeft: 2 }}>{post.post_type === 'inquiry' ? 'Answer' : 'Comment'}</span>
        </Link>

        <div className="relative">
          <button
            onClick={() => setShowReactions(!showReactions)}
            className="flex items-center gap-1 px-[12px] py-[6px] rounded-full text-[11px] font-semibold text-[var(--muted)] hover:bg-deep hover:text-cream transition-all"
          >
            <span>😊</span>
            {Object.keys(reactions).length > 0 && <span className="text-[10px]">{Object.values(reactions).reduce((a, b) => a + b, 0)}</span>}
          </button>
          {showReactions && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowReactions(false)} />
              <div className="absolute bottom-full left-0 mb-1 flex gap-[3px] p-[6px] bg-deep border border-[var(--line)] rounded-full shadow-xl z-20 animate-rise">
                {EMOJI_REACTIONS.map(emoji => (
                  <button key={emoji} onClick={() => handleReact(emoji)} className="w-[30px] h-[30px] flex items-center justify-center hover:scale-125 transition-transform text-[16px]">{emoji}</button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/posts/${post.id}`); toast('Link copied to clipboard') }}
          className="flex items-center gap-1 px-[12px] py-[6px] rounded-full text-[11px] font-semibold text-[var(--muted)] hover:bg-deep hover:text-cream transition-all"
        >
          <span>↗</span>
        </button>

        <button
          onClick={() => toast('Tafsiri — Kiswahili translation coming soon')}
          className="flex items-center gap-1 px-[12px] py-[6px] rounded-full text-[11px] font-semibold text-[var(--muted)] hover:bg-deep hover:text-cream transition-all"
        >
          <span>🌐</span>
        </button>

        <button
          onClick={() => onSave(post.id)}
          className={`flex items-center gap-1 px-[12px] py-[6px] rounded-full text-[11px] font-semibold transition-all ${post.user_saved ? 'bg-gold/20 text-gold' : 'text-[var(--muted)] hover:bg-deep hover:text-cream'}`}
        >
          <span>{post.user_saved ? '★' : '☆'}</span>
        </button>

        <button
          onClick={() => toast('Report submitted. Moderators will review.')}
          className="flex items-center gap-1 px-[12px] py-[6px] rounded-full text-[11px] font-semibold text-[var(--muted)] hover:bg-deep hover:text-cream transition-all ml-auto"
        >
          <span>⚑</span>
        </button>
      </div>

      {/* Emoji reaction chips */}
      {Object.keys(reactions).length > 0 && (
        <div className="flex flex-wrap gap-[4px] mt-[8px] pt-[8px] border-t border-[var(--line)]">
          {Object.entries(reactions).map(([emoji, count]) => (
            <button key={emoji} onClick={() => handleReact(emoji)} className="flex items-center gap-1 px-[8px] py-[3px] rounded-full text-[11px] transition-colors" style={{ background: 'var(--raised)', color: 'var(--muted)' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--gold)' }} onMouseLeave={e => { e.currentTarget.style.background = 'var(--raised)'; e.currentTarget.style.color = 'var(--muted)' }}>
              <span>{emoji}</span>
              <span className="font-semibold">{count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FeedPage() {
  const supabase = useSupabase()
  const { user, profile, loading: userLoading } = useUser()

  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('for_you')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [countyFilter, setCountyFilter] = useState<string | null>(null)
  const [showCountyPicker, setShowCountyPicker] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [composerText, setComposerText] = useState('')

  // Create modal state
  const [createType, setCreateType] = useState('baraza')
  const [createTitle, setCreateTitle] = useState('')
  const [createContent, setCreateContent] = useState('')
  const [createCounty, setCreateCounty] = useState('')
  const [createTopics, setCreateTopics] = useState<string[]>([])
  const [createBounty, setCreateBounty] = useState(0)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [availableTopics, setAvailableTopics] = useState<{ id: string; name: string }[]>([])
  const [createStep, setCreateStep] = useState<'type' | 'content'>('type')

  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // For you tab uses personalized algorithm
      if (activeTab === 'for_you' && profile) {
        const res = await fetch(`/api/feed/recommended?limit=50&offset=0`, { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to load personalized feed')
        const json = await res.json()
        const rawPosts = (json.posts || []).map((p: any) => ({
          ...p,
          profiles: {
            id: p.author_id,
            full_name: p.author_name,
            username: p.author_username,
            avatar_url: p.author_avatar,
            heshima_rating: p.author_heshima,
          },
          content: p.content,
          title: p.title,
        }))
        const postIds = rawPosts.map((p: any) => p.id)
        let voteMap: Record<string, 1 | -1 | null> = {}
        let saveMap: Record<string, boolean> = {}
        if (postIds.length > 0) {
          const { data: votes } = await supabase
            .from('votes').select('target_id, vote_type')
            .eq('user_id', profile.id).eq('target_type', 'post').in('target_id', postIds)
          if (votes) votes.forEach((v: any) => { voteMap[v.target_id] = v.vote_type })
          const { data: saves } = await supabase
            .from('saves').select('target_id')
            .eq('user_id', profile.id).eq('target_type', 'post').in('target_id', postIds)
          if (saves) saves.forEach((s: any) => { saveMap[s.target_id] = true })
        }
        setPosts(rawPosts.map((p: any) => ({ ...p, user_vote: voteMap[p.id] || null, user_saved: saveMap[p.id] || false })))
        setLoading(false)
        return
      }

      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            id, full_name, username, avatar_url, heshima_rating, is_verified_expert, county_hub
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (typeFilter !== 'all') {
        query = query.eq('post_type', typeFilter)
      }

      if (activeTab === 'questions') {
        query = query.eq('post_type', 'inquiry')
      }

      if (activeTab === 'following' && profile) {
        const { data: following } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', profile.id)
        const ids = following?.map((f: { following_id: string }) => f.following_id) || []
        if (ids.length > 0) {
          query = query.in('user_id', ids)
        } else {
          setPosts([])
          setLoading(false)
          return
        }
      }

      if (activeTab === 'near_you' && countyFilter) {
        query = query.eq('county_tag', countyFilter)
      } else if (activeTab === 'near_you' && profile?.county_hub) {
        query = query.eq('county_tag', profile.county_hub)
      }

      if (countyFilter && activeTab !== 'near_you') {
        query = query.eq('county_tag', countyFilter)
      }

      if (activeTab === 'saved' && profile) {
        const { data: savedPosts } = await supabase
          .from('saves')
          .select('target_id')
          .eq('user_id', profile.id)
          .eq('target_type', 'post')
        const ids = savedPosts?.map((s: { target_id: string }) => s.target_id) || []
        if (ids.length > 0) {
          query = query.in('id', ids)
        } else {
          setPosts([])
          setLoading(false)
          return
        }
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw new Error(fetchError.message)

      const rawPosts = (data || []) as any[]

      // Get user votes for these posts
      let voteMap: Record<string, 1 | -1 | null> = {}
      let saveMap: Record<string, boolean> = {}

      if (profile) {
        const postIds = rawPosts.map(p => p.id)
        if (postIds.length > 0) {
          const { data: votes } = await supabase
            .from('votes')
            .select('target_id, vote_type')
            .eq('user_id', profile.id)
            .eq('target_type', 'post')
            .in('target_id', postIds)
          if (votes) {
            votes.forEach((v: { target_id: string; vote_type: number }) => { voteMap[v.target_id] = v.vote_type as 1 | -1 })
          }

          const { data: saves } = await supabase
            .from('saves')
            .select('target_id')
            .eq('user_id', profile.id)
            .eq('target_type', 'post')
            .in('target_id', postIds)
          if (saves) {
            saves.forEach((s: { target_id: string }) => { saveMap[s.target_id] = true })
          }
        }
      }

      const enriched: Post[] = rawPosts.map(p => ({
        ...p,
        user_vote: voteMap[p.id] || null,
        user_saved: saveMap[p.id] || false,
      }))

      setPosts(enriched)
    } catch (err: any) {
      setError(err.message || 'Failed to load posts')
    } finally {
      setLoading(false)
    }
  }, [supabase, profile, activeTab, typeFilter, countyFilter])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  useEffect(() => {
    if (!profile) return
    const channel = supabase
      .channel('feed-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        fetchPosts()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, () => {
        fetchPosts()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, profile, fetchPosts])

  useEffect(() => {
    supabase.from('topics').select('id, name').then(({ data }: { data: { id: string; name: string }[] | null }) => {
      if (data) setAvailableTopics(data)
    })
  }, [supabase])

  const handleVote = useCallback(async (postId: string, voteType: 1 | -1 | null) => {
    if (!profile) { toast('Sign in to vote'); return }
    const previousPosts = [...posts]
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      const diff = voteType === 1 ? 1 : p.user_vote === 1 ? -1 : 0
      return { ...p, user_vote: voteType, upvotes_count: Math.max(0, p.upvotes_count + diff) }
    }))
    try {
      const { data: existing } = await supabase
        .from('votes')
        .select('id')
        .eq('user_id', profile.id)
        .eq('target_id', postId)
        .eq('target_type', 'post')
        .single()
      if (existing) {
        if (voteType === null) {
          await supabase.from('votes').delete().eq('id', existing.id)
          await supabase.from('posts').update({ upvotes_count: Math.max(0, (posts.find(p => p.id === postId)?.upvotes_count || 1) - 1) }).eq('id', postId)
        } else {
          await supabase.from('votes').update({ vote_type: voteType }).eq('id', existing.id)
        }
      } else if (voteType !== null) {
        await supabase.from('votes').insert({ user_id: profile.id, target_id: postId, target_type: 'post', vote_type: voteType })
        await supabase.from('posts').update({ upvotes_count: (posts.find(p => p.id === postId)?.upvotes_count || 0) + 1 }).eq('id', postId)
      }
    } catch {
      setPosts(previousPosts)
    }
  }, [supabase, profile, posts])

  const handleSave = useCallback(async (postId: string) => {
    if (!profile) { toast('Sign in to save posts'); return }
    const previousPosts = [...posts]
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, user_saved: !p.user_saved } : p))
    const post = posts.find(p => p.id === postId)
    const wasSaved = post?.user_saved
    try {
      if (wasSaved) {
        await supabase.from('saves').delete().eq('user_id', profile.id).eq('target_id', postId).eq('target_type', 'post')
      } else {
        await supabase.from('saves').insert({ user_id: profile.id, target_id: postId, target_type: 'post' })
      }
    } catch {
      setPosts(previousPosts)
    }
  }, [supabase, profile, posts])

  const handleReact = useCallback((_postId: string, _emoji: string) => {
    // Reactions stored locally; could sync to DB later
  }, [])

  const handleCreatePost = async () => {
    setCreateError('')
    if (!createContent.trim()) { setCreateError('Write something'); return }
    if (createContent.trim().length < 5) { setCreateError('At least 5 characters'); return }
    if (createType === 'inquiry' && !createTitle.trim()) { setCreateError('Add a title'); return }
    setCreating(true)
    try {
      const topicIds = availableTopics.filter(t => createTopics.includes(t.name)).map(t => t.id)
      const res = await fetch('/api/posts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postType: createType,
          title: createTitle || null,
          content: createContent,
          countyTag: createCounty || null,
          bountyTokens: createType === 'inquiry' ? createBounty : 0,
          topics: topicIds,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to post') }
      toast('Posted to Baraza!')
      setShowCreateModal(false)
      setCreateContent('')
      setCreateTitle('')
      setCreateCounty('')
      setCreateTopics([])
      setCreateBounty(0)
      setCreateStep('type')
      setComposerText('')
      fetchPosts()
    } catch (err: any) {
      setCreateError(err.message)
    } finally {
      setCreating(false)
    }
  }

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-[28px] h-[28px] border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-[640px] mx-auto px-[12px] py-[16px]">
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-red/20 border border-red/30 rounded-[12px] p-[10px_14px] mb-[12px] flex items-center gap-2 text-[12px] text-red font-semibold">
          <span>📡</span>
          <span>You are offline. Showing cached content.</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between mb-[18px]">
        <div>
          <h1 className="text-cream text-[20px] font-extrabold tracking-[-.03em]" style={{ fontFamily: "'Plus Jakarta Sans'" }}>Baraza</h1>
          <p className="text-[var(--muted)] text-[11px] mt-[2px]">The people's square</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gold text-night text-[12px] font-bold px-[18px] py-[10px] rounded-full flex items-center gap-[6px] transition-opacity hover:opacity-90"
        >
          <span className="text-[16px] leading-none">+</span>
          <span>Create</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-[4px] overflow-x-auto pb-[12px] mb-[4px] scrollbar-none -mx-[12px] px-[12px]">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); if (tab.id !== 'near_you') setCountyFilter(null) }}
            className={`flex-shrink-0 px-[14px] py-[7px] rounded-full text-[12px] font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-gold text-night'
                : 'text-[var(--muted)] hover:bg-deep hover:text-cream'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Composer */}
      <div
        onClick={() => setShowCreateModal(true)}
        className="bg-night2 border border-[var(--line)] rounded-[16px] p-[14px] mb-[12px] cursor-pointer hover:bg-deep transition-colors"
      >
        <div className="flex items-center gap-3">
          {profile ? (
            profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-[36px] h-[36px] rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-[36px] h-[36px] rounded-full bg-gradient-to-br from-gold to-green flex items-center justify-center text-[11px] font-extrabold text-night flex-shrink-0">
                {getInitials(profile.full_name || profile.username)}
              </div>
            )
          ) : (
            <div className="w-[36px] h-[36px] rounded-full bg-deep flex items-center justify-center text-[var(--muted)]">?</div>
          )}
          <div id="composer-input" className="flex-1 text-[13px] text-[var(--muted)]">What's on your mind, {profile?.full_name?.split(' ')[0] || 'Mwananchi'}?</div>
        </div>
        <div className="flex gap-[6px] mt-[12px] pt-[12px] border-t border-[var(--line)]">
          {[
            { label: 'Ask', icon: '❓', type: 'inquiry' },
            { label: 'Poll', icon: '📊', type: 'poll' },
            { label: 'Sell', icon: '🛒', type: 'baraza' },
          ].map(action => (
            <button
              key={action.label}
              onClick={(e) => { e.stopPropagation(); setShowCreateModal(true); setCreateType(action.type) }}
              className="flex items-center gap-1 px-[10px] py-[5px] rounded-full text-[11px] font-semibold text-[var(--muted)] hover:bg-[var(--raised)] hover:text-cream transition-all"
            >
              <span>{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
          {profile?.county_hub && (
            <button
              onClick={(e) => { e.stopPropagation(); setCountyFilter(countyFilter === profile.county_hub ? null : profile.county_hub) }}
              className={`flex items-center gap-1 px-[10px] py-[5px] rounded-full text-[11px] font-semibold transition-all ml-auto ${
                countyFilter === profile.county_hub ? 'bg-green/20 text-green' : 'text-[var(--muted)] hover:bg-[var(--raised)] hover:text-cream'
              }`}
            >
              <span>📍</span>
              <span>{profile.county_hub}</span>
            </button>
          )}
        </div>
      </div>

      {/* Type filter chips */}
      <div className="flex gap-[4px] overflow-x-auto pb-[12px] scrollbar-none -mx-[12px] px-[12px]">
        {TYPE_FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setTypeFilter(f.id)}
            className={`flex-shrink-0 px-[12px] py-[5px] rounded-full text-[11px] font-semibold transition-all ${
              typeFilter === f.id
                ? 'bg-cream text-night'
                : 'text-[var(--muted)] border border-[var(--line)] hover:bg-deep hover:text-cream'
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="relative">
          <button
            onClick={() => setShowCountyPicker(!showCountyPicker)}
            className={`flex-shrink-0 flex items-center gap-1 px-[12px] py-[5px] rounded-full text-[11px] font-semibold transition-all ${
              countyFilter ? 'bg-green/20 text-green border border-green/30' : 'text-[var(--muted)] border border-[var(--line)] hover:bg-deep hover:text-cream'
            }`}
          >
            <span>📍</span>
            <span>{countyFilter || 'County'}</span>
          </button>
          {showCountyPicker && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowCountyPicker(false)} />
              <div className="absolute top-full left-0 mt-1 w-[200px] max-h-[240px] overflow-y-auto bg-night2 border border-[var(--line)] rounded-[12px] p-[6px] shadow-xl z-20 animate-rise">
                <button onClick={() => { setCountyFilter(null); setShowCountyPicker(false) }} className="w-full text-left px-[10px] py-[6px] rounded-[8px] text-[12px] text-[var(--muted)] hover:bg-deep transition-colors">All counties</button>
                {COUNTIES.map(c => (
                  <button
                    key={c}
                    onClick={() => { setCountyFilter(c); setShowCountyPicker(false) }}
                    className={`w-full text-left px-[10px] py-[6px] rounded-[8px] text-[12px] transition-colors ${countyFilter === c ? 'bg-gold/20 text-gold font-semibold' : 'text-cream hover:bg-deep'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content area */}
      {error && <ErrorBanner message={error} onRetry={fetchPosts} />}

      {loading && (
        <div>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!loading && posts.length === 0 && !error && (
        <EmptyState tab={activeTab} hasCountyFilter={!!countyFilter} />
      )}

      {!loading && posts.map(post => (
        <PostCardComponent
          key={post.id}
          post={post}
          currentUserId={user?.id || null}
          onVote={handleVote}
          onSave={handleSave}
          onReact={handleReact}
        />
      ))}

      {/* Create Modal */}
      {showCreateModal && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50 md:flex md:items-center md:justify-center" onClick={() => setShowCreateModal(false)}>
            <div
              className="fixed bottom-0 left-0 right-0 md:relative md:max-w-[520px] md:w-full bg-night2 border-t md:border border-[var(--line)] rounded-t-[20px] md:rounded-[16px] max-h-[85vh] overflow-y-auto animate-sheet z-50"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-[16px] border-b border-[var(--line)] sticky top-0 bg-night2 z-10">
                <button onClick={() => { if (createStep === 'content') { setCreateStep('type'); setCreateError('') } else setShowCreateModal(false) }} className="text-[var(--muted)] text-[13px] font-semibold hover:text-cream transition-colors">
                  {createStep === 'content' ? '← Back' : 'Cancel'}
                </button>
                <h2 className="text-cream font-bold text-[15px]">Create in Baraza</h2>
                {createStep === 'content' ? (
                  <button
                    onClick={handleCreatePost}
                    disabled={creating || !createContent.trim()}
                    className="bg-gold text-night text-[12px] font-bold px-[16px] py-[7px] rounded-full transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    {creating ? 'Posting...' : 'Publish'}
                  </button>
                ) : (
                  <div className="w-[60px]" />
                )}
              </div>

              {createError && (
                <div className="mx-[16px] mt-[12px] p-[10px] rounded-[10px] bg-red/10 border border-red/30 text-red text-[12px] font-medium">
                  {createError}
                </div>
              )}

              {/* Step 1: Type selection */}
              {createStep === 'type' && (
                <div className="p-[16px]">
                  <p className="text-[var(--muted)] text-[12px] mb-[14px]">What kind of post do you want to create?</p>
                  <div className="grid grid-cols-2 gap-[8px]">
                    {[
                      { id: 'baraza', label: 'Post', icon: '💬', desc: 'Share a thought or update' },
                      { id: 'inquiry', label: 'Question', icon: '❓', desc: 'Ask the community' },
                      { id: 'poll', label: 'Poll', icon: '📊', desc: 'Gather opinions' },
                      { id: 'alert', label: 'Mtaa listing', icon: '📍', desc: 'Share local info' },
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => { setCreateType(t.id); setCreateStep('content') }}
                        className="flex flex-col items-start gap-[6px] p-[14px] rounded-[12px] border border-[var(--line)] hover:bg-deep hover:border-gold/30 transition-all text-left"
                      >
                        <span className="text-[22px]">{t.icon}</span>
                        <span className="text-cream font-bold text-[13px]">{t.label}</span>
                        <span className="text-[var(--muted)] text-[10px]">{t.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Content creation */}
              {createStep === 'content' && (
                <div className="p-[16px]">
                  {/* Title (for inquiries/articles) */}
                  {(createType === 'inquiry') && (
                    <input
                      value={createTitle}
                      onChange={e => setCreateTitle(e.target.value)}
                      placeholder="What's your question?"
                      className="w-full bg-transparent text-cream text-[15px] font-bold outline-none placeholder:text-[var(--muted)] mb-[12px]"
                    />
                  )}

                  {/* Content */}
                  <textarea
                    value={createContent}
                    onChange={e => setCreateContent(e.target.value)}
                    placeholder={
                      createType === 'inquiry'
                        ? 'Provide more details about your question...'
                        : createType === 'poll'
                        ? 'Ask a question for the poll...'
                        : createType === 'alert'
                        ? 'Share a local update...'
                        : 'What would you like to share?'
                    }
                    rows={5}
                    className="w-full bg-transparent text-cream text-[13px] outline-none resize-none placeholder:text-[var(--muted)] leading-[1.6] mb-[16px]"
                  />

                  {/* Topics */}
                  {availableTopics.length > 0 && (
                    <div className="mb-[14px]">
                      <label className="text-[var(--muted)] text-[11px] font-semibold mb-[6px] block">Topics</label>
                      <div className="flex flex-wrap gap-[4px]">
                        {availableTopics.map(t => (
                          <button
                            key={t.id}
                            onClick={() => setCreateTopics(prev => prev.includes(t.name) ? prev.filter(x => x !== t.name) : [...prev, t.name])}
                            className={`px-[10px] py-[4px] rounded-full text-[11px] font-medium transition-all ${
                              createTopics.includes(t.name) ? 'bg-gold text-night' : 'bg-deep text-[var(--muted)] hover:text-cream'
                            }`}
                          >
                            {t.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* County */}
                  <div className="mb-[14px]">
                    <label className="text-[var(--muted)] text-[11px] font-semibold mb-[6px] block">Location (optional)</label>
                    <select
                      value={createCounty}
                      onChange={e => setCreateCounty(e.target.value)}
                      className="w-full bg-deep text-cream text-[12px] px-[10px] py-[8px] rounded-[10px] border border-[var(--line)] outline-none focus:border-gold/50 transition-colors appearance-none"
                    >
                      <option value="">Select a county</option>
                      {COUNTIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Bounty for inquiries */}
                  {createType === 'inquiry' && (
                    <div className="mb-[14px]">
                      <label className="text-[var(--muted)] text-[11px] font-semibold mb-[6px] block">Bounty (optional)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="500"
                          value={createBounty || ''}
                          onChange={e => setCreateBounty(Number(e.target.value) || 0)}
                          placeholder="0"
                          className="w-[80px] bg-deep text-cream text-[13px] px-[10px] py-[7px] rounded-[10px] border border-[var(--line)] outline-none focus:border-gold/50 transition-colors"
                        />
                        <span className="text-[var(--muted)] text-[11px]">tokens for the best answer</span>
                      </div>
                    </div>
                  )}

                  {/* Post type indicator */}
                  <div className="flex items-center gap-2 pt-[12px] border-t border-[var(--line)]">
                    <span className="text-[10px] font-semibold text-[var(--muted)]">
                      Posting as{' '}
                      <span className="text-cream">{profile?.full_name || profile?.username}</span>
                    </span>
                    <span className="text-[10px] px-[6px] py-[2px] rounded-full bg-deep text-[var(--muted)]">
                      {createType === 'baraza' ? 'Baraza' : createType === 'inquiry' ? 'Question' : createType === 'poll' ? 'Poll' : 'Alert'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Load more indicator */}
      {!loading && posts.length > 0 && (
        <div className="text-center py-[20px]">
          <p className="text-[var(--muted)] text-[11px]">You've reached the end... for now</p>
        </div>
      )}
    </div>
  )
}
