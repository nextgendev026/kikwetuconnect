'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { toast, useSupabase } from '@/app/providers'
import { isAdmin, ROLES } from '@/lib/roles'
import {
  Home, Compass, Search, Grid3X3, GraduationCap, Briefcase,
  MessageSquare, Calendar, Store, Shield, Trophy,
  Wallet, User, Settings, Zap, LogOut, MessageCircle, Heart
} from 'lucide-react'

const sections = [
  { label: 'Main', items: [
    { href: '/feed', label: 'Home', icon: Home, iconClass: 'icon-home' },
    { href: '/baraza', label: 'Baraza', icon: Compass, iconClass: 'icon-compass' },
    { href: '/explore', label: 'Explore', icon: Search, iconClass: 'icon-search' },
    { href: '/spaces', label: 'Spaces', icon: Grid3X3, iconClass: 'icon-spaces' },
  ]},
  { label: 'Guidance', items: [
    { href: '/students', label: 'Students Area', icon: GraduationCap, iconClass: 'icon-students' },
    { href: '/experts', label: 'Experts', icon: Briefcase, iconClass: 'icon-professionals' },
    { href: '/messages', label: 'Messages', icon: MessageSquare, iconClass: 'icon-messages' },
    { href: '/sessions', label: 'My sessions', icon: Calendar, iconClass: 'icon-sessions' },
  ]},
  { label: 'Community', items: [
    { href: '/market', label: 'Mtaa Market', icon: Store, iconClass: 'icon-market' },
    { href: '/nyumba', label: 'Nyumba Kumi', icon: Shield, iconClass: 'icon-nyumba' },
    { href: '/quizzes', label: 'Quizzes', icon: Trophy, iconClass: 'icon-quizzes' },
  ]},
  { label: 'You', items: [
    { href: '/wallet', label: 'Wallet & tips', icon: Wallet, iconClass: 'icon-wallet' },
    { href: '/profile', label: 'Profile', icon: User, iconClass: 'icon-profile' },
    { href: '/settings', label: 'Settings', icon: Settings, iconClass: 'icon-settings' },
    { href: '/admin/dashboard', label: 'Admin console', icon: Zap, iconClass: 'icon-admin', adminOnly: true },
  ]},
]

const navLinkStyle = (isActive: boolean): React.CSSProperties => ({
  height: 40,
  borderRadius: 11,
  background: isActive ? 'var(--gold)' : 'none',
  color: isActive ? 'var(--night)' : 'oklch(72% .025 151)',
  textAlign: 'left',
  padding: '0 12px',
  fontSize: 12,
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  fontWeight: isActive ? 700 : 400,
  textDecoration: 'none',
  transition: 'transform .2s var(--ease), background .2s var(--ease)',
})

export default function Sidebar({ initials, profile, onlineCount = 0, onlineUsers = [] }: {
  initials: string; profile: any
  onlineCount?: number; onlineUsers?: any[]
}) {
  const path = usePathname()
  const adminUser = isAdmin(profile?.role)
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const supabase = useSupabase()

  // Recognize existing follow relationships so the follow buttons reflect real state
  useEffect(() => {
    if (!supabase || !profile?.id) return
    supabase.from('follows').select('following_id').eq('follower_id', profile.id)
      .then(({ data }) => {
        if (data) setFollowing(new Set((data as any[]).map(f => f.following_id)))
      })
  }, [supabase, profile?.id])

  const handleFollow = async (userId: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'follow', target_user_id: userId }),
    })
    if (!res.ok) return toast('Follow failed')
    const d = await res.json()
    if (d.following) {
      setFollowing(prev => { const n = new Set(prev); n.add(userId); return n })
      toast('Following')
    } else {
      setFollowing(prev => { const n = new Set(prev); n.delete(userId); return n })
      toast('Unfollowed')
    }
  }

  const handleMessage = (userId: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    window.location.href = `/messages?user=${userId}`
  }

  return (
    <aside className="sidebar animate-slide-in-left">
      {/* Brand */}
      <Link href="/feed" className="brand" style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="mark">K</div>
        <div>
          <b>KikwetuConnect</b>
          <small>Tuko pamoja</small>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="nav">
        {sections.map(s => (
          <div key={s.label}>
            <div className="nav-label">{s.label}</div>
            {s.items.filter(i => !i.adminOnly || adminUser).map(i => {
              const Icon = i.icon
              const isActive = path === i.href || (i.href !== '/feed' && path.startsWith(i.href))
              return (
                <Link key={i.href} href={i.href} style={navLinkStyle(isActive)}>
                  <Icon className={`icon ${i.iconClass || ''} w-3.5 h-3.5`} />
                  <span style={{ flex: 1 }}>{i.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Live users section */}
      <div style={{ marginTop: 12, padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, padding: '0 8px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)' }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Live — {onlineCount} online</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 280, overflowY: 'auto' }}>
          {onlineUsers.length === 0 ? (
            <small style={{ fontSize: 10, color: 'var(--faint)', padding: '4px 8px' }}>No one online right now</small>
          ) : onlineUsers.slice(0, 10).map((u: any) => (
            <div key={u.id} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
              borderRadius: 10, transition: 'background .2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--raised)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              <div style={{ position: 'relative', width: 30, height: 30, flex: 'none' }}>
                <div className="avatar" style={{ width: 30, height: 30, fontSize: 9, overflow: 'hidden' }}>
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.textContent = (u.full_name || u.username || '?').slice(0, 2).toUpperCase() }} />
                  ) : (u.full_name || u.username || '?').slice(0, 2).toUpperCase()}
                </div>
                <span style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', border: '2px solid var(--surface)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                 <Link href={`/profile/${u.username || u.id}`} style={{ fontWeight: 700, fontSize: 11, color: 'var(--ink)', textDecoration: 'none', display: 'block', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.full_name || u.username}
                </Link>
                <small style={{ fontSize: 9, color: 'var(--muted)' }}>{u.county_hub || 'Kenya'}{u.is_verified_expert ? ' ✓' : ''}</small>
              </div>
              <div style={{ display: 'flex', gap: 3, flex: 'none' }}>
                <button onClick={(e) => handleFollow(u.id, e)}
                  style={{
                    width: 26, height: 26, borderRadius: 7, border: 0, cursor: 'pointer', display: 'grid', placeItems: 'center',
                    background: following.has(u.id) ? 'var(--gold)' : 'var(--raised)',
                    color: following.has(u.id) ? 'var(--night)' : 'var(--muted)',
                    fontSize: 11, transition: 'all .15s',
                  }}
                  title={following.has(u.id) ? 'Unfollow' : 'Follow'}>
                  <Heart className="w-3 h-3" />
                </button>
                <button onClick={(e) => handleMessage(u.id, e)}
                  style={{
                    width: 26, height: 26, borderRadius: 7, border: 0, cursor: 'pointer', display: 'grid', placeItems: 'center',
                    background: 'var(--raised)', color: 'var(--muted)', fontSize: 11, transition: 'all .15s',
                  }}
                  title="Message">
                  <MessageCircle className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User mini */}
      <div className="user-mini" style={{ marginTop: 'auto' }}>
        <div className="avatar" style={{ position: 'relative', overflow: 'hidden' }}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.textContent = initials }} />
          ) : initials}
        </div>
        <div style={{ flex: 1 }}>
          <strong>{profile?.full_name || profile?.username || 'User'}</strong>
          <small><span className="online" style={{ verticalAlign: -1, marginRight: 4 }} />Online · {profile?.county_hub || 'Kenya'}</small>
        </div>
        <Link href="/logout" className="icon" title="Log out" style={{ color: 'var(--muted)', textDecoration: 'none' }}>
          <LogOut className="w-3.5 h-3.5" />
        </Link>
      </div>
    </aside>
  )
}
