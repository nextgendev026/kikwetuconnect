'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, MapPin, Users, TrendingUp, Plus } from 'lucide-react'
import { PostCard } from '@/components/ui/post-card-component'
import { useUser, useSupabase } from '@/app/providers'
import { useToolbar } from '@/lib/toolbar'

interface CountyStats {
  county: string
  postCount: number
  activeUsers: number
  topContributors: Array<{ name: string; heshima: number }>
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
  is_hidden: boolean
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

const COUNTY_DISPLAY_NAMES: Record<string, string> = {
  'nairobi': 'Nairobi',
  'mombasa': 'Mombasa',
  'kisumu': 'Kisumu',
  'eldoret': 'Eldoret',
  'kitale': 'Kitale',
  'nakuru': 'Nakuru',
  'thika': 'Thika',
  'kericho': 'Kericho',
  'isiolo': 'Isiolo',
  'garissa': 'Garissa',
  'lamu': 'Lamu',
  'wajir': 'Wajir',
  'mandera': 'Mandera',
  'kilifi': 'Kilifi',
  'kwale': 'Kwale',
  'taita-taveta': 'Taita-Taveta',
  'makueni': 'Makueni',
  'kajiado': 'Kajiado',
  'narok': 'Narok',
  'bomet': 'Bomet',
  'nyamira': 'Nyamira',
  'kisii': 'Kisii',
  'homa-bay': 'Homa Bay',
  'siaya': 'Siaya',
  'bungoma': 'Bungoma',
  'busia': 'Busia',
  'kakamega': 'Kakamega',
  'vihiga': 'Vihiga',
  'nandi': 'Nandi',
  'baringo': 'Baringo',
  'west-pokot': 'West Pokot',
  'samburu': 'Samburu',
  'laikipia': 'Laikipia',
  'embu': 'Embu',
  'meru': 'Meru',
  'tharaka-nithi': 'Tharaka-Nithi',
  'nyeri': 'Nyeri',
  'muranga': "Murang'a",
  'kirinyaga': 'Kirinyaga',
  'machakos': 'Machakos',
  'kiambu': 'Kiambu',
  'turkana': 'Turkana',
  'trans-nzoia': 'Trans Nzoia',
  'uasin-gishu': 'Uasin Gishu',
}

export default function CountyHubPage() {
  const params = useParams()
  const countySlug = params.county as string
  const { profile } = useUser()
  const supabase = useSupabase()

  const countyName = COUNTY_DISPLAY_NAMES[countySlug] || countySlug
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [barazaId, setBarazaId] = useState<string | null>(null)
  const [stats, setStats] = useState<CountyStats>({
    county: countyName,
    postCount: 0,
    activeUsers: 0,
    topContributors: [],
  })

  const { setConfig } = useToolbar()

  useEffect(() => {
    fetchCountyData()
  }, [countyName])

  useEffect(() => {
    setConfig({
      backUrl: '/baraza',
      actions: [
        { icon: Plus, label: 'Create Post', onClick: () => document.dispatchEvent(new CustomEvent('open-create-modal', { detail: { countyTag: countyName, barazaId } })), variant: 'gold' },
      ],
    })
    return () => setConfig(null)
  }, [countyName, barazaId, setConfig])

  const fetchCountyData = async () => {
    setLoading(true)
    try {
      // Fetch baraza record for this county slug
      const { data: baraza } = await supabase
        .from('barazas')
        .select('id')
        .eq('slug', countySlug)
        .maybeSingle()
      if (baraza) setBarazaId(baraza.id)

      // Fetch posts for this county
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            username,
            avatar_url,
            heshima_rating,
            is_verified_expert
          )
        `)
        .eq('county_tag', countyName)
        .order('created_at', { ascending: false })
        .limit(50)

      if (postsError) throw postsError
      setPosts((postsData || []) as Post[])

      // Update stats
      setStats((prev) => ({
        ...prev,
        postCount: (postsData || []).length,
      }))
    } catch (err) {
      console.error('Error fetching county data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-green border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/baraza"
          className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-surface hover:bg-surface-2 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <p className="text-sm text-muted">Back to hubs</p>
      </div>

      {/* County Header */}
      <div className="card section mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="w-6 h-6 text-green" />
              <h1 className="text-3xl font-bold">{countyName}</h1>
            </div>
            <p className="text-muted mb-4">
              Local conversations and knowledge from {countyName}
            </p>
            <div className="flex items-center gap-6 text-sm text-quiet">
              <span className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                {stats.postCount.toLocaleString()} posts
              </span>
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                {stats.activeUsers.toLocaleString()} active members
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {profile?.county_hub === countyName && (
              <div className="px-4 py-2 rounded-full bg-green-bg text-green text-sm font-medium flex items-center gap-2">
                ✓ Your County
              </div>
            )}
            <button onClick={() => document.dispatchEvent(new CustomEvent('open-create-modal', {
              detail: { countyTag: countyName, barazaId },
            }))}
              className="btn btn-primary text-sm">
              Create Post
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="card section mb-6 flex gap-2 overflow-x-auto -mx-5 px-5">
        <button className="flex-none px-4 py-2 rounded-full text-sm font-medium bg-green text-bg">
          All Posts
        </button>
        <button className="flex-none px-4 py-2 rounded-full text-sm font-medium bg-surface hover:bg-surface-2 text-text transition-colors">
          Questions
        </button>
        <button className="flex-none px-4 py-2 rounded-full text-sm font-medium bg-surface hover:bg-surface-2 text-text transition-colors">
          Trending
        </button>
      </div>

      {/* Posts */}
      <section>
        {posts.length === 0 ? (
          <div className="card section text-center py-12">
            <MapPin className="w-12 h-12 text-quiet mx-auto mb-4 opacity-50" />
            <p className="text-muted mb-2">No posts from {countyName} yet</p>
            <p className="text-xs text-quiet mb-6">Be the first to share something!</p>
            <button onClick={() => document.dispatchEvent(new CustomEvent('open-create-modal', {
              detail: { countyTag: countyName, barazaId },
            }))}
              className="btn btn-primary">
              Create a post
            </button>
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
                  authorId={post.user_id}
                  currentUserId={profile?.id}
                  isHidden={post.is_hidden}
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
      </section>
    </>
  )
}
