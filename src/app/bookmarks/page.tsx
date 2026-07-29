'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Bookmark } from 'lucide-react'
import { useUser, useSupabase } from '@/app/providers'

export default function BookmarksPage() {
  const { profile, loading } = useUser()
  const supabase = useSupabase()
  const [savedPosts, setSavedPosts] = useState<any[]>([])
  const [bookmarksLoading, setBookmarksLoading] = useState(false)

  useEffect(() => {
    if (!profile) return
    const fetchBookmarks = async () => {
      setBookmarksLoading(true)
      const { data: saves } = await supabase
        .from('saves')
        .select('target_id, created_at')
        .eq('user_id', profile.id)
        .eq('target_type', 'post')
        .order('created_at', { ascending: false })

      if (saves && saves.length > 0) {
        const ids = saves.map((s: any) => s.target_id)
        const { data: posts } = await supabase
          .from('posts')
          .select('id, title, content, post_type, created_at')
          .in('id', ids)

        if (posts) {
          const ordered = ids.map((id: string) => posts.find((p: any) => p.id === id)).filter((p: any) => p)
          setSavedPosts(ordered)
        }
      } else {
        setSavedPosts([])
      }
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
            {savedPosts.map((post: any) => (
              <Link key={post.id} href={`/posts/${post.id}`}
                className="block p-4 rounded-xl transition-colors" style={{ border: '1px solid var(--line)', textDecoration: 'none' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--green)' }}>{post.post_type}</p>
                    <h3 className="text-sm font-bold mt-1 line-clamp-2" style={{ color: 'var(--ink)' }}>{post.title || post.content.substring(0, 60)}</h3>
                    <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>{new Date(post.created_at).toLocaleDateString('en-KE')}</p>
                  </div>
                  <Bookmark className="w-4 h-4 flex-shrink-0 mt-1" style={{ color: 'var(--gold)' }} fill="currentColor" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
