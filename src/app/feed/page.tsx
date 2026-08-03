'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Virtuoso } from 'react-virtuoso'
import { useSupabase, useUser, toast } from '@/app/providers'
import { useQueryClient } from '@tanstack/react-query'
import FeedAd from '@/components/FeedAd'
import StoryStrip from '@/components/StoryStrip'
import { PostCard } from '@/components/PostCard'
import { COUNTIES, TABS, TYPE_FILTERS } from '@/lib/feed-config'
import type { TabId, TypeFilter } from '@/lib/feed-config'
import { getInitials } from '@/lib/utils'
import { buildFeedItems, feedKey } from '@/lib/feedHelpers'
import { useFeed } from '@/hooks/useFeed'
import { useVoteAction, useSaveAction } from '@/hooks/usePostActions'

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
  const queryClient = useQueryClient()
  const { user, profile, loading: userLoading } = useUser()

  const [activeTab, setActiveTab] = useState<TabId>('for_you')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [countyFilter, setCountyFilter] = useState<string | null>(null)
  const [showCountyPicker, setShowCountyPicker] = useState(false)

  const params = { activeTab, typeFilter, countyFilter }
  const feedQuery = useFeed(params)
  const voteAction = useVoteAction(params)
  const saveAction = useSaveAction(params)

  const posts = useMemo(() => feedQuery.data?.pages.flatMap(p => p.posts) ?? [], [feedQuery.data])
  const feedItems = useMemo(() => buildFeedItems(posts), [posts])
  const loading = feedQuery.isLoading
  const loadingMore = feedQuery.isFetchingNextPage
  const error = feedQuery.error ? (feedQuery.error as Error).message : null
  const hasMore = feedQuery.hasNextPage ?? false

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

  // Realtime: apply deltas to the React Query cache instead of full refetch.
  useEffect(() => {
    if (!profile) return
    const channel = supabase
      .channel('feed-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        const p = payload.new as any
        if (!p?.id) return
        if (p.user_id === profile.id) return
        if (p.post_type === 'inquiry') return
        if (typeFilter !== 'all' && p.post_type !== typeFilter) return
        if (activeTab === 'near_you' && countyFilter && p.county_tag !== countyFilter) return
        queryClient.setQueriesData({ queryKey: ['feed'], type: 'active' }, (old: any) => {
          if (!old?.pages) return old
          const first = old.pages[0]?.posts ?? []
          if (first.some((x: any) => x.id === p.id)) return old
          const fresh = { ...p, profiles: p.profiles || null, user_vote: null, user_saved: false }
          const pages = [{ ...old.pages[0], posts: [fresh, ...first] }, ...old.pages.slice(1)]
          return { ...old, pages }
        })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, (payload) => {
        const p = payload.new as any
        if (!p?.id) return
        if (p.user_id === profile.id) return
        queryClient.setQueriesData({ queryKey: ['feed'], type: 'active' }, (old: any) => {
          if (!old?.pages) return old
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              posts: (page.posts ?? []).map((x: any) => x.id === p.id ? { ...x, ...p } : x),
            })),
          }
        })
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload) => {
        const id = (payload.old as any)?.id
        if (!id) return
        queryClient.setQueriesData({ queryKey: ['feed'], type: 'active' }, (old: any) => {
          if (!old?.pages) return old
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              posts: (page.posts ?? []).filter((x: any) => x.id !== id),
            })),
          }
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, profile, activeTab, typeFilter, countyFilter, queryClient])

  const handleVote = (postId: string, voteType: 1 | -1 | null) => {
    if (!profile) { toast('Sign in to vote'); return }
    voteAction.mutate({ postId, voteType })
  }

  const handleSave = (postId: string) => {
    if (!profile) { toast('Sign in to save posts'); return }
    saveAction.mutate({ postId })
  }

  const handleReact = (_postId: string, _emoji: string) => {
    // Reactions stored locally; could sync to DB later
  }

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
                <Image src={profile.avatar_url} alt="" width={36} height={36} className="w-[36px] h-[36px] rounded-full object-cover flex-shrink-0" unoptimized={profile.avatar_url.startsWith('data:')} onError={e => { (e.target as HTMLElement).style.display = 'none'; (e.target as HTMLElement).parentElement!.querySelector('.composer-avatar-fallback')?.classList.remove('hidden') }} />
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
      {error && <ErrorBanner message={error} onRetry={() => void feedQuery.refetch()} />}

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

      {!loading && feedItems.length > 0 && !error && (
        <Virtuoso
          useWindowScroll
          data={feedItems}
          endReached={() => { if (hasMore && !loadingMore) void feedQuery.fetchNextPage() }}
          overscan={600}
          components={{
            Footer: () => (
              <>
                {hasMore && (
                  <div className="text-center py-[16px]">
                    <button onClick={() => void feedQuery.fetchNextPage()}
                      className="px-[24px] py-[10px] rounded-full text-[12px] font-bold transition-all"
                      style={{ background: 'var(--raised)', color: 'var(--ink)', border: '1px solid var(--line)' }}
                      disabled={loadingMore}>
                      {loadingMore ? 'Loading...' : 'Load more'}
                    </button>
                  </div>
                )}
                {!hasMore && (
                  <div className="text-center py-[20px]">
                    <p className="text-[var(--muted)] text-[11px]">You've reached the end... for now</p>
                  </div>
                )}
              </>
            ),
          }}
          itemContent={(_index, item) =>
            item.kind === 'ad'
              ? <FeedAd />
              : <PostCard
                  post={item.post}
                  currentUserId={user?.id || null}
                  onVote={handleVote}
                  onSave={handleSave}
                  onReact={handleReact}
                />
          }
        />
      )}
    </div>
  )
}
