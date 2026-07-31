import { Sprout, Cpu, Ship, BookOpen, Coins, Leaf, Building2, Microscope, Scale, HeartPulse, Users, Landmark, Hash, Briefcase, Music, Globe } from 'lucide-react'

export const SPACE_CATEGORIES = ['All', 'Agriculture', 'Technology', 'Business', 'Education', 'Finance', 'Health', 'Culture', 'Legal', 'Politics', 'Community', 'Biashara', 'Sports', 'Music', 'General']

export const SPACE_CATEGORY_META: Record<string, { gradient: string; icon: any; emoji: string; color: string }> = {
  Agriculture: { gradient: 'linear-gradient(135deg, #2d6a4f, #52b788)', icon: Sprout, emoji: '🌾', color: '#2d6a4f' },
  Technology: { gradient: 'linear-gradient(135deg, #1a1a2e, #16213e)', icon: Cpu, emoji: '💻', color: '#302b63' },
  Business: { gradient: 'linear-gradient(135deg, #b8860b, #daa520)', icon: Ship, emoji: '💼', color: '#b8860b' },
  Biashara: { gradient: 'linear-gradient(135deg, #b8860b, #daa520)', icon: Briefcase, emoji: '💰', color: '#b8860b' },
  Education: { gradient: 'linear-gradient(135deg, #6c5ce7, #a29bfe)', icon: BookOpen, emoji: '📚', color: '#6c5ce7' },
  Finance: { gradient: 'linear-gradient(135deg, #00b894, #00cec9)', icon: Coins, emoji: '💵', color: '#00b894' },
  Health: { gradient: 'linear-gradient(135deg, #e17055, #fab1a0)', icon: HeartPulse, emoji: '🏥', color: '#e17055' },
  Culture: { gradient: 'linear-gradient(135deg, #6c5ce7, #fd79a8)', icon: Building2, emoji: '🎭', color: '#fd79a8' },
  Legal: { gradient: 'linear-gradient(135deg, #2c3e50, #3498db)', icon: Scale, emoji: '⚖️', color: '#2c3e50' },
  Politics: { gradient: 'linear-gradient(135deg, #2c3e50, #e17055)', icon: Landmark, emoji: '🏛️', color: '#c94b4b' },
  Community: { gradient: 'linear-gradient(135deg, #0f3460, #538392)', icon: Users, emoji: '🤝', color: '#0f3460' },
  General: { gradient: 'linear-gradient(135deg, #2d6a4f, #7fb069)', icon: Hash, emoji: '🌍', color: '#2d6a4f' },
  Sports: { gradient: 'linear-gradient(135deg, #1b4332, #95d5b2)', icon: Leaf, emoji: '⚽', color: '#1b4332' },
  Music: { gradient: 'linear-gradient(135deg, #6c5ce7, #b57295)', icon: Music, emoji: '🎵', color: '#b57295' },
}

export const DEFAULT_SPACE_META = SPACE_CATEGORY_META.General

export function spaceCategoryMeta(category?: string | null) {
  if (!category) return DEFAULT_SPACE_META
  const key = Object.keys(SPACE_CATEGORY_META).find(k => k.toLowerCase() === category.toLowerCase())
  return (key && SPACE_CATEGORY_META[key]) || DEFAULT_SPACE_META
}

const EMOJI_RE = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{2705}\u{00A9}\u{00AE}]/u

export function validSpaceIcon(icon?: string | null) {
  if (!icon) return null
  const trimmed = icon.trim().replace(/\uFE0F/g, '').replace(/\u200D.*/g, '')
  if (trimmed === '#' || trimmed.length === 0) return null
  const chars = Array.from(trimmed)
  if (chars.length > 2) return null
  return chars.some(c => EMOJI_RE.test(c)) || chars.some(c => /[\p{L}\p{N}]/u.test(c) && !/^[A-Za-z0-9]$/.test(c)) ? trimmed : null
}

export function resolveSpaceIcon(icon?: string | null, category?: string | null) {
  return validSpaceIcon(icon) || spaceCategoryMeta(category).emoji
}
