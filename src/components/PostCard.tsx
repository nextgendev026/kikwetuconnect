'use client'
import { memo, useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from '@/app/providers'
import { ArrowUp, MessageCircle, Smile, Globe, Flag, Star, MoreHorizontal, Edit3, Trash2, EyeOff, Eye } from 'lucide-react'
import ShareMenu from '@/components/ShareMenu'
import RichText, { stripMarkdown } from '@/components/RichText'
import { EMOJI_REACTIONS } from '@/lib/feed-config'
import { timeAgoShort, getInitials, isVideoType } from '@/lib/utils'
import type { Post } from '@/lib/feedHelpers'

interface PostCardProps {
  post: Post
  currentUserId: string | null
  onVote: (postId: string, voteType: 1 | -1 | null) => void
  onSave: (postId: string) => void
  onReact: (postId: string, emoji: string) => void
}

export const PostCard = memo(function PostCard({
  post,
  currentUserId,
  onVote,
  onSave,
  onReact,
}: PostCardProps) {
  const author = post.profiles
  const initials = getInitials(author?.full_name || author?.username)
  const [showReactions, setShowReactions] = useState(false)
  const [reactions, setReactions] = useState<Record<string, number>>({})
  const [translatedText, setTranslatedText] = useState<string | null>(null)
  const [loadingTrans, setLoadingTrans] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(post.title || '')
  const [editContent, setEditContent] = useState(post.content)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [hidden, setHidden] = useState(post.is_hidden)

  const handleEditSave = async () => {
    const res = await fetch(`/api/posts/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle, content: editContent }),
    })
    if (!res.ok) { const j = await res.json(); toast(j.error || 'Failed to update'); return }
    const j = await res.json()
    post.title = j.post.title
    post.content = j.post.content
    toast('Post updated')
    setEditing(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' })
    setDeleting(false)
    if (!res.ok) { const j = await res.json(); toast(j.error || 'Failed to delete'); return }
    toast('Post deleted')
    onVote(post.id, null)
    window.location.reload()
  }

  const handleHide = async () => {
    const res = await fetch(`/api/posts/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_hidden: !hidden }),
    })
    if (!res.ok) { const j = await res.json(); toast(j.error || 'Failed'); return }
    setHidden(!hidden)
    if (!hidden) window.location.reload()
    toast(hidden ? 'Post unhidden' : 'Post hidden')
  }

  useEffect(() => {
    const stored = localStorage.getItem(`reactions-${post.id}`)
    if (stored) try { setReactions(JSON.parse(stored)) } catch {}
  }, [post.id])

  const handleReact = (emoji: string) => {
    const updated = { ...reactions, [emoji]: (reactions[emoji] || 0) + 1 }
    setReactions(updated)
    localStorage.setItem(`reactions-${post.id}`, JSON.stringify(updated))
    onReact(post.id, emoji)
    setShowReactions(false)
  }

  const handleTranslate = async () => {
    if (translatedText) { setTranslatedText(null); return }
    setLoadingTrans(true)
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: post.id, source_type: 'posts', language: 'sw' }),
      })
      const j = await res.json()
      if (j.translated_text) setTranslatedText(j.translated_text)
      else toast('Translation failed')
    } catch { toast('Translation error') }
    finally { setLoadingTrans(false) }
  }

  const handleReport = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_type: 'post', content_id: post.id, reason: 'Reported by user' }),
      })
      if (res.ok) toast('Report submitted. Moderators will review.')
      else toast('Failed to submit report')
    } catch { toast('Report failed') }
  }

  const modalBackdrop = { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }
  const modalCard = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 24, width: 'min(520px, 94%)' as string }

  return (
    <div className="bg-night2 border border-[var(--line)] rounded-[16px] p-[18px] mb-[12px] animate-rise card-hover">
      {/* Header */}
      <div className="flex items-start gap-3 mb-[12px]">
        <Link href={`/profile/${author?.username || ''}`} className="flex-shrink-0 relative" aria-label={`View ${author?.full_name || author?.username || 'user'} profile`}>
          {author?.avatar_url ? (
            <Image src={author.avatar_url} alt="" width={40} height={40} className="w-[40px] h-[40px] rounded-full object-cover" loading="lazy" unoptimized={author.avatar_url.startsWith('data:')} onError={e => { (e.target as HTMLElement).style.display = 'none'; (e.target as HTMLElement).parentElement!.querySelector('.avatar-fallback')?.classList.remove('hidden') }} />
          ) : null}
          <div className={`avatar-fallback w-[40px] h-[40px] rounded-full bg-gradient-to-br from-gold to-green flex items-center justify-center text-[12px] font-extrabold text-night ${author?.avatar_url ? 'hidden' : ''}`}>{initials}</div>
          {author?.is_verified_expert && (
            <span className="absolute -bottom-1 -right-1 w-[18px] h-[18px] bg-green rounded-full flex items-center justify-center border-2 border-night2">
              <svg viewBox="0 0 24 24" className="w-[10px] h-[10px] stroke-night fill-none" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
            </span>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-[6px] flex-wrap">
            <Link href={`/profile/${author?.username || ''}`} className="text-cream font-bold text-[13px] hover:underline">{author?.full_name || author?.username || 'Unknown'}</Link>
            {author?.is_verified_expert && <span className="text-[10px] font-bold text-green-accessible">Expert</span>}
          </div>
          <div className="flex items-center gap-[8px] mt-[2px]">
            <span className="text-[var(--muted)] text-[11px]">@{author?.username || 'unknown'}</span>
            {author && author.heshima_rating > 0 && (
              <span className="text-[10px] font-semibold text-gold-accessible">{author.heshima_rating} Heshima</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span style={{
            padding: '3px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
            background: post.post_type === 'inquiry' ? 'color-mix(in oklab, var(--blue) 20%, transparent)' : post.post_type === 'article' ? 'color-mix(in oklab, var(--gold) 20%, transparent)' : 'color-mix(in oklab, var(--green) 20%, transparent)',
            color: post.post_type === 'inquiry' ? 'var(--blue-text)' : post.post_type === 'article' ? 'var(--gold-text)' : 'var(--green-text)',
          }}>
            {post.post_type === 'baraza' ? 'Post' : post.post_type === 'inquiry' ? 'Question' : post.post_type === 'article' ? 'Article' : post.post_type === 'poll' ? 'Poll' : post.post_type}
          </span>
          {post.category && post.category !== 'Post' && (
            <span style={{
              padding: '3px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700,
              background: post.category === 'Nairobi' ? 'color-mix(in oklab, var(--earth) 20%, transparent)' : 'color-mix(in oklab, var(--blue) 20%, transparent)',
              color: post.category === 'Nairobi' ? 'var(--earth)' : 'var(--blue)',
            }}>
              {post.category}
            </span>
          )}
          <span className="text-[var(--muted)] text-[11px] whitespace-nowrap">{timeAgoShort(post.created_at)}</span>
          {currentUserId === post.user_id && (
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="action-button w-[28px] h-[28px]" aria-label="Post options" aria-haspopup="menu" aria-expanded={showMenu}>
                <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 min-w-[140px] bg-deep border border-[var(--line)] rounded-lg shadow-xl z-20 animate-rise overflow-hidden" role="menu" aria-label="Post options">
                    <button onClick={() => { setShowMenu(false); setEditing(true); setEditTitle(post.title || ''); setEditContent(post.content) }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-cream hover:bg-[var(--surface)] transition-colors" role="menuitem">
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button onClick={() => { setShowMenu(false); handleHide() }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-cream hover:bg-[var(--surface)] transition-colors" role="menuitem">
                      {hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />} {hidden ? 'Unhide' : 'Hide'}
                    </button>
                    <button onClick={() => { setShowMenu(false); setConfirmDelete(true) }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-red hover:bg-[var(--surface)] transition-colors" role="menuitem">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Title for inquiries/articles */}
      {post.title && (
        <Link href={`/posts/${post.id}`} className="block text-cream font-bold text-[15px] mb-[6px] leading-[1.3] hover:text-gold transition-colors">{post.title}</Link>
      )}

      {/* Content — styled text (rich for articles, clamped in feed) */}
      <div className="mb-[12px]">
        {translatedText ? (
          <p className="text-cream text-[13px] leading-[1.6] whitespace-pre-wrap break-words">
            {translatedText}
            <span className="text-[10px] ml-1 opacity-50">(SW)</span>
          </p>
        ) : (
          <>
            <RichText content={post.content} className="text-[13px]" clamp={stripMarkdown(post.content).length > 220} />
            {stripMarkdown(post.content).length > 220 && (
              <Link href={`/posts/${post.id}`} className="inline-block mt-[6px] text-gold-accessible text-[12px] font-bold hover:underline">
                Read full post ↗
              </Link>
            )}
          </>
        )}
      </div>

      {/* Media */}
      {post.media_url && (
        <Link href={`/posts/${post.id}`} aria-label="View post media" className="mb-[12px] rounded-[12px] overflow-hidden bg-deep border border-[var(--line)] block">
          {isVideoType(post.media_type) ? (
            <div className="h-[200px] flex items-center justify-center bg-deep">
              <span className="text-[40px] opacity-50" aria-hidden="true">🎥</span>
            </div>
          ) : (
            <Image src={post.media_url} alt="" width={640} height={300} className="w-full h-auto max-h-[300px] object-cover" loading="lazy" unoptimized={post.media_url.startsWith('data:')} />
          )}
        </Link>
      )}

      {/* County & Bounty */}
      <div className="flex flex-wrap items-center gap-[8px] mb-[12px]">
        {post.county_tag && (
          <span className="flex items-center gap-1 text-[var(--muted)] text-[11px]">
            📍 {post.county_tag}
          </span>
        )}
        {post.bounty_tokens > 0 && (
          <span className="flex items-center gap-1 px-[8px] py-[3px] rounded-full bg-gold/20 text-gold-accessible text-[10px] font-bold">
            🪙 {post.bounty_tokens}
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="post-footer pt-[12px] border-t border-[var(--line)]">
        <div className="action-group">
          <button
            onClick={() => onVote(post.id, post.user_vote === 1 ? null : 1)}
            className={`action-button ${post.user_vote === 1 ? 'active-vote' : ''}`}
            aria-label={post.user_vote === 1 ? `Remove upvote, ${post.upvotes_count || 0} upvotes` : `Upvote, ${post.upvotes_count || 0} upvotes`}
            aria-pressed={post.user_vote === 1}
          >
            <ArrowUp className={`w-4 h-4 ${post.user_vote === 1 ? 'text-green' : ''}`} aria-hidden="true" />
            <span>{post.upvotes_count || 0}</span>
          </button>

          <Link
            href={`/posts/${post.id}`}
            className="action-button feed-action-link"
            aria-label={post.post_type === 'inquiry' ? `${post.answers_count || 0} answers` : `${post.answers_count || 0} comments`}
          >
            <MessageCircle className="w-4 h-4" aria-hidden="true" />
            <span>{post.answers_count || 0}</span>
          </Link>

          <div className="relative">
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="action-button"
              aria-label="React to post"
              aria-haspopup="menu"
              aria-expanded={showReactions}
            >
              <Smile className="w-4 h-4" aria-hidden="true" />
              {Object.keys(reactions).length > 0 && <span className="text-[10px]">{Object.values(reactions).reduce((a, b) => a + b, 0)}</span>}
            </button>
            {showReactions && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowReactions(false)} />
                <div className="absolute bottom-full left-0 mb-1 flex gap-[3px] p-[6px] bg-deep border border-[var(--line)] rounded-full shadow-xl z-20 animate-rise" role="menu" aria-label="Emoji reactions">
                  {EMOJI_REACTIONS.map(emoji => (
                    <button key={emoji} onClick={() => handleReact(emoji)} className="w-[30px] h-[30px] flex items-center justify-center hover:scale-125 transition-transform text-[16px]" aria-label={`React with ${emoji}`} role="menuitem">{emoji}</button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="action-group">
          <ShareMenu url={`/posts/${post.id}`} title={post.title || post.content?.slice(0, 90)} />

          <button
            onClick={handleTranslate}
            className={`action-button ${translatedText ? 'active-vote' : ''}`}
            aria-label={translatedText ? 'Show original' : 'Translate to Swahili'}
          >
            {loadingTrans ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" /> : <Globe className="w-4 h-4" aria-hidden="true" />}
          </button>

          <button
            onClick={() => onSave(post.id)}
            className={`action-button ${post.user_saved ? 'active-save' : ''}`}
            aria-label={post.user_saved ? 'Unsave post' : 'Save post'}
            aria-pressed={!!post.user_saved}
          >
            <Star className={`w-4 h-4 ${post.user_saved ? 'fill-current text-gold' : ''}`} aria-hidden="true" />
          </button>

          <button
            onClick={handleReport}
            className="action-button"
            aria-label="Report post"
          >
            <Flag className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Emoji reaction chips */}
      {Object.keys(reactions).length > 0 && (
        <div className="flex flex-wrap gap-[4px] mt-[8px] pt-[8px] border-t border-[var(--line)]">
          {Object.entries(reactions).map(([emoji, count]) => (
            <button key={emoji} onClick={() => handleReact(emoji)} aria-label={`React with ${emoji}, ${count} reaction${count === 1 ? '' : 's'}`} className="flex items-center gap-1 px-[8px] py-[3px] rounded-full text-[11px] transition-colors" style={{ background: 'var(--raised)', color: 'var(--faint-accessible)' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--gold)' }} onMouseLeave={e => { e.currentTarget.style.background = 'var(--raised)'; e.currentTarget.style.color = 'var(--faint-accessible)' }}>
              <span aria-hidden="true">{emoji}</span>
              <span className="font-semibold">{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setEditing(false) }} style={modalBackdrop} role="dialog" aria-modal="true" aria-label="Edit post">
          <div style={modalCard}>
            <h3 style={{ fontWeight: 800, fontSize: 16, color: 'var(--ink)', margin: '0 0 16px' }}>Edit post</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              <input style={{ background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: 'var(--ink)', outline: 'none' }} placeholder="Title (optional)" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
              <textarea style={{ background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: 'var(--ink)', outline: 'none', minHeight: 150, resize: 'vertical' }} placeholder="Write your post..." value={editContent} onChange={e => setEditContent(e.target.value)} />
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
        <div onClick={(e) => { if (e.target === e.currentTarget) setConfirmDelete(false) }} style={{ ...modalBackdrop }} role="alertdialog" aria-modal="true" aria-label="Delete post">
          <div style={{ ...modalCard, width: 'min(360px, 94%)' }}>
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
  )
})
