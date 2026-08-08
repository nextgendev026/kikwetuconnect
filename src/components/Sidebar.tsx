'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSupabase, useUser, toast } from '@/app/providers'
import { isAdmin, ROLES } from '@/lib/roles'
import FeedAd from '@/components/FeedAd'
import {
  Home, Compass, Search, Grid3X3, GraduationCap, Briefcase,
  MessageSquare, Calendar, Store, Shield, Trophy,
  Wallet, User, Settings, Zap, LogOut, MessageCircle, Heart,
  ChevronLeft, ChevronRight, Sparkles
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

const navLinkStyle = (isActive: boolean, collapsed: boolean): React.CSSProperties => ({
  height: 40,
  borderRadius: 11,
  background: isActive ? 'var(--gold)' : 'none',
  color: isActive ? 'var(--night)' : 'oklch(72% .025 151)',
  textAlign: 'left',
  padding: collapsed ? 0 : '0 12px',
  fontSize: 12,
  display: 'flex',
  alignItems: 'center',
  justifyContent: collapsed ? 'center' : undefined,
  gap: collapsed ? 0 : 9,
  fontWeight: isActive ? 700 : 400,
  textDecoration: 'none',
  transition: 'transform .2s var(--ease), background .2s var(--ease)',
})

export default function Sidebar({ initials, profile, following = [], onlineIds = new Set<string>(), collapsed = false, onToggle }: {
  initials: string; profile: any
  following?: any[]; onlineIds?: Set<string>
  collapsed?: boolean; onToggle?: () => void
}) {
  const path = usePathname()
  const adminUser = isAdmin(profile?.role)
  const supabase = useSupabase()
  const { user } = useUser()
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set())
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [tab, setTab] = useState<'following' | 'suggested'>('following')

  // Sync heart-button state with the following list passed from AppShell
  useEffect(() => {
    setFollowingSet(new Set(following.map(u => u.id)))
  }, [following])

  // Fetch recommended users to follow (region / interests / likes based)
  const loadSuggestions = async () => {
    if (!user) return
    setSuggestionsLoading(true)
    try {
      const { data } = await supabase.rpc('get_user_recommendations', { p_limit: 8 })
      setSuggestions(Array.isArray(data) ? data : [])
    } catch { setSuggestions([]) }
    finally { setSuggestionsLoading(false) }
  }

  useEffect(() => {
    if (user && (suggestions.length === 0 || tab === 'suggested')) loadSuggestions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tab])

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
      setFollowingSet(prev => { const n = new Set(prev); n.add(userId); return n })
      setSuggestions(prev => prev.filter(s => s.id !== userId))
      toast('Following')
    } else {
      setFollowingSet(prev => { const n = new Set(prev); n.delete(userId); return n })
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
        <div className="mark">k</div>
        <div>
          <b>kikwetu<span style={{ color: 'var(--gold)' }}>.</span></b>
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
                <Link key={i.href} href={i.href} style={navLinkStyle(isActive, collapsed)}>
                  <Icon className={`icon ${i.iconClass || ''} w-3.5 h-3.5`} />
                  <span style={{ flex: 1 }}>{i.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
        {typeof onToggle === 'function' && (
          <button
            onClick={onToggle}
            style={navLinkStyle(false, collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <ChevronRight className="icon w-3.5 h-3.5" /> : <ChevronLeft className="icon w-3.5 h-3.5" />}
            <span style={{ flex: 1 }}>{collapsed ? 'Expand' : 'Collapse'}</span>
          </button>
        )}
      </nav>

      {/* Your network — Following + Suggested tabs */}
      <div className="live-users" style={{ marginTop: 12, padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8, padding: '0 2px' }}>
          {(['following', 'suggested'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '6px 8px', borderRadius: 8, border: 0, cursor: 'pointer',
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em',
                background: tab === t ? 'var(--gold)' : 'none',
                color: tab === t ? 'var(--night)' : 'oklch(72% .025 151)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                transition: 'all .2s var(--ease)',
              }}>
              {t === 'suggested' && <Sparkles className="w-3 h-3" />}
              {t === 'following' && <span style={{ width: 7, height: 7, borderRadius: '50%', background: tab === t ? 'var(--night)' : 'var(--green)', boxShadow: tab === t ? 'none' : '0 0 5px var(--green)' }} />}
              {t === 'following' ? `Following · ${following.filter(u => onlineIds.has(u.id)).length} online` : 'Suggestions'}
            </button>
          ))}
        </div>

        {tab === 'following' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 280, overflowY: 'auto' }}>
            {following.length === 0 ? (
              <small style={{ fontSize: 10, padding: '4px 8px' }}>Follow people to build your community</small>
            ) : following.slice(0, 12).map((u: any) => {
              const isOnline = onlineIds.has(u.id)
              return (
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
                    <span style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: isOnline ? 'var(--green)' : 'var(--faint)', border: '2px solid var(--surface)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                     <Link href={`/profile/${u.username || u.id}`} style={{ fontWeight: 700, fontSize: 11, color: 'var(--ink)', textDecoration: 'none', display: 'block', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.full_name || u.username}
                    </Link>
                    <small style={{ fontSize: 9, color: isOnline ? 'var(--green)' : 'var(--muted)' }}>{isOnline ? 'Online' : (u.county_hub || 'Offline')}{u.is_verified_expert ? ' ✓' : ''}</small>
                  </div>
                  <div style={{ display: 'flex', gap: 3, flex: 'none' }}>
                    <button onClick={(e) => handleFollow(u.id, e)}
                      style={{
                        width: 26, height: 26, borderRadius: 7, border: 0, cursor: 'pointer', display: 'grid', placeItems: 'center',
                        background: followingSet.has(u.id) ? 'var(--gold)' : 'var(--raised)',
                        color: followingSet.has(u.id) ? 'var(--night)' : 'var(--muted)',
                        fontSize: 11, transition: 'all .15s',
                      }}
                      title={followingSet.has(u.id) ? 'Unfollow' : 'Follow'}>
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
              )
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 300, overflowY: 'auto' }}>
            {suggestionsLoading ? (
              <small style={{ fontSize: 10, padding: '4px 8px' }}>Finding people…</small>
            ) : suggestions.length === 0 ? (
              <>
                <small style={{ fontSize: 10, padding: '4px 8px' }}>No suggestions yet.</small>
                <button onClick={() => loadSuggestions()} style={{
                  fontSize: 10, fontWeight: 700, textAlign: 'left', background: 'none', border: 0,
                  color: 'var(--gold)', cursor: 'pointer', padding: '4px 8px',
                }}>↻ Refresh suggestions</button>
              </>
            ) : suggestions.slice(0, 8).map((u: any) => {
              const isFollowing = followingSet.has(u.id)
              return (
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
                  </div>
                  <Link href={`/profile/${u.username || u.id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}>
                    <span style={{ display: 'block', fontWeight: 700, fontSize: 11, color: 'var(--ink)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.full_name || u.username}
                    </span>
                    {u.reason ? (
                      <small style={{ fontSize: 8, color: 'var(--gold)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.reason}</small>
                    ) : (
                      <small style={{ fontSize: 9, color: 'var(--muted)', display: 'block' }}>{u.county_hub || 'Kenya'}{u.is_verified_expert ? ' ✓' : ''}</small>
                    )}
                  </Link>
                  <button onClick={(e) => handleFollow(u.id, e)}
                    style={{
                      flex: 'none', padding: '4px 10px', borderRadius: 7, border: 0, cursor: 'pointer',
                      fontWeight: 700, fontSize: 10,
                      background: isFollowing ? 'var(--raised)' : 'var(--gold)',
                      color: isFollowing ? 'var(--muted)' : 'var(--night)',
                      transition: 'all .15s',
                    }}>
                    {isFollowing ? '✓' : 'Follow'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Sidebar ad slot */}
      {!collapsed && <section id="sidebar-ad" style={{ margin: '10px 0 0', flex: 'none' }}><FeedAd placement="sidebar" compact /></section>}

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
