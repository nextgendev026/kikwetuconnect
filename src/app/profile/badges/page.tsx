'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase, useUser } from '@/app/providers'
import { ArrowLeft, Award, Loader2 } from 'lucide-react'

const s = {
  card: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20, boxShadow: 'var(--card-shadow)' },
  safariCard: {
    position: 'relative' as const,
    overflow: 'hidden',
    borderRadius: 16,
    padding: '18px 14px',
    border: '1px solid color-mix(in oklab, var(--gold) 28%, var(--line))',
    background: 'linear-gradient(160deg, color-mix(in oklab, var(--gold) 22%, var(--surface)) 0%, color-mix(in oklab, var(--earth) 16%, var(--surface)) 55%, color-mix(in oklab, var(--green) 10%, var(--surface)) 100%)',
    boxShadow: 'var(--card-shadow)',
  },
  safariIcon: {
    width: 58,
    height: 58,
    borderRadius: '50%',
    display: 'grid',
    placeItems: 'center',
    margin: '0 auto 10px',
    fontSize: 30,
    background: 'color-mix(in oklab, var(--gold) 18%, var(--surface))',
    border: '1px solid color-mix(in oklab, var(--gold) 35%, transparent)',
    boxShadow: '0 0 0 3px color-mix(in oklab, var(--gold) 10%, transparent)',
  },
}

interface Badge {
  id: string; name: string; description: string; icon: string; awarded_at: string
}

export default function BadgesPage() {
  const { profile, loading: userLoading } = useUser()
  const supabase = useSupabase()
  const router = useRouter()
  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userLoading) return
    if (!profile) return router.push('/login')
    fetchBadges()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoading, profile])

  const fetchBadges = async () => {
    try {
      const { data } = await supabase.from('user_badges')
        .select('badge_id, awarded_at, badges:badge_id(id, name, description, icon)')
        .eq('user_id', profile!.id).order('awarded_at', { ascending: false })
      if (data) {
        setBadges(data.map((b: any) => ({
          id: b.badges?.id || b.badge_id,
          name: b.badges?.name || 'Unknown',
          description: b.badges?.description || '',
          icon: b.badges?.icon || '🏅',
          awarded_at: b.awarded_at,
        })))
      }
    } catch {} finally { setLoading(false) }
  }

  if (loading || userLoading) return <div className="flex items-center justify-center min-h-[80vh]"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--green)' }} /></div>

  return (
    <div className="pb-8 animate-fade-in-up" style={{ maxWidth: 600 }}>
      <button onClick={() => router.push('/profile')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 11, fontSize: 12, background: 'var(--raised)', color: 'var(--ink)', border: '1px solid var(--line)', cursor: 'pointer', marginBottom: 16 }}>
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Profile
      </button>

      <h1 className="page-title flex items-center gap-3 mb-5">
        <Award className="w-6 h-6" style={{ color: 'var(--gold)' }} />
        Badges
      </h1>

      {badges.length === 0 ? (
        <div style={s.card} className="text-center py-12">
          <Award className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--muted)', opacity: 0.3 }} />
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>No badges yet</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Earn badges by contributing to the community</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {badges.map(badge => (
            <div key={badge.id} style={s.safariCard} className="text-center">
              <span style={s.safariIcon}>{badge.icon}</span>
              <p className="text-sm font-bold" style={{ color: 'var(--ink)' }}>{badge.name}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{badge.description}</p>
              <p className="text-[10px] mt-2" style={{ color: 'var(--muted)' }}>Earned {new Date(badge.awarded_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
