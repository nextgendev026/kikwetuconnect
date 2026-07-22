'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Users, Plus, Check, Tag } from 'lucide-react'
import { Button } from '@/components/ui/form'
import { PostCard } from '@/components/ui/post-card-component'
import { useUser, useSupabase } from '@/providers/supabase-provider'

interface Topic {
  id: string
  name: string
  slug: string
  description: string | null
  color: string
  follower_count: number
  post_count: number
}

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
  profiles: {
    id: string
    full_name: string
    username: string
    avatar_url: string | null
    heshima_rating: number
    is_verified_expert: boolean
  } | null
}

export default function TopicDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  const { profile } = useUser()
  const supabase = useSupabase()

  const [topic, setTopic] = useState<Topic | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    fetchTopic()
  }, [slug])

  useEffect(() => {
    if (topic) {
      fetchPosts()
      if (profile) {
        checkIfFollowing()
      }
    }
  }, [topic, profile])

  const fetchTopic = async () => {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('slug', slug)
        .single()

      if (error) throw error
      setTopic(data as Topic)
    } catch (err) {
      console.error('Error fetching topic:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchPosts = async () => {
    if (!topic) return

    try {
      const { data, error } = await supabase
        .from('post_topics')
        .select(`
          post_id,
          posts:post_id (
            *,
            profiles:user_id (
              id,
              full_name,
              username,
              avatar_url,
              heshima_rating,
              is_verified_expert
            )
          )
        `)
        .eq('topic_id', topic.id)
        .order('posts.created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      const postsData = (data || [])
        .map((pt: any) => pt.posts)
        .filter(Boolean) as Post[]
      setPosts(postsData)
    } catch (err) {
      console.error('Error fetching posts:', err)
    }
  }

  const checkIfFollowing = async () => {
    if (!profile || !topic) return

    try {
      const { data } = await supabase
        .from('user_topics')
        .select('*')
        .eq('user_id', profile.id)
        .eq('topic_id', topic.id)
        .single()

      setIsFollowing(!!data)
    } catch (err) {
      // Not following
      setIsFollowing(false)
    }
  }

  const handleFollowTopic = async () => {
    if (!profile || !topic) return

    setFollowLoading(true)

    try {
      const response = await fetch('/api/topics/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId: topic.id,
          action: isFollowing ? 'unfollow' : 'follow',
        }),
      })

      if (!response.ok) throw new Error('Failed to follow topic')

      setIsFollowing(!isFollowing)
      setTopic({
        ...topic,
        follower_count: isFollowing
          ? topic.follower_count - 1
          : topic.follower_count + 1,
      })
    } catch (err: any) {
      console.error('Error following topic:', err)
    } finally {
      setFollowLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-green border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!topic) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-muted mb-4">Topic not found</p>
        <Link href="/topics" className="btn btn-primary">
          Back to topics
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/topics"
          className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-surface hover:bg-surface-2 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <p className="text-sm text-muted">Back to topics</p>
      </div>

      {/* Topic Header */}
      <div className="card section mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{topic.name}</h1>
            {topic.description && (
              <p className="text-muted text-base mb-4">{topic.description}</p>
            )}
            <div className="flex items-center gap-6 text-sm text-quiet">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                {topic.follower_count.toLocaleString()} followers
              </span>
              <span className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                {topic.post_count} posts
              </span>
            </div>
          </div>

          {profile ? (
            <Button
              variant={isFollowing ? 'secondary' : 'primary'}
              size="lg"
              loading={followLoading}
              disabled={followLoading}
              onClick={handleFollowTopic}
            >
              {followLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : isFollowing ? (
                <>
                  <Check className="w-5 h-5" />
                  Following
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Follow
                </>
              )}
            </Button>
          ) : (
            <Link href="/login" className="btn btn-primary btn-lg">
              Sign in
            </Link>
          )}
        </div>
      </div>

      {/* Posts */}
      <div>
        <h2 className="text-xl font-bold mb-4">
          {posts.length === 0 ? 'No posts yet' : `Recent posts (${posts.length})`}
        </h2>

        {posts.length === 0 ? (
          <div className="card section text-center py-12">
            <Tag className="w-12 h-12 text-quiet mx-auto mb-4 opacity-50" />
            <p className="text-muted">No posts in this topic yet</p>
            {profile && (
              <Link href="/create" className="inline-block mt-6 btn btn-primary">
                Create the first post
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => {
              if (!post.profiles) return null

              return (
                <PostCard
                  key={post.id}
                  id={post.id}
                  title={post.title || undefined}
                  content={post.content}
                  postType={post.post_type}
                  authorName={post.profiles.full_name}
                  authorHandle={post.profiles.username}
                  authorHeshima={post.profiles.heshima_rating}
                  isVerifiedExpert={post.profiles.is_verified_expert}
                  upvotesCount={post.upvotes_count}
                  answersCount={post.answers_count}
                  county={post.county_tag || undefined}
                  bountyTokens={post.bounty_tokens}
                  createdAt={post.created_at}
                  media={post.media_url || undefined}
                />
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
