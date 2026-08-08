'use client'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useSupabase, useUser } from '@/app/providers'
import { feedKey, toPost } from '@/lib/feedHelpers'
import type { FeedParams, PollOption, Post, Profile, VoteRow, SaveRow } from '@/lib/feedHelpers'

const PAGE_SIZE = 25

export interface FeedPageData {
  posts: Post[]
  nextCursor: string | null
}

async function fetchFeedPage(
  supabase: any,
  profile: Profile | null,
  params: FeedParams,
  cursor?: string | null,
): Promise<FeedPageData> {
  const { activeTab, typeFilter, countyFilter } = params

  // For you tab uses personalized algorithm
  if (activeTab === 'for_you' && profile && !cursor) {
    try {
      const res = await fetch(`/api/feed/recommended?limit=${PAGE_SIZE}&offset=0`, { cache: 'no-store' })
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
        const posts = rawPosts.map((p: any) => ({ ...p, user_vote: voteMap[p.id] || null, user_saved: saveMap[p.id] || false }))
        return { posts, nextCursor: posts.length >= PAGE_SIZE ? posts[posts.length - 1]?.created_at : null }
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
    .limit(PAGE_SIZE + 1)

  if (cursor) query = query.lt('created_at', cursor)

  if (typeFilter !== 'all') query = query.eq('post_type', typeFilter)
  query = query.neq('post_type', 'inquiry')

  if (activeTab === 'following' && profile) {
    const { data: following } = await supabase.from('follows').select('following_id').eq('follower_id', profile.id)
    const ids = following?.map((f: { following_id: string }) => f.following_id) || []
    if (ids.length === 0) return { posts: [], nextCursor: null }
    query = query.in('user_id', ids)
  }

  if (activeTab === 'near_you' && countyFilter) query = query.eq('county_tag', countyFilter)
  else if (activeTab === 'near_you' && profile?.county_hub) query = query.eq('county_tag', profile.county_hub)
  if (countyFilter && activeTab !== 'near_you') query = query.eq('county_tag', countyFilter)

  if (activeTab === 'saved' && profile) {
    const { data: savedPosts } = await supabase.from('saves').select('target_id').eq('user_id', profile.id).eq('target_type', 'post')
    const ids = savedPosts?.map((s: { target_id: string }) => s.target_id) || []
    if (ids.length === 0) return { posts: [], nextCursor: null }
    query = query.in('id', ids)
  }

  query = query.is('space_id', null)

  if (profile?.id) query = query.or(`is_hidden.neq.true,user_id.eq.${profile.id}`)
  else query = query.neq('is_hidden', true)

  const { data, error: fetchError } = await query
  if (fetchError) throw new Error(fetchError.message)

  const rawPosts = (data || []) as any[]
  const pagePosts = rawPosts.slice(0, PAGE_SIZE)

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

  // Batch poll options + the user's poll votes for this page so PostCard
  // doesn't run a per-card query fan-out on poll posts.
  const pollPosts = pagePosts.filter((p: any) => p.post_type === 'poll')
  const pollIds = pollPosts.map((p: any) => p.id)
  let pollOptionMap: Record<string, PollOption[]> = {}
  let pollVoteMap: Record<string, Set<string>> = {}
  if (pollIds.length > 0) {
    const { data: opts } = await supabase
      .from('poll_options')
      .select('id, post_id, option_text, votes, created_at')
      .in('post_id', pollIds)
      .order('created_at')
    if (opts) {
      opts.forEach((o: PollOption) => {
        if (!pollOptionMap[o.post_id]) pollOptionMap[o.post_id] = []
        pollOptionMap[o.post_id].push(o)
      })
    }
    if (profile) {
      const { data: pv } = await supabase
        .from('poll_votes')
        .select('post_id, option_id')
        .eq('user_id', profile.id)
        .in('post_id', pollIds)
      if (pv) {
        pv.forEach((v: any) => {
          if (!pollVoteMap[v.post_id]) pollVoteMap[v.post_id] = new Set()
          pollVoteMap[v.post_id].add(v.option_id)
        })
      }
    }
  }

  const posts: Post[] = pagePosts.map(toPost).map(p => ({
    ...p,
    user_vote: voteMap[p.id] || null,
    user_saved: saveMap[p.id] || false,
    poll_options: pollOptionMap[p.id] && pollOptionMap[p.id].length > 0 ? pollOptionMap[p.id] : undefined,
    poll_user_votes: pollVoteMap[p.id] ? Array.from(pollVoteMap[p.id]) : undefined,
  }))

  return {
    posts,
    nextCursor: rawPosts.length > PAGE_SIZE ? posts[posts.length - 1]?.created_at : null,
  }
}

export function useFeed(params: FeedParams) {
  const supabase = useSupabase()
  const { profile, loading: userLoading } = useUser()

  return useInfiniteQuery({
    queryKey: [...feedKey(params), profile?.id ?? 'anon'],
    queryFn: ({ pageParam }) => fetchFeedPage(supabase, profile, params, pageParam as string | null),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!supabase && !userLoading,
  })
}
