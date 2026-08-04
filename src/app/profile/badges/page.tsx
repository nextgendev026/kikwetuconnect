'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase, useUser, toast } from '@/app/providers'
import { ArrowLeft, Award, Loader2, Trophy, Star, Crown, Shield, Leaf } from 'lucide-react'

const ANIMAL_BADGE_COLORS: Record<string, string> = {
  '🦅': 'var(--blue)',
  '🦒': 'var(--gold)',
  '🦁': 'var(--earth)',
  '🐆': 'var(--green)',
  '🦓': 'var(--blue)',
  '🦩': 'var(--earth)',
  '🐘': 'var(--green)',
  '🦏': 'var(--earth)',
  '🐃': 'var(--gold)',
  '🏆': 'var(--gold)',
  '🎯': 'var(--green)',
  '💬': 'var(--blue)',
  '🤝': 'var(--gold)',
  '🔥': 'var(--red)',
  '🎓': 'var(--earth)',
  '⭐': 'var(--gold)',
  '🧠': 'var(--blue)',
  '👑': 'var(--gold)',
  '🛡️': 'var(--blue)',
  '🌿': 'var(--green)',
}

const TIER_INFO: Record<string, { name: string; minPoints: number; color: string; icon: string }> = {
  novice: { name: 'Novice', minPoints: 0, color: 'var(--muted)', icon: '🐣' },
  explorer: { name: 'Explorer', minPoints: 100, color: 'var(--blue)', icon: '🦓' },
  scholar: { name: 'Scholar', minPoints: 500, color: 'var(--gold)', icon: '🦒' },
  sage: { name: 'Sage', minPoints: 1000, color: 'var(--green)', icon: '🦅' },
  expert: { name: 'Expert', minPoints: 5000, color: 'var(--earth)', icon: '🦁' },
}

interface Badge {
  id: string
  name: string
  description: string
  icon: string
  requirement_type: string
  requirement_value: number
  awarded_at: string
}

export default function BadgesPage() {
  const { profile, loading: userLoading } = useUser()
  const supabase = useSupabase()
  const router = useRouter()
  const [userBadges, setUserBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (userLoading) return
    if (!profile) return router.push('/login')
    fetchBadges()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoading, profile])

  const fetchBadges = async () => {
    try {
      const { data } = await supabase
        .from('user_badges')
        .select('awarded_at, badges:badge_id(id, name, description, icon, requirement_type, requirement_value)')
        .eq('user_id', profile!.id)
        .order('awarded_at', { ascending: false })
      if (data) {
        setUserBadges(data.map((b: any) => ({
          id: b.badges?.id,
          name: b.badges?.name || 'Unknown',
          description: b.badges?.description || '',
          icon: b.badges?.icon || '🏅',
          requirement_type: b.badges?.requirement_type || '',
          requirement_value: b.badges?.requirement_value || 0,
          awarded_at: b.awarded_at,
        })).filter(b => b.id))
      }
    } catch (e: any) {
      toast(e.message || 'Failed to load badges')
    } finally {
      setLoading(false)
    }
  }

  const handleBadgeClick = (badge: Badge) => {
    if (badge.requirement_type === 'heshima_points') {
      toast(`${badge.name}: Reach ${badge.requirement_value} Heshima points\n${badge.description}`)
    }
  }

  if (loading || userLoading) return <div className="flex items-center justify-center min-h-[80vh]"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--green)' }} /></div>

  const heshima = profile?.heshima_rating || 0
  const currentTier = Object.values(TIER_INFO).filter(t => heshima >= t.minPoints).slice(-1)[0] || TIER_INFO.novice
  const nextTier = Object.values(TIER_INFO).find(t => t.minPoints > heshima) || TIER_INFO.expert
  const progressPct = nextTier.minPoints === currentTier.minPoints ? 100 : Math.min(100, ((heshima - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100)

  return (
    <div className="pb-8 animate-fade-in-up" style={{ maxWidth: 640 }}>
      <button onClick={() => router.push('/profile')}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium mb-6 transition-colors"
        style={{ background: 'var(--raised)', color: 'var(--ink)', border: '1px solid var(--line)' }}>
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Profile
      </button>

      <div className="flex items-center gap-4 mb-6">
        <div className="text-5xl">{currentTier.icon}</div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>Your Badges</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Savannah wildlife badge progression</p>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{currentTier.icon}</span>
            <span className="font-bold" style={{ color: currentTier.color }}>{currentTier.name}</span>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>· {heshima} Heshima</span>
          </div>
          <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Next: {nextTier.icon} {nextTier.name} at {nextTier.minPoints}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--raised)' }}>
          <div className="h-full transition-all duration-500 rounded-full" style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${currentTier.color}, ${nextTier.color})` }} />
        </div>
      </div>

      {userBadges.length === 0 ? (
        <div className="text-center py-12" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16 }}>
          <Award className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--muted)', opacity: 0.3 }} />
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>No badges yet</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Earn badges by contributing to the community — answering questions, posting, and completing quizzes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(showAll ? userBadges : userBadges.slice(0, 9)).map(badge => {
            const color = ANIMAL_BADGE_COLORS[badge.icon] || 'var(--gold)'
            return (
              <button
                key={badge.id}
                onClick={() => handleBadgeClick(badge)}
                className="group text-center p-4 rounded-xl transition-all duration-200 card-hover"
                style={{
                  background: 'color-mix(in oklab, var(--gold) 4%, var(--surface))',
                  border: '1px solid color-mix(in oklab, var(--gold) 25%, var(--line))',
                }}
                aria-label={`Badge: ${badge.name} - ${badge.description}`}
              >
                <div className="text-3xl mb-2">{badge.icon}</div>
                <p className="font-bold text-sm" style={{ color: 'var(--ink)' }}>{badge.name}</p>
                <p className="text-[10px] mt-1" style={{ color: 'var(--muted)', lineHeight: 1.4 }}>{badge.description}</p>
                {badge.requirement_type === 'heshima_points' && (
                  <div className="mt-2 text-xs font-semibold" style={{ color: color }}>
                    {badge.requirement_value} pts
                  </div>
                )}
                {badge.requirement_type === 'quizzes_completed' && (
                  <div className="mt-2 text-xs font-semibold" style={{ color: color }}>
                    {badge.requirement_value} quizzes
                  </div>
                )}
                <div className="mt-1 text-[9px]" style={{ color: 'var(--faint-accessible)' }}>
                  {new Date(badge.awarded_at).toLocaleDateString()}
                </div>
                <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-[9px]" style={{ color: 'var(--muted)' }}>
                  Click for details
                </div>
              </button>
            )
          })}
        </div>
      )}

      {userBadges.length > 9 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-4 w-full text-center text-sm font-medium"
          style={{ color: 'var(--gold)' }}
        >
          {showAll ? 'Show fewer' : `Show all ${userBadges.length} badges`}
        </button>
      )}

      <div className="mt-8 pt-6 border-t" style={{ borderTopColor: 'var(--line)' }}>
        <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--ink)' }}>Badge Progression</h2>
        <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
          Earn Heshima points by getting upvotes, completing quizzes, and contributing answers. Each milestone unlocks a new savannah wildlife badge.
        </p>
        <div className="space-y-2">
          {Object.values(TIER_INFO).map(tier => {
            const unlocked = heshima >= tier.minPoints
            const color = tier.color
            return (
              <div key={tier.name} className="flex items-center gap-3 text-sm">
                <span className="text-xl w-8 text-center">{unlocked ? tier.icon : '⚪'}</span>
                <span className="font-medium" style={{ color: unlocked ? color : 'var(--muted)' }}>{tier.name}</span>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>{tier.minPoints} Heshima</span>
                {unlocked && tier.name === currentTier.name && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: color, color: 'var(--night)' }}>Current</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
