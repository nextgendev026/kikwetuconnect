'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, notFound } from 'next/navigation'
import { ArrowLeft, MessageCircle, TrendingUp, Bookmark, Shield, Star, MoreHorizontal, Edit3, Trash2, EyeOff, Eye, Flag } from 'lucide-react'
import { Button, Textarea } from '@/components/ui/form'
import { useUser, useSupabase, toast } from '@/app/providers'
import ShareMenu from '@/components/ShareMenu'
import RichText from '@/components/RichText'
import { isVideoType } from '@/lib/utils'
import { track } from '@/lib/analytics'

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
  media_url: string | null
  media_type: string | null
  upvotes_count: number
  answers_count: number
  bounty_tokens: number
  county_tag: string | null
  is_hidden: boolean
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

interface PostDetailProps {
  postId?: string
  initialPost?: Post | null
}

export default function PostDetail({ postId: propPostId, initialPost = null }: PostDetailProps) {
  const params = useParams()
  const postId = propPostId ?? (params.id as string)
  const { profile } = useUser()
  const supabase = useSupabase()

  const [post, setPost] = useState<Post | null>(initialPost as Post | null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [loading, setLoading] = useState(!initialPost)
  const [answerContent, setAnswerContent] = useState('')
  const [submittingAnswer, setSubmittingAnswer] = useState(false)
  const [error, setError] = useState('')
  const [userVotes, setUserVotes] = useState<Record<string, number>>({})
  const [userSaved, setUserSaved] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchPost()
    fetchAnswers()
    if (profile) {
      fetchUserVotes()
      checkSaved()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, profile])

  const checkSaved = async () => {
    if (!profile) return
    const { data } = await supabase.from('saves').select('id').eq('user_id', profile.id).eq('target_id', postId).eq('target_type', 'post').maybeSingle()
    setUserSaved(!!data)
  }



  const fetchPost = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_post_by_id', { p_post_id: postId })

      if (error) throw error

      // RPC returns null if not found — handle gracefully
      if (data) {
        setPost(data as unknown as Post)
        setLoading(false)
        track('post_view', { post_id: postId, post_type: (data as unknown as Post).post_type || 'post' })
        return
      }
    } catch (err: any) {
      // If the RPC is unavailable (e.g. migration not applied) or fails,
      // fall back to a direct table query using RLS (posts are public).
      console.error('get_post_by_id RPC failed, falling back:', err?.message || err)
    }

    try {
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, content, post_type, user_id, media_url, media_type, upvotes_count, answers_count, bounty_tokens, county_tag, is_hidden, created_at, profiles:user_id(id, full_name, username, heshima_rating, is_verified_expert)')
        .eq('id', postId)
        .maybeSingle()

      if (error) {
        console.error('Error fetching post via fallback:', error?.message || error)
        setPost(null)
        return
      }
      setPost((data as unknown as Post) || null)
      if (data) track('post_view', { post_id: postId, post_type: (data as unknown as Post).post_type || 'post' })
    } catch (err: any) {
      console.error('Error fetching post:', err?.message || err)
      setPost(null)
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
      const list = (data || []) as Answer[]
      setAnswers(list)
      if (profile) fetchUserVotes(list.map(a => a.id))
    } catch (err) {
      console.error('Error fetching answers:', err)
    }
  }

  const fetchUserVotes = async (answerIds?: string[]) => {
    if (!profile) return
    const ids = answerIds ?? answers.map(a => a.id)

    try {
      const { data, error } = await supabase
        .from('votes')
        .select('target_id, vote_type')
        .eq('user_id', profile.id)
        .in('target_id', [postId, ...ids])

      if (!error && data) {
        const votes: Record<string, number> = {}
        data.forEach((v: any) => {
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
    } catch (err: any) {
      setError(err.message)
    }
  }

  const reportAnswer = async (answerId: string) => {
    if (!profile) {
      setError('Please sign in to report')
      return
    }
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_type: 'answer', content_id: answerId, reason: 'Reported by user' }),
      })
      if (res.ok) toast('Report submitted. Moderators will review.')
      else toast('Failed to submit report')
    } catch {
      toast('Report failed')
    }
  }

  const handleEditSave = async () => {
    const res = await fetch(`/api/posts/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle, content: editContent }),
    })
    if (!res.ok) { const j = await res.json(); toast(j.error || 'Failed to update'); return }
    const j = await res.json()
    setPost(j.post)
    toast('Post updated')
    setEditing(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' })
    setDeleting(false)
    if (!res.ok) { const j = await res.json(); toast(j.error || 'Failed to delete'); return }
    toast('Post deleted')
    window.location.href = '/feed'
  }

  const handleHide = async () => {
    const hidden = !post!.is_hidden
    const res = await fetch(`/api/posts/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_hidden: hidden }),
    })
    if (!res.ok) { const j = await res.json(); toast(j.error || 'Failed'); return }
    setPost(prev => prev ? { ...prev, is_hidden: hidden } : prev)
    toast(hidden ? 'Post hidden' : 'Post unhidden')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-green border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!post) {
    notFound()
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
          aria-label="Back to feed"
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
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green to-gold flex items-center justify-center text-sm font-bold text-night flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-bold text-sm">{author?.full_name || 'Anonymous'}</p>
              {author?.is_verified_expert && (
                <Shield className="w-4 h-4 text-green" />
              )}
            </div>
            <p className="text-xs text-quiet">@{author?.username}</p>
            {(author?.heshima_rating ?? 0) > 0 && (
              <p className="text-xs text-green font-medium">{author?.heshima_rating ?? 0} Heshima</p>
            )}
          </div>
          <p className="text-xs text-quiet flex-shrink-0">
            {new Date(post.created_at).toLocaleDateString('en-KE')}
          </p>
          {profile?.id === post.user_id && (
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface transition-colors" aria-label="Post options">
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 min-w-[150px] bg-deep border border-[var(--line)] rounded-lg shadow-xl z-20 animate-rise overflow-hidden">
                    <button onClick={() => { setShowMenu(false); setEditing(true); setEditTitle(post.title || ''); setEditContent(post.content) }} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-text hover:bg-surface transition-colors">
                      <Edit3 className="w-4 h-4" /> Edit
                    </button>
                    <button onClick={() => { setShowMenu(false); handleHide() }} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-text hover:bg-surface transition-colors">
                      {post.is_hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />} {post.is_hidden ? 'Unhide' : 'Hide'}
                    </button>
                    <button onClick={() => { setShowMenu(false); setConfirmDelete(true) }} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red hover:bg-surface transition-colors">
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Title and Content */}
        {post.media_url && (
          <div className="mb-4 rounded-[12px] overflow-hidden" style={{ background: 'var(--raised)' }}>
            {isVideoType(post.media_type) ? (
              <div className="h-[240px] flex items-center justify-center">
                <span className="text-[48px] opacity-50">🎥</span>
              </div>
            ) : (
              <a href={post.media_url} target="_blank" rel="noopener noreferrer" className="block post-content-image">
                <img src={post.media_url} alt="" className="w-full h-auto max-h-[400px] object-cover" loading="lazy" />
              </a>
            )}
          </div>
        )}
        {post.title && <h1 className="text-2xl font-bold mb-4">{post.title}</h1>}
        <RichText content={post.content} className="text-[15px] mb-4" />

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
              className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                userVotes[postId] === 1
                  ? 'bg-green-bg text-green'
                  : 'text-muted hover:bg-surface'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Upvote</span>
            </button>
            <ShareMenu url={`/posts/${post.id}`} title={post.title || post.content.slice(0, 80)} />
            <button onClick={async () => {
              if (!profile) { toast('Sign in to save'); return }
              const res = await fetch('/api/saves', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target_type: 'post', target_id: postId }),
              })
              const data = await res.json()
              if (res.ok) { setUserSaved(data.saved); toast(data.saved ? 'Saved' : 'Removed') }
              else toast('Failed')
            }}
              className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${userSaved ? 'bg-gold-bg text-gold' : 'text-muted hover:bg-surface'}`}
              aria-label={userSaved ? 'Unsave post' : 'Save post'}>
              <Bookmark className={`w-4 h-4 ${userSaved ? 'fill-current' : ''}`} />
              <span className="hidden sm:inline">{userSaved ? 'Saved' : 'Save'}</span>
            </button>
          </div>
        </div>

        {/* Edit modal */}
        {editing && (
          <div onClick={(e) => { if (e.target === e.currentTarget) setEditing(false) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 24, width: 'min(560px, 94%)' }}>
              <h3 style={{ fontWeight: 800, fontSize: 16, color: 'var(--ink)', margin: '0 0 16px' }}>Edit post</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                <input style={{ background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: 'var(--ink)', outline: 'none' }} placeholder="Title (optional)" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                <textarea style={{ background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: 9, padding: '10px 14px', fontSize: 14, color: 'var(--ink)', outline: 'none', minHeight: 200, resize: 'vertical' }} placeholder="Write your post..." value={editContent} onChange={e => setEditContent(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
                <button onClick={() => setEditing(false)} style={{ minHeight: 36, borderRadius: 9, padding: '0 14px', background: 'var(--raised)', color: 'var(--ink)', fontSize: 11, fontWeight: 700, border: 0, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleEditSave} style={{ minHeight: 36, borderRadius: 9, padding: '0 14px', background: 'var(--gold)', color: 'var(--night)', fontSize: 11, fontWeight: 700, border: 0, cursor: 'pointer' }}>Save</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirmation */}
        {confirmDelete && (
          <div onClick={(e) => { if (e.target === e.currentTarget) setConfirmDelete(false) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 24, width: 'min(360px, 94%)', textAlign: 'center' }}>
              <h3 style={{ fontWeight: 800, fontSize: 16, color: 'var(--ink)', margin: '0 0 8px' }}>Delete post?</h3>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 18px' }}>This action cannot be undone.</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button onClick={() => setConfirmDelete(false)} style={{ minHeight: 36, borderRadius: 9, padding: '0 14px', background: 'var(--raised)', color: 'var(--ink)', fontSize: 11, fontWeight: 700, border: 0, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleDelete} disabled={deleting} style={{ minHeight: 36, borderRadius: 9, padding: '0 14px', background: 'var(--red)', color: '#fff', fontSize: 11, fontWeight: 700, border: 0, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? .5 : 1 }}>
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
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
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue to-green flex items-center justify-center text-xs font-bold text-night flex-shrink-0">
                        {answerInitials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm">{answerAuthor?.full_name || 'Kikwetu Member'}</p>
                          {answerAuthor?.is_verified_expert && (
                            <Shield className="w-3 h-3 text-green" />
                          )}
                          {answer.is_expert_solution && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-bg text-green">
                              Best Answer
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-quiet">{answerAuthor?.username ? `@${answerAuthor.username}` : ''}</p>
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
                        className={`min-h-[36px] px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                          userVotes[answer.id] === 1
                            ? 'bg-green-bg text-green'
                            : 'text-muted hover:bg-surface'
                        }`}
                      >
                        <TrendingUp className="w-3 h-3" />
                        <span className="hidden sm:inline">Upvote</span>
                      </button>
                      <ShareMenu compact url={`/posts/${post.id}`} title={`Answer on "${post.title || 'KikwetuConnect'}"`} />
                      <button
                        onClick={() => reportAnswer(answer.id)}
                        className="min-h-[36px] px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 text-muted hover:bg-surface"
                        aria-label="Report answer"
                      >
                        <Flag className="w-3 h-3" />
                        <span className="hidden sm:inline">Report</span>
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
