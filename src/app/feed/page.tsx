'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Filter, MapPin, Globe } from 'lucide-react'
import { Button } from '@/components/ui/form'
import { PostCard } from '@/components/ui/post-card-component'
import { useUser, useSupabase } from '@/providers/supabase-provider'

interface Post {
  id: string
  title: string | null
  content: string
  post_type: 'baraza' | 'inquiry' | 'article'
  user_id: string
  upvotes_count: number
  answers_count: number
  bounty_tokens: number
  county_tag: string | null
  created_at: string
  media_url: string | null
  is_pinned: boolean
}

interface Profile {
  id: string
  full_name: string
  username: string
  avatar_url: string | null
  heshima_rating: number
  is_verified_expert: boolean
  county_hub: string | null
}

interface PostWithAuthor extends Post {
  profiles: Profile | null
}

export default function FeedPage() {
  const { profile, loading: userLoading } = useUser()
  const supabase = useSupabase()
  const [posts, setPosts] = useState<PostWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'baraza' | 'inquiry' | 'article'>('all')
  const [county, setCounty] = useState<string | null>(null)

  useEffect(() => {
    fetchPosts()
  }, [filter, county])

  const fetchPosts = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            username,
            avatar_url,
            heshima_rating,
            is_verified_expert,
            county_hub
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (filter !== 'all') {
        query = query.eq('post_type', filter)
      }

      if (county) {
        query = query.eq('county_tag', county)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching posts:', error)
      } else {
        setPosts((data as PostWithAuthor[]) || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpvote = async (postId: string) => {
    if (!profile) return

    try {
      const { data: existingVote } = await supabase
        .from('votes')
        .select('*')
        .eq('user_id', profile.id)
        .eq('target_id', postId)
        .eq('target_type', 'post')
        .single()

      if (existingVote) {
        await supabase
          .from('votes')
          .delete()
          .eq('id', existingVote.id)
      } else {
        await supabase.from('votes').insert({
          user_id: profile.id,
          target_id: postId,
          target_type: 'post',
          vote_type: 1,
        })
      }

      // Refresh posts
      fetchPosts()
    } catch (error) {
      console.error('Error voting:', error)
    }
  }

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-green border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <>
      <section className="page-head flex items-center justify-between">
        <div>
          <h1 className="page-title">Home Feed</h1>
          <p className="text-muted text-sm">Your personalized Baraza</p>
        </div>
        <Link href="/create" className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Create
        </Link>
      </section>

      {/* Filters */}
      <div className="card section mb-6">
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-green text-bg'
                : 'bg-surface hover:bg-surface-2 text-text'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('baraza')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === 'baraza'
                ? 'bg-green text-bg'
                : 'bg-surface hover:bg-surface-2 text-text'
            }`}
          >
            Baraza Posts
          </button>
          <button
            onClick={() => setFilter('inquiry')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === 'inquiry'
                ? 'bg-blue text-bg'
                : 'bg-surface hover:bg-surface-2 text-text'
            }`}
          >
            Deep-Dive
          </button>
          <button
            onClick={() => setFilter('article')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === 'article'
                ? 'bg-gold text-bg'
                : 'bg-surface hover:bg-surface-2 text-text'
            }`}
          >
            Articles
          </button>

          <div className="flex-1" />

          {profile?.county_hub && (
            <button
              onClick={() => setCounty(county === profile.county_hub ? null : profile.county_hub)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                county === profile.county_hub
                  ? 'bg-green-bg text-green border border-green'
                  : 'bg-surface hover:bg-surface-2 text-text border border-line'
              }`}
            >
              <MapPin className="w-4 h-4" />
              {profile.county_hub}
            </button>
          )}
        </div>
      </div>

      {/* Posts Feed */}
      <section>
        {posts.length === 0 ? (
          <div className="card section text-center py-12">
            <Globe className="w-12 h-12 text-quiet mx-auto mb-4 opacity-50" />
            <p className="text-muted mb-2">No posts yet</p>
            <p className="text-xs text-quiet mb-6">
              Start following people or topics to see content here
            </p>
            <Link href="/topics" className="btn btn-primary">
              Explore Topics
            </Link>
          </div>
        ) : (
          posts.map((post) => {
            const author = post.profiles as Profile | null
            if (!author) return null

            return (
              <PostCard
                key={post.id}
                id={post.id}
                title={post.title || undefined}
                content={post.content}
                postType={post.post_type}
                authorName={author.full_name || author.username}
                authorHandle={author.username}
                authorHeshima={author.heshima_rating}
                isVerifiedExpert={author.is_verified_expert}
                upvotesCount={post.upvotes_count}
                answersCount={post.answers_count}
                county={post.county_tag || undefined}
                bountyTokens={post.bounty_tokens}
                createdAt={post.created_at}
                media={post.media_url || undefined}
                onUpvote={() => handleUpvote(post.id)}
              />
            )
          })
        )}
      </section>
    </>
  )
}
