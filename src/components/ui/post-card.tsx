import { clsx } from 'clsx'
import { LucideIcon } from 'lucide-react'
import { ROLES } from '@/lib/roles'

interface PostCardProps {
  post: {
    id: string
    user: {
      id: string
      name: string
      role: string
      avatar: string
      verified?: boolean
      color: 'green' | 'gold' | 'brown' | 'blue'
    }
    type: 'baraza' | 'inquiry' | 'article'
    title?: string
    content: string
    excerpt?: string
    media_url?: string
    county_tag?: string
    bounty_tokens?: number
    upvotes_count: number
    answers_count: number
    tags: string[]
    created_at: string
    is_pinned?: boolean
    is_expert_solution?: boolean
    user_vote?: 1 | -1 | null
  }
  compact?: boolean
}

export function PostCard({ post, compact = false }: PostCardProps) {
  const timeAgo = (date: string) => {
    const now = new Date()
    const past = new Date(date)
    const diff = Math.floor((now.getTime() - past.getTime()) / (1000 * 60 * 60))
    if (diff < 1) return 'just now'
    if (diff < 24) return `${diff}h ago`
    return `${Math.floor(diff / 24)}d ago`
  }

  const getPostTypeIcon = (type: string) => {
    switch (type) {
      case 'baraza': return '💬'
      case 'inquiry': return '❓'
      case 'article': return '📝'
      default: return '📝'
    }
  }

  return (
    <article className="post">
      <div className="post-head">
        <div className={`avatar ${post.user.color === 'green' ? 'green' : post.user.color === 'gold' ? 'gold' : post.user.color === 'brown' ? 'brown' : 'blue'}`}>
          {post.user.avatar}
        </div>
        <div className="who">
          <div className="name flex items-center gap-1">
            {post.user.name}
            {post.user.verified && (
              <span className="w-3.5 h-3.5 bg-green rounded-full flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-2 h-2 stroke-[oklch(10%_0.01_155)] stroke-3 fill-none">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            )}
          </div>
          <div className="role">{post.user.role}</div>
        </div>
        <span className="when">{timeAgo(post.created_at)}</span>
        <div className="more">
          <button className="w-6 h-6 rounded-full flex items-center justify-center text-faint hover:bg-surface-2 hover:text-muted transition-colors">
            ⋯
          </button>
        </div>
      </div>

      {post.type === 'inquiry' && post.title && (
        <h2 className="question-title">{post.title}</h2>
      )}

      {post.content && (
        <p className={`body ${compact ? 'text-sm' : ''}`}>
          {post.excerpt || post.content.substring(0, 200)}
          {post.content.length > 200 && '...'}
        </p>
      )}

      {post.media_url && (
        <div className="my-3 rounded-lg overflow-hidden border border-line">
          <img
            src={post.media_url}
            alt="Post media"
            className="w-full h-auto object-cover"
          />
        </div>
      )}

      {post.tags && post.tags.length > 0 && (
        <div className="tags">
          {post.tags.map((tag) => (
            <span key={tag} className="tag green">{tag}</span>
          ))}
        </div>
      )}

      {post.type === 'inquiry' && (
        <div className="qstats flex gap-4 text-xs text-quiet mb-3">
          <span className="flex items-center gap-1">
            💬 {post.answers_count} answers
          </span>
          <span className="flex items-center gap-1">
            ▲ {post.upvotes_count} upvotes
          </span>
        </div>
      )}

      <div className="actions">
        <button className={`action ${post.user_vote === 1 ? 'active' : ''}`}>
          <span>▲</span>
          <span>{post.upvotes_count}</span>
        </button>
        {post.type === 'inquiry' && (
          <button className="action">
            <span>💬</span>
            <span>{post.answers_count}</span>
          </button>
        )}
        <button className="action">
          <span>↗</span>
        </button>
        {post.type === 'inquiry' && post.bounty_tokens && post.bounty_tokens > 0 && (
          <button className="action bounty">
            <span>◉</span>
            <span>{post.bounty_tokens} tokens</span>
          </button>
        )}
        <button className="action ml-auto">
          <span>☆</span>
        </button>
      </div>
    </article>
  )
}

interface HubCardProps {
  hub: {
    name: string
    description: string
    icon: string
    color?: 'green' | 'gold' | 'brown' | 'blue'
    follower_count?: number
  }
}

export function HubCard({ hub }: HubCardProps) {
  const colorClasses = {
    green: 'bg-green-bg text-green',
    gold: 'bg-gold-bg text-gold',
    brown: 'bg-brown-bg text-brown',
    blue: 'bg-blue-bg text-blue',
  }

  return (
    <div className="rp-item">
      <div className={`rp-icon ${colorClasses[hub.color || 'green']}`}>
        {hub.icon}
      </div>
      <div className="rp-info">
        <div className="rp-name">{hub.name}</div>
        <div className="rp-sub">{hub.description}</div>
      </div>
      <div className="rp-arrow">›</div>
    </div>
  )
}

interface ExpertCardProps {
  expert: {
    name: string
    field: string
    heshima: number
    avatar: string
    color?: 'green' | 'gold' | 'brown' | 'blue'
  }
}

export function ExpertCard({ expert }: ExpertCardProps) {
  const colorClasses = {
    green: 'bg-green-bg text-green',
    gold: 'bg-gold-bg text-gold',
    brown: 'bg-brown-bg text-brown',
    blue: 'bg-blue-bg text-blue',
  }

  return (
    <div className="expert">
      <div className={`eavatar ${colorClasses[expert.color || 'green']}`}>
        {expert.avatar}
      </div>
      <div className="einfo">
        <div className="ename">{expert.name}</div>
        <div className="efield">{expert.field}</div>
      </div>
      <span className="escore">{expert.heshima}</span>
    </div>
  )
}