export interface Profile {
  id: string
  full_name: string | null
  username: string
  avatar_url: string | null
  heshima_rating: number
  is_verified_expert: boolean
  county_hub: string | null
}

export interface VoteRow {
  target_id: string
  vote_type: 1 | -1
}

export interface SaveRow {
  target_id: string
}

export interface Post {
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
  is_hidden: boolean
  created_at: string
  category: string
  profiles: Profile | null
  user_vote?: 1 | -1 | null
  user_saved?: boolean
}

export type FeedRow =
  | { kind: 'ad' }
  | { kind: 'post'; post: Post }

const AD_EVERY = 4

/** Interleave FeedAd placeholders between posts (every 4th slot). */
export function buildFeedItems(posts: Post[]): FeedRow[] {
  const items: FeedRow[] = []
  posts.forEach((post, idx) => {
    if (idx > 0 && idx % AD_EVERY === 0) items.push({ kind: 'ad' })
    items.push({ kind: 'post', post })
  })
  return items
}

/** Optimistically patch a single post in the list (no array copies of the whole feed). */
export function patchPost(posts: Post[], postId: string, patch: Partial<Post>): Post[] {
  let updated = false
  const next = posts.map(p => {
    if (p.id !== postId) return p
    updated = true
    return { ...p, ...patch }
  })
  return updated ? next : posts
}

/** Map a raw row to a typed Post with the profile shape expected by PostCard. */
export function toPost(row: any): Post {
  return {
    ...row,
    user_vote: row.user_vote ?? null,
    user_saved: !!row.user_saved,
    profiles: row.profiles || row.profile || null,
  }
}
