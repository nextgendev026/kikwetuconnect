import Link from 'next/link'
import { Heart, MessageCircle, Share2, Bookmark, Shield, TrendingUp } from 'lucide-react'
import { clsx } from 'clsx'

export interface PostCardProps {
  id: string
  title?: string
  content: string
  postType: 'baraza' | 'inquiry' | 'article'
  authorName: string
  authorHandle: string
  authorAvatar?: string
  authorHeshima?: number
  isVerifiedExpert?: boolean
  upvotesCount: number
  answersCount?: number
  commentsCount?: number
  county?: string
  tags?: string[]
  bountyTokens?: number
  createdAt: string
  media?: string
  onUpvote?: () => void
  onSave?: () => void
  userVoted?: boolean
  userSaved?: boolean
}

export function PostCard({
  id,
  title,
  content,
  postType,
  authorName,
  authorHandle,
  authorAvatar,
  authorHeshima = 0,
  isVerifiedExpert = false,
  upvotesCount,
  answersCount = 0,
  county,
  tags = [],
  bountyTokens = 0,
  createdAt,
  media,
  onUpvote,
  onSave,
  userVoted = false,
  userSaved = false,
}: PostCardProps) {
  const initials = authorName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const timeAgo = getTimeAgo(new Date(createdAt))

  const postTypeColors: Record<string, { bg: string; text: string }> = {
    baraza: { bg: 'bg-green-bg', text: 'text-green' },
    inquiry: { bg: 'bg-blue-bg', text: 'text-blue' },
    article: { bg: 'bg-gold-bg', text: 'text-gold' },
  }

  const typeColor = postTypeColors[postType]

  return (
    <div className="card section mb-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green to-gold flex items-center justify-center text-sm font-bold text-bg flex-shrink-0">
            {authorAvatar ? (
              <img src={authorAvatar} alt={authorName} className="w-10 h-10 rounded-full" />
            ) : (
              initials
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href={`/profile/${authorHandle}`}
                className="font-bold text-sm hover:underline"
              >
                {authorName}
              </Link>
              {isVerifiedExpert && (
                <Shield className="w-4 h-4 text-green flex-shrink-0" title="Verified Expert" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-quiet">@{authorHandle}</span>
              {authorHeshima > 0 && (
                <span className="text-xs font-medium text-green">
                  {authorHeshima} Heshima
                </span>
              )}
            </div>
            {county && (
              <p className="text-xs text-muted mt-1">📍 {county}</p>
            )}
          </div>
        </div>
        <div className="text-xs text-quiet flex-shrink-0">{timeAgo}</div>
      </div>

      {/* Content */}
      <div className="mb-4">
        {title && (
          <h3 className="font-bold text-base mb-2 line-clamp-2 hover:text-green transition-colors cursor-pointer">
            {title}
          </h3>
        )}
        <p className="text-sm text-text line-clamp-3 mb-3">{content}</p>

        {media && (
          <div className="mb-3 rounded-lg overflow-hidden bg-surface border border-line h-40">
            <img src={media} alt="Post media" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* Tags & Metadata */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className={clsx('text-xs font-semibold px-2 py-1 rounded-full', typeColor.bg, typeColor.text)}>
          {postType.charAt(0).toUpperCase() + postType.slice(1)}
        </span>
        {bountyTokens > 0 && (
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gold-bg text-gold">
            💰 {bountyTokens} tokens
          </span>
        )}
        {tags.map((tag) => (
          <span key={tag} className="text-xs px-2 py-1 rounded-full bg-surface text-muted hover:bg-surface-2 cursor-pointer transition-colors">
            #{tag}
          </span>
        ))}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between py-3 border-t border-line text-xs text-muted">
        <div className="flex items-center gap-4">
          {upvotesCount > 0 && (
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              <span>{upvotesCount} upvotes</span>
            </div>
          )}
          {postType === 'inquiry' && answersCount > 0 && (
            <div className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              <span>{answersCount} answers</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-line">
        <button
          onClick={onUpvote}
          className={clsx(
            'flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium transition-colors',
            userVoted
              ? 'bg-green-bg text-green'
              : 'text-muted hover:bg-surface'
          )}
        >
          <TrendingUp className="w-4 h-4" />
          {userVoted ? 'Upvoted' : 'Upvote'}
        </button>
        {postType === 'inquiry' && (
          <Link
            href={`/posts/${id}`}
            className="flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium text-muted hover:bg-surface transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Answer
          </Link>
        )}
        <button className="flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium text-muted hover:bg-surface transition-colors">
          <Share2 className="w-4 h-4" />
        </button>
        <button
          onClick={onSave}
          className={clsx(
            'flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium transition-colors',
            userSaved
              ? 'bg-gold-bg text-gold'
              : 'text-muted hover:bg-surface'
          )}
        >
          <Bookmark className="w-4 h-4" />
          {userSaved ? 'Saved' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString('en-KE')
}
