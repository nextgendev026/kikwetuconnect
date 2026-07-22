import { clsx } from 'clsx'
import { LucideIcon } from 'lucide-react'

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'
type AvatarColor = 'green' | 'gold' | 'brown' | 'blue' | 'default'

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  name?: string
  size?: AvatarSize
  color?: AvatarColor
  verified?: boolean
}

export function Avatar({
  src,
  alt,
  name,
  size = 'md',
  color = 'default',
  verified,
  className,
}: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  }

  const colorClasses = {
    green: 'bg-green-bg text-green',
    gold: 'bg-gold-bg text-gold',
    brown: 'bg-brown-bg text-brown',
    blue: 'bg-blue-bg text-blue',
    default: 'bg-surface-2 text-muted',
  }

  const getInitials = (name?: string) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div
      className={clsx(
        'avatar',
        sizeClasses[size],
        !src && colorClasses[color],
        className
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        getInitials(name)
      )}
      {verified && (
        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green rounded-full flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            className="w-2 h-2 stroke-[oklch(10%_0.01_155)] stroke-3 fill-none"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      )}
    </div>
  )
}

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'green' | 'gold' | 'brown' | 'blue' | 'red' | 'muted'
}

export function Badge({ className, variant = 'green', children }: BadgeProps) {
  const variantClasses = {
    green: 'badge-green',
    gold: 'badge-gold',
    brown: 'badge-brown',
    blue: 'badge-blue',
    red: 'badge-red',
    muted: 'badge-muted',
  }

  return (
    <span className={clsx('badge', variantClasses[variant], className)}>
      {children}
    </span>
  )
}

interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'green' | 'gold' | 'default'
}

export function Tag({ className, variant = 'default', children }: TagProps) {
  const variantClasses = {
    green: 'tag-green',
    gold: 'tag-gold',
    default: '',
  }

  return (
    <span className={clsx('tag', variantClasses[variant], className)}>
      {children}
    </span>
  )
}

interface HeshimaMeterProps {
  rating: number
  size?: 'sm' | 'md' | 'lg'
  showRank?: boolean
}

export function HeshimaMeter({ rating, size = 'md', showRank = true }: HeshimaMeterProps) {
  const percentage = Math.min((rating / 1000) * 100, 100)
  const circumference = 2 * Math.PI * 42
  const offset = circumference - (percentage / 100) * circumference

  const sizeClasses = {
    sm: 'w-16 h-16 text-sm',
    md: 'w-20 h-20 text-base',
    lg: 'w-24 h-24 text-lg',
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={clsx('relative', sizeClasses[size])}>
        <svg
          className="w-full h-full transform -rotate-90"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-surface-2"
          />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="text-green transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-bold text-green">{rating}</span>
          {showRank && (
            <span className="text-xs text-quiet">Heshima</span>
          )}
        </div>
      </div>
      {showRank && (
        <span className="text-xs text-faint">
          Top {Math.max(1, Math.round((1000 - rating) / 10))}%
        </span>
      )}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  variant?: 'green' | 'gold' | 'default'
}

export function StatCard({ label, value, icon: Icon, variant = 'default' }: StatCardProps) {
  const variantClasses = {
    green: 'text-green',
    gold: 'text-gold',
    default: 'text-text',
  }

  return (
    <div className="stat">
      <strong className={variantClasses[variant]}>{value}</strong>
      <span>{label}</span>
    </div>
  )
}