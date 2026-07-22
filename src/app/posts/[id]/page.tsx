'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, MessageCircle, TrendingUp, Share2, Bookmark, Shield } from 'lucide-react'
import { Button, Textarea } from '@/components/ui/form'
import { useUser, useSupabase } from '@/providers/supabase-provider'

interface Profile {
  id: string
  full_name: string
  username: string
  heshima_rating: number
  is_verified_expert: boolean
}

interface Post {
  id: string
  title: string
  content: string
  post_type: string
  user_id: string
  upvotes_count: number
  answers_count: number
  bounty_tokens: number
  county_tag: string | null
  created_at: string
  profiles: Profile | null
}

interface Answer {
  id: string
  content: string
  user_id: string
  upvotes_count: number
  created_at: string
  is_expert_solution: boolean
  profiles: Profile | null
}

export default function PostDetailPage() {
  const params = useParams()
  const postId = params.id as string
  const { profile } = useUser()
  const supabase = useSupabase()

  const [post, setPost] = useState<Post | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [loading, setLoading] = useState(true)
  const [answerContent, setAnswerContent] = useState('')
  const [submittingAnswer, setSubmittingAnswer] = useState(false)
  const [error, setError] = useState('')
  const [userVotes, setUserVotes] = useState<Record<string, number>>({})

  useEffect(() => {
    fetchPost()
    fetchAnswers()
    if (profile) {
      fetchUserVotes()
    }
  }, [postId, profile])

  const fetchPost = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            username,
            heshima_rating,
            is_verified_expert
          )
        `)
        .eq('id', postId)
        .single()

      if (error) throw error
      setPost(data as Post)
    } catch (err) {
      console.error('Error fetching post:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchAnswers = async () => {
    try {
      const { data, error } = await supabase
        .from('answers')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            username,
            heshima_rating,
            is_verified_expert
          )
        `)
        .eq('post_id', postId)
        .order('is_expert_solution', { ascending: false })
        .order('upvotes_count', { ascending: false })

      if (error) throw error
      setAnswers((data || []) as Answer[])
    } catch (err) {
      console.error('Error fetching answers:', err)
    }
  }

  const fetchUserVotes = async () => {
    if (!profile) return

    try {
      const { data, error } = await supabase
        .from('votes')
        .select('target_id, vote_type')
        .eq('user_id', profile.id)
        .in('target_id', [postId, ...answers.map(a => a.id)])

      if (!error && data) {
        const votes: Record<string, number> = {}
        data.forEach(v => {
          votes[v.target_id] = v.vote_type
        })
        setUserVotes(votes)
      }
    } catch (err) {
      console.error('Error fetching user votes:', err)
    }
  }

  const handleSubmitAnswer = async () => {
    if (!profile) {
      setError('Please sign in to answer')
      return
    }

    if (!answerContent.trim()) {
      setError('Please write an answer')
      return
    }

    if (answerContent.trim().length < 10) {
      setError('Answer must be at least 10 characters')
      return
    }

    setSubmittingAnswer(true)
    setError('')

    try {
      const response = await fetch('/api/answers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          content: answerContent,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error)
      }

      setAnswerContent('')
      await fetchAnswers()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmittingAnswer(false)
    }
  }

  const handleVote = async (targetId: string, voteType: number) => {
    if (!profile) {
      setError('Please sign in to vote')
      return
    }

    try {
      await fetch('/api/votes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId,
          targetType: targetId === postId ? 'post' : 'answer',
          voteType,
        }),
      })

      await fetchPost()
      await fetchAnswers()
      await fetchUserVotes()
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-green border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-muted mb-4">Post not found</p>
        <Link href="/feed" className="btn btn-primary">
          Back to feed
        </Link>
      </div>
    )
  }

  const author = post.profiles as Profile | null
  const initials = author?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'K'

  return (
    <>
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/feed"
          className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-surface hover:bg-surface-2 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <p className="text-sm text-muted">Back to feed</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-bg/20 border border-red/30 text-red text-sm">
          {error}
        </div>
      )}

      {/* Post */}
      <div className="card section mb-6">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green to-gold flex items-center justify-center text-sm font-bold text-bg flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-bold text-sm">{author?.full_name || 'Anonymous'}</p>
              {author?.is_verified_expert && (
                <Shield className="w-4 h-4 text-green" title="Verified Expert" />
              )}
            </div>
            <p className="text-xs text-quiet">@{author?.username}</p>
            {author?.heshima_rating > 0 && (
              <p className="text-xs text-green font-medium">{author.heshima_rating} Heshima</p>
            )}
          </div>
          <p className="text-xs text-quiet flex-shrink-0">
            {new Date(post.created_at).toLocaleDateString('en-KE')}
          </p>
        </div>

        {/* Title and Content */}
        <h1 className="text-2xl font-bold mb-4">{post.title}</h1>
        <p className="text-base text-text mb-4 leading-relaxed">{post.content}</p>

        {/* Metadata */}
        <div className="flex flex-wrap gap-2 mb-4">
          {post.bounty_tokens > 0 && (
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gold-bg text-gold">
              💰 {post.bounty_tokens} tokens
            </span>
          )}
          {post.county_tag && (
            <span className="text-xs px-2 py-1 rounded-full bg-surface text-muted">
              📍 {post.county_tag}
            </span>
          )}
        </div>

        {/* Stats and Actions */}
        <div className="flex items-center justify-between py-4 border-t border-line">
          <div className="flex items-center gap-6 text-sm text-muted">
            {post.upvotes_count > 0 && (
              <span className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                {post.upvotes_count} upvotes
              </span>
            )}
            {post.answers_count > 0 && (
              <span className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4" />
                {post.answers_count} answers
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleVote(postId, 1)}
              className={`px-3 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                userVotes[postId] === 1
                  ? 'bg-green-bg text-green'
                  : 'text-muted hover:bg-surface'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Upvote
            </button>
            <button className="px-3 py-2 rounded-full text-sm font-medium text-muted hover:bg-surface transition-colors flex items-center gap-1">
              <Share2 className="w-4 h-4" />
              Share
            </button>
            <button className="px-3 py-2 rounded-full text-sm font-medium text-muted hover:bg-surface transition-colors flex items-center gap-1">
              <Bookmark className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Answers Section */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">{post.answers_count} Answers</h2>

        {answers.length === 0 ? (
          <div className="card section text-center py-8">
            <MessageCircle className="w-10 h-10 text-quiet mx-auto mb-3 opacity-50" />
            <p className="text-muted">No answers yet. Be the first to answer!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {answers.map((answer) => {
              const answerAuthor = answer.profiles as Profile | null
              const answerInitials = answerAuthor?.full_name
                ?.split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase() || 'K'

              return (
                <div key={answer.id} className="card section">
                  {/* Answer Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue to-green flex items-center justify-center text-xs font-bold text-bg flex-shrink-0">
                        {answerInitials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm">{answerAuthor?.full_name}</p>
                          {answerAuthor?.is_verified_expert && (
                            <Shield className="w-3 h-3 text-green" />
                          )}
                          {answer.is_expert_solution && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-bg text-green">
                              Best Answer
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-quiet">@{answerAuthor?.username}</p>
                      </div>
                    </div>
                    <p className="text-xs text-quiet">
                      {new Date(answer.created_at).toLocaleDateString('en-KE')}
                    </p>
                  </div>

                  {/* Answer Content */}
                  <p className="text-sm text-text mb-4 leading-relaxed">{answer.content}</p>

                  {/* Answer Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-line">
                    <div className="text-xs text-muted">
                      {answer.upvotes_count > 0 && (
                        <span>{answer.upvotes_count} upvotes</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVote(answer.id, 1)}
                        className={`px-2 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                          userVotes[answer.id] === 1
                            ? 'bg-green-bg text-green'
                            : 'text-muted hover:bg-surface'
                        }`}
                      >
                        <TrendingUp className="w-3 h-3" />
                        Upvote
                      </button>
                      <button className="px-2 py-1 rounded-full text-xs font-medium text-muted hover:bg-surface transition-colors">
                        Share
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Answer Form */}
      {profile ? (
        <div className="card section">
          <h3 className="text-lg font-bold mb-4">Your Answer</h3>
          <Textarea
            placeholder="Share your answer... Be helpful and clear."
            value={answerContent}
            onChange={(e) => setAnswerContent(e.target.value)}
            rows={5}
            disabled={submittingAnswer}
          />
          <div className="flex gap-3 mt-4 justify-end">
            <Button variant="secondary" disabled={submittingAnswer}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={submittingAnswer}
              disabled={submittingAnswer}
              onClick={handleSubmitAnswer}
            >
              Post Answer
            </Button>
          </div>
        </div>
      ) : (
        <div className="card section text-center py-8">
          <p className="text-muted mb-4">Sign in to post an answer</p>
          <Link href="/login" className="btn btn-primary">
            Sign in
          </Link>
        </div>
      )}
    </>
  )
}
