'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Tag, Users, Plus, Check } from 'lucide-react'
import { Button } from '@/components/ui/form'
import { useUser, useSupabase } from '@/providers/supabase-provider'

interface Topic {
  id: string
  name: string
  slug: string
  description: string | null
  color: string
  follower_count: number
  post_count: number
  created_at: string
}

const TOPIC_EMOJIS: Record<string, string> = {
  'tech-startups': '💻',
  'agriculture': '🌾',
  'biashara': '💼',
  'legal-rights': '⚖️',
  'culture': '🎨',
  'education': '🎓',
  'health': '🏥',
  'county-politics': '🏛️',
}

export default function TopicsPage() {
  const { profile, loading: userLoading } = useUser()
  const supabase = useSupabase()
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [followedTopics, setFollowedTopics] = useState<Set<string>>(new Set())
  const [followingTopicId, setFollowingTopicId] = useState<string | null>(null)

  useEffect(() => {
    fetchTopics()
  }, [])

  useEffect(() => {
    if (profile) {
      fetchFollowedTopics()
    }
  }, [profile])

  const fetchTopics = async () => {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .order('follower_count', { ascending: false })

      if (error) throw error
      setTopics((data || []) as Topic[])
    } catch (err) {
      console.error('Error fetching topics:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchFollowedTopics = async () => {
    if (!profile) return

    try {
      const { data, error } = await supabase
        .from('user_topics')
        .select('topic_id')
        .eq('user_id', profile.id)

      if (error) throw error

      const ids = new Set<string>((data || []).map((ut: any) => ut.topic_id))
      setFollowedTopics(ids)
    } catch (err) {
      console.error('Error fetching followed topics:', err)
    }
  }

  const handleFollowTopic = async (topicId: string, isFollowing: boolean) => {
    if (!profile) {
      window.location.href = '/login'
      return
    }

    setFollowingTopicId(topicId)

    try {
      const response = await fetch('/api/topics/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId,
          action: isFollowing ? 'unfollow' : 'follow',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error)
      }

      // Update local state
      const newFollowed = new Set(followedTopics)
      if (isFollowing) {
        newFollowed.delete(topicId)
      } else {
        newFollowed.add(topicId)
      }
      setFollowedTopics(newFollowed)

      // Update topic counts
      setTopics((prev) =>
        prev.map((t) =>
          t.id === topicId
            ? {
                ...t,
                follower_count: isFollowing
                  ? t.follower_count - 1
                  : t.follower_count + 1,
              }
            : t
        )
      )
    } catch (err: any) {
      console.error('Error following topic:', err)
    } finally {
      setFollowingTopicId(null)
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
      <section className="page-head">
        <h1 className="page-title">Topics</h1>
        <p className="text-muted text-sm">Follow topics to shape your Home Feed</p>
      </section>

      {topics.length === 0 ? (
        <div className="card section text-center py-12">
          <Tag className="w-12 h-12 text-quiet mx-auto mb-4 opacity-50" />
          <p className="text-muted">No topics available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {topics.map((topic) => {
            const emoji = TOPIC_EMOJIS[topic.slug] || '📌'
            const isFollowing = followedTopics.has(topic.id)

            return (
              <Link
                key={topic.id}
                href={`/topics/${topic.slug}`}
                className="card section hover:border-green/50 transition-colors group"
              >
                <div className="text-3xl mb-3">{emoji}</div>

                <h3 className="text-lg font-bold mb-1 group-hover:text-green transition-colors">
                  {topic.name}
                </h3>

                {topic.description && (
                  <p className="text-sm text-muted mb-3 line-clamp-2">
                    {topic.description}
                  </p>
                )}

                <div className="flex items-center gap-3 text-xs text-quiet mb-4 py-3 border-t border-line">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {topic.follower_count.toLocaleString()} followers
                  </span>
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {topic.post_count} posts
                  </span>
                </div>

                <Button
                  variant={isFollowing ? 'secondary' : 'primary'}
                  size="sm"
                  className="w-full"
                  loading={followingTopicId === topic.id}
                  disabled={followingTopicId === topic.id}
                  onClick={(e) => {
                    e.preventDefault()
                    handleFollowTopic(topic.id, isFollowing)
                  }}
                >
                  {followingTopicId === topic.id ? (
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : isFollowing ? (
                    <>
                      <Check className="w-4 h-4" />
                      Following
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Follow
                    </>
                  )}
                </Button>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
