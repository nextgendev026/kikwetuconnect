'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, Users, Tag, Globe } from 'lucide-react'
import { PostCard } from '@/components/ui/post-card-component'
import { Input } from '@/components/ui/form'

interface SearchResult {
  posts: any[]
  profiles: any[]
  topics: any[]
  query: string
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  const [results, setResults] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchInput, setSearchInput] = useState(query)

  useEffect(() => {
    if (query) {
      performSearch(query)
    }
  }, [query])

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setResults(null)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}`
      )
      if (response.ok) {
        const data = await response.json()
        setResults(data)
      }
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchInput.trim()) {
      window.history.pushState(
        null,
        '',
        `/search?q=${encodeURIComponent(searchInput)}`
      )
      performSearch(searchInput)
    }
  }

  return (
    <div className="animate-fade-in-up">
      <section className="page-head">
        <h1 className="page-title">Search</h1>
        <p className="text-muted text-sm">Find posts, people, and topics</p>
      </section>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="card section mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-quiet" />
          <input
            type="text"
            placeholder="Search posts, people, topics..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="input pl-12 text-base"
            autoFocus
          />
        </div>
      </form>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-green border-t-transparent rounded-full" />
        </div>
      )}

      {!loading && results && (
        <>
          {/* Posts Results */}
          {results.posts.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-green" />
                Posts ({results.posts.length})
              </h2>
              <div className="space-y-4">
                {results.posts.map((post) => {
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
                      bountyTokens={post.bounty_tokens}
                      createdAt={post.created_at}
                    />
                  )
                })}
              </div>
            </section>
          )}

          {/* Profile Results */}
          {results.profiles.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue" />
                People ({results.profiles.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {results.profiles.map((profile) => (
                  <Link
                    key={profile.id}
                    href={`/profile/${profile.username}`}
                    className="card section hover:border-blue/50 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue to-green flex items-center justify-center text-sm font-bold text-night flex-shrink-0">
                        {profile.full_name
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')
                          .toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm group-hover:text-blue transition-colors truncate">
                          {profile.full_name}
                        </p>
                        <p className="text-xs text-quiet truncate">@{profile.username}</p>
                        {profile.heshima_rating > 0 && (
                          <p className="text-xs text-green font-medium mt-1">
                            {profile.heshima_rating} Heshima
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Topic Results */}
          {results.topics.length > 0 && (
            <section>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5 text-gold" />
                Topics ({results.topics.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.topics.map((topic) => (
                  <Link
                    key={topic.id}
                    href={`/topics/${topic.slug}`}
                    className="card section hover:border-gold/50 transition-colors group"
                  >
                    <h3 className="font-bold group-hover:text-gold transition-colors">
                      {topic.name}
                    </h3>
                    <p className="text-xs text-quiet mt-1">
                      {topic.follower_count.toLocaleString()} followers
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* No Results */}
          {results.posts.length === 0 &&
            results.profiles.length === 0 &&
            results.topics.length === 0 && (
              <div className="card section text-center py-12">
                <Search className="w-12 h-12 text-quiet mx-auto mb-4 opacity-50" />
                <p className="text-muted">No results found for "{results.query}"</p>
                <p className="text-xs text-quiet mt-1">Try a different search term</p>
              </div>
            )}
        </>
      )}

      {!loading && !results && query === '' && (
        <div className="card section text-center py-12">
          <Search className="w-12 h-12 text-quiet mx-auto mb-4 opacity-50" />
          <p className="text-muted">Enter a search term to get started</p>
        </div>
      )}
    </div>
  )
}

