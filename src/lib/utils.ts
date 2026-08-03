import { formatDistanceToNow, format } from 'date-fns'

export function timeAgo(date: string | Date): string {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true })
  } catch {
    return 'just now'
  }
}

export function timeAgoShort(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`
  return new Date(date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
}

export function formatDate(date: string | Date): string {
  try {
    return format(new Date(date), 'MMM d, yyyy')
  } catch {
    return ''
  }
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

/** True when a media_type value represents a video. Handles both bare
 *  'video' (what CreateModal stores) and MIME strings like 'video/mp4'. */
export function isVideoType(mediaType: string | null | undefined): boolean {
  if (!mediaType) return false
  const t = mediaType.toLowerCase()
  return t === 'video' || t.startsWith('video/')
}
