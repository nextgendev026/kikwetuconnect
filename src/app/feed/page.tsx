'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSupabase, useUser, toast } from '@/app/providers'
import { ArrowUp, MessageCircle, Smile, Share2, Globe, Star, Flag } from 'lucide-react'

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

function truncateContent(content: string, maxLen = 200): string {
  if (content.length <= maxLen) return content
  const firstPara = content.split(/\n\s*\n/)[0]
  if (firstPara.length <= maxLen) return firstPara
  return firstPara.slice(0, maxLen).replace(/\s+\S*$/, '') + '...'
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
            <img src={author.avatar_url} alt="" className="w-[40px] h-[40px] rounded-full object-cover" loading="lazy" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.querySelector('.avatar-fallback')?.classList.remove('hidden') }} />
          ) : null}
          <div className={`avatar-fallback w-[40px] h-[40px] rounded-full bg-gradient-to-br from-gold to-green flex items-center justify-center text-[12px] font-extrabold text-night ${author?.avatar_url ? 'hidden' : ''}`}>{initials}</div>
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

      {/* Content — truncated to first paragraph in feed */}
      <div className="mb-[12px]">
        <p className="text-cream text-[13px] leading-[1.6] whitespace-pre-wrap break-words">
          {truncateContent(post.content)}
        </p>
        {post.content.length > 200 && (
          <Link href={`/posts/${post.id}`} className="inline-block mt-[6px] text-gold text-[12px] font-bold hover:underline">
            Read full post ↗
          </Link>
        )}
      </div>

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
      <div className="post-footer pt-[12px] border-t border-[var(--line)]">
        <div className="action-group">
          <button
            onClick={() => onVote(post.id, post.user_vote === 1 ? null : 1)}
            className={`action-button ${post.user_vote === 1 ? 'active-vote' : ''}`}
            aria-label={post.user_vote === 1 ? 'Remove upvote' : 'Upvote'}
          >
            <ArrowUp className={`w-4 h-4 ${post.user_vote === 1 ? 'text-green' : ''}`} />
            <span>{post.upvotes_count || 0}</span>
          </button>

          <Link
            href={`/posts/${post.id}`}
            className="action-button feed-action-link"
            aria-label={post.post_type === 'inquiry' ? 'Answers' : 'Comments'}
          >
            <MessageCircle className="w-4 h-4" />
            <span>{post.answers_count || 0}</span>
            <span style={{ fontSize: 10, marginLeft: 2 }}>{post.post_type === 'inquiry' ? 'Answer' : 'Comment'}</span>
          </Link>

          <div className="relative">
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="action-button"
              aria-label="React to post"
            >
              <Smile className="w-4 h-4" />
              {Object.keys(reactions).length > 0 && <span className="text-[10px]">{Object.values(reactions).reduce((a, b) => a + b, 0)}</span>}
            </button>
            {showReactions && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowReactions(false)} />
                <div className="absolute bottom-full left-0 mb-1 flex gap-[3px] p-[6px] bg-deep border border-[var(--line)] rounded-full shadow-xl z-20 animate-rise">
                  {EMOJI_REACTIONS.map(emoji => (
                    <button key={emoji} onClick={() => handleReact(emoji)} className="w-[30px] h-[30px] flex items-center justify-center hover:scale-125 transition-transform text-[16px]" aria-label={`React with ${emoji}`}>{emoji}</button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="action-group">
          <button
            onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/posts/${post.id}`); toast('Link copied to clipboard') }}
            className="action-button"
            aria-label="Share post"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => toast('Tafsiri — Kiswahili translation coming soon')}
            className="action-button"
            aria-label="Translate"
          >
            <Globe className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSave(post.id)}
            className={`action-button ${post.user_saved ? 'active-save' : ''}`}
            aria-label={post.user_saved ? 'Unsave post' : 'Save post'}
          >
            <Star className={`w-4 h-4 ${post.user_saved ? 'fill-current text-gold' : ''}`} />
          </button>

          <button
            onClick={() => toast('Report submitted. Moderators will review.')}
            className="action-button"
            aria-label="Report post"
          >
            <Flag className="w-4 h-4" />
          </button>
        </div>
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
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('for_you')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [countyFilter, setCountyFilter] = useState<string | null>(null)
  const [showCountyPicker, setShowCountyPicker] = useState(false)
  const [composerText, setComposerText] = useState('')

  const openCreateModal = () => {
    document.dispatchEvent(new CustomEvent('open-create-modal'))
  }

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

  const fetchPosts = useCallback(async (cursor?: string | null) => {
    const isReset = !cursor
    if (isReset) { setLoading(true); setError(null) } else { setLoadingMore(true) }
    try {
      const limit = 25

      // For you tab uses personalized algorithm
      if (activeTab === 'for_you' && profile && isReset) {
        try {
          const res = await fetch(`/api/feed/recommended?limit=${limit}&offset=0`, { cache: 'no-store' })
          if (res.ok) {
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
            setHasMore(rawPosts.length >= limit)
            setLoading(false)
            return
          }
        } catch { /* fall through */ }
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
        .limit(limit + 1)

      if (cursor) query = query.lt('created_at', cursor)

      if (typeFilter !== 'all') query = query.eq('post_type', typeFilter)
      if (activeTab === 'questions') query = query.eq('post_type', 'inquiry')

      if (activeTab === 'following' && profile) {
        const { data: following } = await supabase.from('follows').select('following_id').eq('follower_id', profile.id)
        const ids = following?.map((f: { following_id: string }) => f.following_id) || []
        if (ids.length > 0) { query = query.in('user_id', ids) }
        else { setPosts([]); setLoading(false); return }
      }

      if (activeTab === 'near_you' && countyFilter) query = query.eq('county_tag', countyFilter)
      else if (activeTab === 'near_you' && profile?.county_hub) query = query.eq('county_tag', profile.county_hub)
      if (countyFilter && activeTab !== 'near_you') query = query.eq('county_tag', countyFilter)

      if (activeTab === 'saved' && profile) {
        const { data: savedPosts } = await supabase.from('saves').select('target_id').eq('user_id', profile.id).eq('target_type', 'post')
        const ids = savedPosts?.map((s: { target_id: string }) => s.target_id) || []
        if (ids.length > 0) { query = query.in('id', ids) }
        else { setPosts([]); setLoading(false); return }
      }

      const { data, error: fetchError } = await query
      if (fetchError) throw new Error(fetchError.message)

      const rawPosts = (data || []) as any[]
      const pagePosts = rawPosts.slice(0, limit)
      setHasMore(rawPosts.length > limit)

      let voteMap: Record<string, 1 | -1 | null> = {}
      let saveMap: Record<string, boolean> = {}
      if (profile) {
        const postIds = pagePosts.map(p => p.id)
        if (postIds.length > 0) {
          const { data: votes } = await supabase.from('votes').select('target_id, vote_type').eq('user_id', profile.id).eq('target_type', 'post').in('target_id', postIds)
          if (votes) votes.forEach((v: any) => { voteMap[v.target_id] = v.vote_type as 1 | -1 })
          const { data: saves } = await supabase.from('saves').select('target_id').eq('user_id', profile.id).eq('target_type', 'post').in('target_id', postIds)
          if (saves) saves.forEach((s: any) => { saveMap[s.target_id] = true })
        }
      }

      const enriched: Post[] = pagePosts.map(p => ({
        ...p, user_vote: voteMap[p.id] || null, user_saved: saveMap[p.id] || false,
      }))

      if (isReset) setPosts(enriched)
      else setPosts(prev => [...prev, ...enriched])
    } catch (err: any) {
      setError(err.message || 'Failed to load posts')
    } finally {
      setLoading(false); setLoadingMore(false)
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

  const handleVote = useCallback(async (postId: string, voteType: 1 | -1 | null) => {
    if (!profile) { toast('Sign in to vote'); return }
    const previousPosts = [...posts]
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      const diff = voteType === 1 ? 1 : p.user_vote === 1 ? -1 : 0
      return { ...p, user_vote: voteType, upvotes_count: Math.max(0, p.upvotes_count + diff) }
    }))
    try {
      if (voteType === null) {
        await fetch(`/api/votes?target_type=post&target_id=${postId}`, { method: 'DELETE' })
      } else {
        const res = await fetch('/api/votes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target_type: 'post', target_id: postId, vote_type: voteType }),
        })
        if (!res.ok) throw new Error('Vote failed')
      }
    } catch {
      setPosts(previousPosts)
    }
  }, [profile, posts])

  const handleSave = useCallback(async (postId: string) => {
    if (!profile) { toast('Sign in to save posts'); return }
    const previousPosts = [...posts]
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, user_saved: !p.user_saved } : p))
    try {
      const res = await fetch('/api/saves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_type: 'post', target_id: postId }),
      })
      if (!res.ok) throw new Error('Save failed')
    } catch {
      setPosts(previousPosts)
    }
  }, [profile, posts])

  const handleReact = useCallback((_postId: string, _emoji: string) => {
    // Reactions stored locally; could sync to DB later
  }, [])

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
          onClick={openCreateModal}
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
        onClick={openCreateModal} role="button" tabIndex={0} aria-label="Create a new post"
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCreateModal() } }}
        className="bg-night2 border border-[var(--line)] rounded-[16px] p-[14px] mb-[12px] cursor-pointer hover:bg-deep transition-colors min-h-[44px]"
      >
        <div className="flex items-center gap-3">
          {profile ? (
            <>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-[36px] h-[36px] rounded-full object-cover flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.querySelector('.composer-avatar-fallback')?.classList.remove('hidden') }} />
              ) : null}
              <div className={`composer-avatar-fallback w-[36px] h-[36px] rounded-full bg-gradient-to-br from-gold to-green flex items-center justify-center text-[11px] font-extrabold text-night flex-shrink-0 ${profile.avatar_url ? 'hidden' : ''}`}>
                {getInitials(profile.full_name || profile.username)}
              </div>
            </>
          ) : (
            <div className="w-[36px] h-[36px] rounded-full bg-deep flex items-center justify-center text-[var(--muted)]">?</div>
          )}
          <div id="composer-input" className="flex-1 text-[13px] text-[var(--muted)]">What's on your mind, {profile?.full_name?.split(' ')[0] || 'Mwananchi'}?</div>
        </div>
        <div className="flex gap-[6px] mt-[12px] pt-[12px] border-t border-[var(--line)] flex-wrap">
          <span className="text-[10px] text-[var(--muted)] self-center mr-1">Create:</span>
          {[
            { label: 'Post', icon: '💬', type: 'baraza' },
            { label: 'Ask', icon: '❓', type: 'inquiry' },
            { label: 'Poll', icon: '📊', type: 'poll' },
          ].map(action => (
            <button
              key={action.label}
              onClick={(e) => { e.stopPropagation(); openCreateModal() }}
              className="flex items-center gap-1 px-[10px] py-[5px] rounded-full text-[11px] font-semibold text-[var(--muted)] hover:bg-[var(--raised)] hover:text-cream transition-all"
            >
              <span>{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
          <span className="w-px h-5 bg-[var(--line)] self-center mx-1"></span>
          <button
            onClick={(e) => { e.stopPropagation(); openCreateModal() }}
            className="flex items-center gap-1 px-[10px] py-[5px] rounded-full text-[11px] font-semibold text-[var(--muted)] hover:bg-[var(--raised)] hover:text-cream transition-all"
            title="Add image"
          >🖼️ <span className="hidden sm:inline">Image</span></button>
          <button
            onClick={(e) => { e.stopPropagation(); openCreateModal() }}
            className="flex items-center gap-1 px-[10px] py-[5px] rounded-full text-[11px] font-semibold text-[var(--muted)] hover:bg-[var(--raised)] hover:text-cream transition-all"
            title="Add video"
          >🎥 <span className="hidden sm:inline">Video</span></button>
          <button
            onClick={(e) => { e.stopPropagation(); openCreateModal() }}
            className="flex items-center gap-1 px-[10px] py-[5px] rounded-full text-[11px] font-semibold text-[var(--muted)] hover:bg-[var(--raised)] hover:text-cream transition-all"
            title="Add audio"
          >🎙️ <span className="hidden sm:inline">Audio</span></button>
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



      {/* Load more */}
      {!loading && posts.length > 0 && hasMore && (
        <div className="text-center py-[16px]">
          <button onClick={() => fetchPosts(posts[posts.length - 1]?.created_at)}
            className="px-[24px] py-[10px] rounded-full text-[12px] font-bold transition-all"
            style={{ background: 'var(--raised)', color: 'var(--ink)', border: '1px solid var(--line)' }}
            disabled={loadingMore}>
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
      {!loading && !hasMore && posts.length > 0 && (
        <div className="text-center py-[20px]">
          <p className="text-[var(--muted)] text-[11px]">You've reached the end... for now</p>
        </div>
      )}
    </div>
  )
}
