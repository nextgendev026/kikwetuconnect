'use client'

import { useState, useEffect } from 'react'
import { Wallet, TrendingUp, TrendingDown, Gift, Bookmark } from 'lucide-react'
import { useUser, useSupabase } from '@/providers/supabase-provider'

interface BookmarkedPost {
  id: string
  post_id: string
  user_id: string
  created_at: string
}

interface Post {
  id: string
  title: string
  content: string
  post_type: string
  created_at: string
}

export default function BookmarksPage() {
  const { profile, loading } = useUser()
  const supabase = useSupabase()
  const [savedPosts, setSavedPosts] = useState<Post[]>([])
  const [bookmarksLoading, setBookmarksLoading] = useState(false)

  useEffect(() => {
    if (!profile) return

    const fetchBookmarks = async () => {
      setBookmarksLoading(true)

      // For now, we'll show recent posts as an example
      // In a real implementation, you'd have a bookmarks/saves table
      const { data: posts } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (posts) {
        setSavedPosts(posts)
      }

      setBookmarksLoading(false)
    }

    fetchBookmarks()
  }, [profile, supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-green border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <>
      <section className="page-head">
        <h1 className="page-title">Bookmarks</h1>
        <p className="text-muted text-sm">Your saved insights and posts</p>
      </section>

      <section className="card section">
        {bookmarksLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-green border-t-transparent rounded-full" />
          </div>
        ) : savedPosts.length === 0 ? (
          <div className="py-12 text-center">
            <Bookmark className="w-8 h-8 text-quiet mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted">No bookmarks yet</p>
            <p className="text-xs text-quiet mt-1">Save posts to find them easily later</p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedPosts.map((post) => (
              <div
                key={post.id}
                className="p-4 rounded-lg bg-surface hover:bg-surface-2 transition-colors cursor-pointer border border-line"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-green uppercase tracking-wide">
                      {post.post_type}
                    </p>
                    <h3 className="text-sm font-bold mt-1 line-clamp-2">
                      {post.title || post.content.substring(0, 60)}
                    </h3>
                    <p className="text-xs text-quiet mt-2">
                      {new Date(post.created_at).toLocaleDateString('en-KE')}
                    </p>
                  </div>
                  <Bookmark className="w-4 h-4 text-gold flex-shrink-0 mt-1" fill="currentColor" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
