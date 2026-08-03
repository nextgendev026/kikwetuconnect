'use client'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useSupabase, useUser, toast } from '@/app/providers'
import FeedAd from '@/components/FeedAd'
import StoryStrip from '@/components/StoryStrip'
import { PostCard } from '@/components/PostCard'
import { COUNTIES, TABS, TYPE_FILTERS } from '@/lib/feed-config'
import type { TabId, TypeFilter } from '@/lib/feed-config'
import { getInitials } from '@/lib/utils'
import { buildFeedItems, patchPost, toPost } from '@/lib/feedHelpers'
import type { Post, VoteRow, SaveRow } from '@/lib/feedHelpers'

function SkeletonCard() {
  return (
    <div className="bg-night2 border border-[var(--line)] rounded-[16px] p-[18px] mb-[12px] animate-rise card-hover">
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

export default function FeedPage() {
  const supabase = useSupabase()
  const { user, profile, loading: userLoading } = useUser()

  const [posts, setPosts] = useState<Post[]>([])
  const postsRef = useRef<Post[]>([])
  useEffect(() => { postsRef.current = posts }, [posts])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('for_you')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [countyFilter, setCountyFilter] = useState<string | null>(null)
  const [showCountyPicker, setShowCountyPicker] = useState(false)
  const [newPostsCount, setNewPostsCount] = useState(0)

  const composerTypeMap: Record<string, string> = { baraza: 'post', inquiry: 'question', poll: 'poll', article: 'article' }
  const openCreateModal = (type?: string) => {
    document.dispatchEvent(new CustomEvent('open-create-modal', { detail: { type: type ? composerTypeMap[type] || 'post' : undefined } }))
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
              is_hidden: false,
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
              if (votes) votes.forEach((v: VoteRow) => { voteMap[v.target_id] = v.vote_type })
              const { data: saves } = await supabase
                .from('saves').select('target_id')
                .eq('user_id', profile.id).eq('target_type', 'post').in('target_id', postIds)
              if (saves) saves.forEach((s: SaveRow) => { saveMap[s.target_id] = true })
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
      query = query.neq('post_type', 'inquiry')


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

      query = query.is('space_id', null)

      if (profile?.id) query = query.or(`is_hidden.neq.true,user_id.eq.${profile.id}`)
      else query = query.neq('is_hidden', true)

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
          if (votes) votes.forEach((v: VoteRow) => { voteMap[v.target_id] = v.vote_type })
          const { data: saves } = await supabase.from('saves').select('target_id').eq('user_id', profile.id).eq('target_type', 'post').in('target_id', postIds)
          if (saves) saves.forEach((s: SaveRow) => { saveMap[s.target_id] = true })
        }
      }

      const enriched: Post[] = pagePosts.map(toPost).map(p => ({
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

  // Realtime: apply deltas instead of full refetch.
  useEffect(() => {
    if (!profile) return
    let debounceTimer: ReturnType<typeof setTimeout>
    const channel = supabase
      .channel('feed-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        // Only surface new posts on tabs where a brand-new post makes sense.
        if (activeTab === 'following' || activeTab === 'saved') return
        const own = payload.new && (payload.new as any).user_id === profile.id
        if (own) return
        // Skip if the new post wouldn't match the current type/county filters.
        const p = payload.new as any
        if (typeFilter !== 'all' && p.post_type !== typeFilter) return
        if (p.post_type === 'inquiry') return
        if (countyFilter && activeTab === 'near_you' && p.county_tag !== countyFilter) return
        clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => setNewPostsCount(c => c + 1), 250)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts', filter: `user_id=neq.${profile.id}` }, (payload) => {
        const p = payload.new as any
        if (!p || !p.id) return
        // Apply targeted update: patch votes/counts/answers without refetching.
        setPosts(prev => prev.map(x => x.id === p.id ? { ...x, ...p, profiles: x.profiles } : x))
      })
      .subscribe()

    return () => { clearTimeout(debounceTimer); supabase.removeChannel(channel) }
  }, [supabase, profile, activeTab, typeFilter, countyFilter])

  const handleVote = useCallback(async (postId: string, voteType: 1 | -1 | null) => {
    if (!profile) { toast('Sign in to vote'); return }
    const prevPost = postsRef.current.find(p => p.id === postId)
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
      if (prevPost) setPosts(prev => patchPost(prev, postId, { user_vote: prevPost.user_vote, upvotes_count: prevPost.upvotes_count }))
    }
  }, [profile])

  const handleSave = useCallback(async (postId: string) => {
    if (!profile) { toast('Sign in to save posts'); return }
    const prevPost = postsRef.current.find(p => p.id === postId)
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, user_saved: !p.user_saved } : p))
    try {
      const res = await fetch('/api/saves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_type: 'post', target_id: postId }),
      })
      if (!res.ok) throw new Error('Save failed')
    } catch {
      if (prevPost) setPosts(prev => patchPost(prev, postId, { user_saved: prevPost.user_saved }))
    }
  }, [profile])

  const handleReact = useCallback((_postId: string, _emoji: string) => {
    // Reactions stored locally; could sync to DB later
  }, [])

  const feedItems = useMemo(() => buildFeedItems(posts), [posts])

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-[28px] h-[28px] border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-[640px] mx-auto px-[12px] py-[16px] animate-fade-in-up">
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
          onClick={() => openCreateModal()}
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
            className={`flex-shrink-0 px-[14px] py-[7px] rounded-full text-[13px] font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-gold text-night'
                : 'text-[var(--faint-accessible)] hover:bg-deep hover:text-cream'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

       {/* Stories strip — Facebook-style 24h reels + community shorts */}
      <StoryStrip profile={profile} />


      {/* Composer */}
      <div
        onClick={() => openCreateModal()} role="button" tabIndex={0} aria-label="Create a new post"
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
            { label: 'Post', icon: '💬', mode: 'baraza' },
            { label: 'Poll', icon: '📊', mode: 'poll' },
            { label: 'Article', icon: '📄', mode: 'article' },
          ].map(action => (
            <button
              key={action.label}
              onClick={(e) => { e.stopPropagation(); openCreateModal(action.mode) }}
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
              className={`flex items-center gap-1 px-[10px] py-[5px] rounded-full text-[12px] font-semibold transition-all ml-auto ${
                countyFilter === profile.county_hub ? 'bg-green/20 text-green' : 'text-[var(--faint-accessible)] hover:bg-[var(--raised)] hover:text-cream'
              }`}
            >
              <span>📍</span>
              <span>{profile.county_hub}</span>
            </button>
          )}
        </div>
      </div>

      {/* New posts banner */}
      {newPostsCount > 0 && (
        <button
          onClick={() => { setNewPostsCount(0); fetchPosts() }}
          className="w-full mb-[12px] px-[14px] py-[9px] rounded-[12px] bg-gold text-night text-[12px] font-bold flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
        >
          <span aria-hidden="true">🆕</span>
          <span>{newPostsCount} new post{newPostsCount === 1 ? '' : 's'} — tap to refresh</span>
        </button>
      )}

      {/* Type filter chips */}
      <div className="flex gap-[4px] overflow-x-auto pb-[8px] scrollbar-none -mx-[12px] px-[12px]">
        {TYPE_FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setTypeFilter(f.id)}
            className={`flex-shrink-0 px-[12px] py-[5px] rounded-full text-[12px] font-semibold transition-all ${
              typeFilter === f.id
                ? 'bg-cream text-night'
                : 'text-[var(--faint-accessible)] border border-[var(--line)] hover:bg-deep hover:text-cream'
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="relative">
          <button
            onClick={() => setShowCountyPicker(!showCountyPicker)}
            aria-expanded={showCountyPicker}
            className={`flex-shrink-0 flex items-center gap-1 px-[12px] py-[5px] rounded-full text-[12px] font-semibold transition-all ${
              countyFilter ? 'bg-green/20 text-green border border-green/30' : 'text-[var(--faint-accessible)] border border-[var(--line)] hover:bg-deep hover:text-cream'
            }`}
          >
            <span>📍</span>
            <span>{countyFilter || 'County'}</span>
          </button>
          {showCountyPicker && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowCountyPicker(false)} />
              <div className="absolute top-full left-0 mt-1 w-[200px] max-h-[240px] overflow-y-auto bg-night2 border border-[var(--line)] rounded-[12px] p-[6px] shadow-xl z-20 animate-rise" role="menu" aria-label="Select county">
                <button onClick={() => { setCountyFilter(null); setShowCountyPicker(false) }} className="w-full text-left px-[10px] py-[6px] rounded-[8px] text-[12px] text-[var(--faint-accessible)] hover:bg-deep transition-colors" role="menuitem">All counties</button>
                {COUNTIES.map(c => (
                  <button
                    key={c}
                    onClick={() => { setCountyFilter(c); setShowCountyPicker(false) }}
                    className={`w-full text-left px-[10px] py-[6px] rounded-[8px] text-[12px] transition-colors ${countyFilter === c ? 'bg-gold/20 text-gold font-semibold' : 'text-cream hover:bg-deep'}`}
                    role="menuitem"
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

      {!loading && feedItems.map((item, idx) => (
        item.kind === 'ad'
          ? <FeedAd key={`ad-${idx}`} />
          : <PostCard
              key={item.post.id}
              post={item.post}
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
