import { describe, it, expect } from 'vitest'
import { buildFeedItems, patchPost, feedKey, toPost } from '@/lib/feedHelpers'
import type { Post } from '@/lib/feedHelpers'

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 'p1',
    user_id: 'u1',
    post_type: 'baraza',
    title: null,
    content: 'hello',
    media_url: null,
    media_type: null,
    county_tag: null,
    bounty_tokens: 0,
    upvotes_count: 0,
    answers_count: 0,
    is_pinned: false,
    is_hidden: false,
    created_at: '2026-08-01T00:00:00Z',
    category: 'Post',
    profiles: null,
    ...overrides,
  }
}

describe('buildFeedItems', () => {
  it('returns an empty list for no posts', () => {
    expect(buildFeedItems([])).toEqual([])
  })

  it('interleaves an ad after every 4th post when an ad is available', () => {
    const posts = Array.from({ length: 9 }, (_, i) => makePost({ id: `p${i}` }))
    const items = buildFeedItems(posts, true)
    expect(items.length).toBe(11) // 9 posts + 2 ads
    expect(items.filter(i => i.kind === 'ad').length).toBe(2)
    expect(items[4]).toEqual({ kind: 'ad' })
    expect(items[9]).toEqual({ kind: 'ad' })
  })

  it('does not inject ads when no ad is available', () => {
    const posts = Array.from({ length: 9 }, (_, i) => makePost({ id: `p${i}` }))
    const items = buildFeedItems(posts, false)
    expect(items.length).toBe(9)
    expect(items.filter(i => i.kind === 'ad').length).toBe(0)
  })

  it('does not inject an ad before the first post', () => {
    const posts = [makePost()]
    expect(buildFeedItems(posts)[0]).toEqual({ kind: 'post', post: posts[0] })
  })
})

describe('patchPost', () => {
  it('returns the same array reference when the post is not found', () => {
    const posts = [makePost()]
    expect(patchPost(posts, 'nope', { upvotes_count: 5 })).toBe(posts)
  })

  it('patches a single post without mutating the original', () => {
    const posts = [makePost({ upvotes_count: 3 })]
    const next = patchPost(posts, 'p1', { upvotes_count: 4 })
    expect(next[0].upvotes_count).toBe(4)
    expect(posts[0].upvotes_count).toBe(3)
    expect(next[0]).not.toBe(posts[0])
  })
})

describe('feedKey', () => {
  it('returns a stable query key for the params', () => {
    const params = { activeTab: 'for_you', typeFilter: 'all', countyFilter: null }
    expect(feedKey(params)).toEqual(['feed', params])
  })
})

describe('toPost', () => {
  it('normalizes user_vote and user_saved', () => {
    const post = toPost(makePost())
    expect(post.user_vote).toBe(null)
    expect(post.user_saved).toBe(false)
  })

  it('keeps nested profile relation', () => {
    const profiles = { id: 'u1', username: 'kevin' }
    const post = toPost({ ...makePost(), profiles })
    expect(post.profiles).toEqual(profiles)
  })
})
