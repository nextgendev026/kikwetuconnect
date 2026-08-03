'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSupabase, useUser } from '@/app/providers'
import { ArrowLeft, Users, UserPlus, Loader2 } from 'lucide-react'

const s = {
  card: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20, boxShadow: 'var(--card-shadow)' },
}

interface Follower {
  user_id: string; profiles: { id: string; full_name: string; username: string; avatar_url: string | null } | null
}

export default function FollowersPage() {
  const { profile, loading: userLoading } = useUser()
  const supabase = useSupabase()
  const router = useRouter()
  const [tab, setTab] = useState<'followers' | 'following'>('followers')
  const [followers, setFollowers] = useState<Follower[]>([])
  const [following, setFollowing] = useState<Follower[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userLoading) return
    if (!profile) return router.push('/login')
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoading, profile])

  const fetchData = async () => {
    try {
      const [followersRes, followingRes] = await Promise.all([
        supabase.from('follows').select('follower_id, profiles:follower_id(id, full_name, username, avatar_url)').eq('following_id', profile!.id),
        supabase.from('follows').select('following_id, profiles:following_id(id, full_name, username, avatar_url)').eq('follower_id', profile!.id),
      ])
      if (followersRes.data) setFollowers(followersRes.data.map((f: any) => ({ user_id: f.follower_id, profiles: f.profiles })))
      if (followingRes.data) setFollowing(followingRes.data.map((f: any) => ({ user_id: f.following_id, profiles: f.profiles })))
    } catch {} finally { setLoading(false) }
  }

  if (loading || userLoading) return <div className="flex items-center justify-center min-h-[80vh]"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--green)' }} /></div>

  const items = tab === 'followers' ? followers : following

  return (
    <div className="pb-8 animate-fade-in-up" style={{ maxWidth: 600 }}>
      <button onClick={() => router.push('/profile')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 11, fontSize: 12, background: 'var(--raised)', color: 'var(--ink)', border: '1px solid var(--line)', cursor: 'pointer', marginBottom: 16 }}>
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Profile
      </button>

      <div className="flex items-center gap-3 mb-5">
        <Users className="w-6 h-6" style={{ color: 'var(--green)' }} />
        <h1 className="page-title" style={{ margin: 0 }}>Followers</h1>
      </div>

      <div className="flex border-b border-[var(--line)] mb-4">
        <button onClick={() => setTab('followers')}
          style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: 600, background: 'none', border: 0, borderBottom: tab === 'followers' ? '2px solid var(--green)' : '2px solid transparent', cursor: 'pointer', color: tab === 'followers' ? 'var(--green)' : 'var(--muted)' }}>
          Followers ({followers.length})
        </button>
        <button onClick={() => setTab('following')}
          style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: 600, background: 'none', border: 0, borderBottom: tab === 'following' ? '2px solid var(--green)' : '2px solid transparent', cursor: 'pointer', color: tab === 'following' ? 'var(--green)' : 'var(--muted)' }}>
          Following ({following.length})
        </button>
      </div>

      {items.length === 0 ? (
        <div style={s.card} className="text-center py-12">
          <UserPlus className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--muted)', opacity: 0.3 }} />
          <p className="text-sm" style={{ color: 'var(--muted)' }}>{tab === 'followers' ? 'No followers yet' : 'Not following anyone'}</p>
        </div>
      ) : (
        <div className="space-y-1">
          {items.map(item => {
            const p = item.profiles
            if (!p) return null
            return (
              <Link key={item.user_id} href={`/profile/${p.username || p.id}`}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 11, textDecoration: 'none', transition: 'background .15s' }}
                className="hover:bg-night2">
                <div className="w-9 h-9 rounded-full grid place-items-center text-xs font-bold flex-shrink-0" style={{ background: 'var(--earth)', color: 'var(--gold)' }}>
                  {(p.full_name || p.username || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{p.full_name || p.username}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>@{p.username}</p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
