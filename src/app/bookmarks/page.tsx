'use client'
import { useState, useEffect } from 'react'
import { Bookmark } from 'lucide-react'
import { useUser, useSupabase } from '@/app/providers'

interface Post {
  id: string; title: string; content: string; post_type: string; created_at: string
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
      const { data: posts } = await supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(10)
      if (posts) setSavedPosts(posts)
      setBookmarksLoading(false)
    }
    fetchBookmarks()
  }, [profile, supabase])

  if (loading) return <div className="flex items-center justify-center min-h-[80vh]"><div className="animate-spin w-8 h-8 border-2" style={{ borderColor: 'var(--green)', borderTopColor: 'transparent', borderRadius: '50%' }} /></div>

  return (
    <div className="pb-8 animate-fade-in-up">
      <section className="page-head">
        <h1 className="page-title flex items-center gap-3">
          <Bookmark className="w-7 h-7" style={{ color: 'var(--gold)' }} />
          Bookmarks
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Your saved insights and posts</p>
      </section>

      <section style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20, boxShadow: 'var(--card-shadow)' }}>
        {bookmarksLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2" style={{ borderColor: 'var(--green)', borderTopColor: 'transparent', borderRadius: '50%' }} />
          </div>
        ) : savedPosts.length === 0 ? (
          <div className="py-12 text-center">
            <Bookmark className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--muted)', opacity: 0.3 }} />
            <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>No bookmarks yet</p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Save posts to find them easily later</p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedPosts.map(post => (
              <div key={post.id} className="p-4 rounded-xl transition-colors cursor-pointer" style={{ border: '1px solid var(--line)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--green)' }}>{post.post_type}</p>
                    <h3 className="text-sm font-bold mt-1 line-clamp-2" style={{ color: 'var(--ink)' }}>{post.title || post.content.substring(0, 60)}</h3>
                    <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>{new Date(post.created_at).toLocaleDateString('en-KE')}</p>
                  </div>
                  <Bookmark className="w-4 h-4 flex-shrink-0 mt-1" style={{ color: 'var(--gold)' }} fill="currentColor" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
