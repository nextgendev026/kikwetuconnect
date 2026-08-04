import { useState, useEffect, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { searchContent } from '@/lib/search'

interface SearchResult {
  id: string
  title: string
  content?: string
  username?: string
  county?: string
  verified?: boolean
  expert?: boolean
  type: 'post' | 'quiz' | 'user'
}

export function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setIsLoading(true)
    try {
      const searchResult = await searchContent(searchQuery, {}, 8)
      const allResults = [
        ...searchResult.posts.map(post => ({ ...post, type: 'post' as const })),
        ...searchResult.quizzes.map(quiz => ({ ...quiz, type: 'quiz' as const })),
        ...searchResult.users.map(user => ({ ...user, type: 'user' as const })),
      ]
      setResults(allResults)
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      performSearch(query)
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [query, performSearch])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setQuery('')
    }
  }

  const handleResultClick = () => {
    setIsOpen(false)
    setQuery('')
  }

  return (
    <div className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search posts, quizzes, people..."
          className="w-full pl-10 pr-4 py-3 bg-surface border border-line rounded-xl focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted hover:text-text"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-surface border border-line rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-2">
            {results.map((result) => (
              <SearchResultItem key={`${result.type}-${result.id}`} result={result} onClick={handleResultClick} />
            ))}
          </div>
          <div className="border-t border-line p-3">
            <button
              onClick={() => window.location.href = `/search?q=${encodeURIComponent(query)}`}
              className="w-full text-center py-2 text-sm text-gold hover:text-gold/80 font-medium transition-colors"
            >
              View all results
            </button>
          </div>
        </div>
      )}

      {isOpen && results.length === 0 && query && !isLoading && (
        <div className="absolute top-full mt-2 w-full bg-surface border border-line rounded-xl shadow-lg p-4 text-center text-muted">
          No results found for "{query}"
        </div>
      )}
    </div>
  )
}

function SearchResultItem({ result, onClick }: { result: SearchResult; onClick: () => void }) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'post': return '📝'
      case 'quiz': return '❓'
      case 'user': return '👤'
      default: return '📄'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'post': return 'bg-green/20 text-green'
      case 'quiz': return 'bg-gold/20 text-gold'
      case 'user': return 'bg-blue/20 text-blue'
      default: return 'bg-muted/20 text-muted'
    }
  }

  const handleClick = () => {
    switch (result.type) {
      case 'post':
        window.location.href = `/posts/${result.id}`
        break
      case 'quiz':
        window.location.href = `/quizzes/${result.id}`
        break
      case 'user':
        window.location.href = `/profile/${result.username}`
        break
    }
    onClick()
  }

  return (
    <div
      onClick={handleClick}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-raised cursor-pointer transition-colors"
    >
      <span className="text-lg">{getTypeIcon(result.type)}</span>
      <span className={`text-xs px-2 py-1 rounded-full ${getTypeColor(result.type)}`}>
        {result.type}
      </span>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">{result.title}</h4>
        {(result as any).username && (
          <p className="text-xs text-muted truncate">@{result.username}</p>
        )}
        {(result as any).county && (
          <p className="text-xs text-muted truncate">📍 {(result as any).county}</p>
        )}
        {(result as any).verified && (
          <p className="text-xs text-green truncate">✓ Verified Expert</p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-muted" />
    </div>
  )
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}
