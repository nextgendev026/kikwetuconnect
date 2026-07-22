'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Textarea, Input } from '@/components/ui/form'
import { X, Tag, MapPin, Coins, ArrowLeft } from 'lucide-react'
import { useUser, useSupabase } from '@/providers/supabase-provider'

const postTypes = [
  { id: 'baraza', name: 'Baraza Post', description: 'Share a thought, insight, or start a conversation' },
  { id: 'inquiry', name: 'Ask Question', description: 'Ask a specific question to get expert answers' },
  { id: 'article', name: 'Article', description: 'Write a longer piece of knowledge or analysis' },
]

const COUNTIES = [
  'Nairobi', 'Mombasa', 'Kisumu', 'Eldoret', 'Kitale', 'Nakuru', 'Thika', 'Kericho',
  'Isiolo', 'Garissa', 'Lamu', 'Wajir', 'Mandera', 'Kilifi', 'Kwale', 'Taita-Taveta',
  'Makueni', 'Kajiado', 'Narok', 'Bomet', 'Nyamira', 'Kisii', 'Homa Bay', 'Siaya',
  'Bungoma', 'Busia', 'Kakamega', 'Vihiga', 'Nandi', 'Baringo', 'West Pokot', 'Samburu',
  'Laikipia', 'Embu', 'Meru', 'Tharaka-Nithi', 'Nyeri', 'Murang\'a', 'Kirinyaga', 'Machakos',
  'Kiambu', 'Turkana', 'Trans Nzoia', 'Uasin Gishu',
]

const DEFAULT_TOPICS = [
  'Tech & Startups',
  'Agriculture & Farming',
  'Biashara & Hustles',
  'Legal & Hustler Rights',
  'Culture & Entertainment',
  'Education',
  'Health',
  'County Politics',
]

interface Topic {
  id: string
  name: string
}

export default function CreatePage() {
  const router = useRouter()
  const { profile, loading: userLoading } = useUser()
  const supabase = useSupabase()
  
  const [selectedType, setSelectedType] = useState('baraza')
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [selectedCounty, setSelectedCounty] = useState('')
  const [bountyTokens, setBountyTokens] = useState(0)
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchTopics()
  }, [])

  const fetchTopics = async () => {
    const { data } = await supabase
      .from('topics')
      .select('id, name')

    if (data) {
      setTopics(data)
    }
  }

  const toggleTopic = (topicName: string) => {
    setSelectedTopics(prev =>
      prev.includes(topicName)
        ? prev.filter(t => t !== topicName)
        : [...prev, topicName]
    )
  }

  const handleSubmit = async () => {
    setError('')
    setSuccess('')

    // Validation
    if (!content.trim()) {
      setError('Please write some content')
      return
    }

    if (content.trim().length < 10) {
      setError('Content must be at least 10 characters')
      return
    }

    if (selectedType === 'inquiry' && !title.trim()) {
      setError('Please add a title for your question')
      return
    }

    if (selectedType === 'inquiry' && title.trim().length < 5) {
      setError('Title must be at least 5 characters')
      return
    }

    setLoading(true)

    try {
      // Get topic IDs for the selected topics
      const selectedTopicIds = topics
        .filter(t => selectedTopics.includes(t.name))
        .map(t => t.id)

      const response = await fetch('/api/posts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postType: selectedType,
          title: title || null,
          content,
          countyTag: selectedCounty || null,
          bountyTokens: selectedType === 'inquiry' ? bountyTokens : 0,
          topics: selectedTopicIds,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create post')
      }

      setSuccess('Post created successfully!')
      setTimeout(() => {
        router.push('/feed')
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-green border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-muted mb-4">Please sign in to create a post</p>
        <Link href="/login" className="btn btn-primary">
          Sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/feed"
          className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-surface hover:bg-surface-2 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="page-title">Create in Baraza</h1>
          <p className="text-xs text-muted">Share your knowledge with the community</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-bg/20 border border-red/30 text-red text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 rounded-xl bg-green-bg/20 border border-green/30 text-green text-sm">
          {success}
        </div>
      )}

      <div className="card section">
        {/* Post Type Selector */}
        <div className="flex gap-2 overflow-x-auto mb-6 pb-2 -mx-5 px-5">
          {postTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`flex-none px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedType === type.id
                  ? 'bg-green text-bg'
                  : 'bg-surface hover:bg-surface-2 border border-line text-text'
              }`}
            >
              {type.name}
            </button>
          ))}
        </div>

        <p className="text-sm text-quiet mb-6">
          {postTypes.find(t => t.id === selectedType)?.description}
        </p>

        {/* Title (for inquiries and articles) */}
        {(selectedType === 'inquiry' || selectedType === 'article') && (
          <Input
            placeholder="Add a title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
          />
        )}

        {/* Content Editor */}
        <Textarea
          placeholder={
            selectedType === 'inquiry'
              ? 'What would you like to know? Be specific...'
              : selectedType === 'article'
              ? 'Share your knowledge or expertise...'
              : "What's on your mind? Share a thought, insight, or start a conversation..."
          }
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          disabled={loading}
        />

        {/* Bounty (for inquiries) */}
        {selectedType === 'inquiry' && (
          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm font-medium text-muted mb-2">
              <Coins className="w-4 h-4 text-gold" />
              Attach a bounty (optional)
            </label>
            <input
              type="number"
              min="0"
              max="500"
              value={bountyTokens || ''}
              onChange={(e) => setBountyTokens(Number(e.target.value) || 0)}
              disabled={loading}
              className="w-32 px-3 py-2 bg-input border border-line rounded-lg text-sm outline-none focus:border-green focus:ring-2 focus:ring-green/20"
              placeholder="0"
            />
            <span className="text-xs text-quiet ml-2">tokens to reward the best answer</span>
          </div>
        )}

        {/* County Tag */}
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm font-medium text-muted mb-2">
            <MapPin className="w-4 h-4" />
            Location context
          </label>
          <select
            value={selectedCounty}
            onChange={(e) => setSelectedCounty(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 bg-input border border-line rounded-lg text-sm outline-none focus:border-green focus:ring-2 focus:ring-green/20"
          >
            <option value="">Select a county (optional)</option>
            {COUNTIES.map((county) => (
              <option key={county} value={county}>
                {county}
              </option>
            ))}
          </select>
        </div>

        {/* Topics */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm font-medium text-muted mb-2">
            <Tag className="w-4 h-4" />
            Topics
          </label>
          <div className="flex flex-wrap gap-2">
            {topics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => toggleTopic(topic.name)}
                disabled={loading}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedTopics.includes(topic.name)
                    ? 'bg-green text-bg'
                    : 'bg-surface-2 text-muted hover:bg-surface hover:text-text'
                }`}
              >
                {topic.name}
              </button>
            ))}
          </div>
          {selectedTopics.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-line">
              {selectedTopics.map((topic) => (
                <span key={topic} className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-bg text-green rounded-full text-xs">
                  {topic}
                  <button
                    onClick={() => toggleTopic(topic)}
                    className="hover:text-green/70"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Media Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-line">
          <div className="flex gap-2 opacity-50">
            <button className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center text-muted hover:bg-surface hover:text-text transition-colors" disabled>
              📷
            </button>
            <button className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center text-muted hover:bg-surface hover:text-text transition-colors" disabled>
              🎥
            </button>
            <button className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center text-muted hover:bg-surface hover:text-text transition-colors" disabled>
              🎙️
            </button>
            <button className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center text-muted hover:bg-surface hover:text-text transition-colors" disabled>
              📍
            </button>
          </div>
          <div className="flex gap-2">
            <Link href="/feed" className="btn btn-secondary">
              Cancel
            </Link>
            <Button
              variant="primary"
              loading={loading}
              disabled={loading}
              onClick={handleSubmit}
            >
              {selectedType === 'inquiry' ? 'Post Question' : selectedType === 'article' ? 'Post Article' : 'Post to Baraza'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
}