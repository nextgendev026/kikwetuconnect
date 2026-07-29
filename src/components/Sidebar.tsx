'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Home, Compass, Search, Grid3X3, GraduationCap, Briefcase,
  MessageSquare, Calendar, Store, Shield, Trophy,
  Wallet, User, Settings, Zap, LogOut, Sparkles
} from 'lucide-react'

const sections = [
  { label: 'Main', items: [
    { href: '/feed', label: 'Home', icon: Home },
    { href: '/baraza', label: 'Baraza', icon: Compass },
    { href: '/explore', label: 'Explore', icon: Search },
    { href: '/spaces', label: 'Spaces', icon: Grid3X3 },
  ]},
  { label: 'Guidance', items: [
    { href: '/students', label: 'Students Area', icon: GraduationCap },
    { href: '/professionals', label: 'Professionals', icon: Briefcase },
    { href: '/messages', label: 'Messages', icon: MessageSquare },
    { href: '/sessions', label: 'My sessions', icon: Calendar },
  ]},
  { label: 'Community', items: [
    { href: '/market', label: 'Mtaa Exchange', icon: Store },
    { href: '/nyumba', label: 'Nyumba Kumi', icon: Shield },
    { href: '/quizzes', label: 'Quizzes', icon: Trophy },
  ]},
  { label: 'You', items: [
    { href: '/wallet', label: 'Wallet & tips', icon: Wallet },
    { href: '/profile', label: 'Profile', icon: User },
    { href: '/settings', label: 'Settings', icon: Settings },
    { href: '/admin/dashboard', label: 'Admin console', icon: Zap, adminOnly: true },
  ]},
]

const navLinkStyle = (isActive: boolean): React.CSSProperties => ({
  height: 42,
  borderRadius: 11,
  background: isActive ? 'var(--gold)' : 'none',
  color: isActive ? 'var(--night)' : 'var(--faint)',
  textAlign: 'left',
  padding: '0 12px',
  fontSize: 12,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  fontWeight: isActive ? 700 : 400,
  textDecoration: 'none',
  transition: 'transform .2s var(--ease), background .2s var(--ease)',
})

export default function Sidebar({ initials, profile, theme, toggleTheme }: { initials: string; profile: any; theme: string; toggleTheme: () => void }) {
  const path = usePathname()
  const isAdmin = profile?.role === 'admin'

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

      {/* Global tools */}
      <div className="global-tools">
        <div className="global-tools-label flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" /> Global navigation
        </div>
        <div className="theme-toggle">
          <button className={theme === 'light' ? 'active' : ''} onClick={() => theme !== 'light' && toggleTheme()}>☼ Light</button>
          <button className={theme === 'dark' ? 'active' : ''} onClick={() => theme !== 'dark' && toggleTheme()}>◐ Dark</button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="nav">
        {sections.map(s => (
          <div key={s.label}>
            <div className="nav-label">{s.label}</div>
            {s.items.filter(i => !i.adminOnly || isAdmin).map(i => {
              const Icon = i.icon
              const isActive = path === i.href || (i.href !== '/feed' && path.startsWith(i.href))
              return (
                <Link key={i.href} href={i.href} style={navLinkStyle(isActive)}>
                  <Icon className="w-4 h-4" />
                  <span style={{ flex: 1 }}>{i.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User mini */}
      <div className="user-mini" style={{ marginTop: 'auto' }}>
        <div className="avatar">{initials}</div>
        <div style={{ flex: 1 }}>
          <strong>{profile?.full_name || profile?.username || 'User'}</strong>
          <small><span className="online" style={{ verticalAlign: -1, marginRight: 4 }} />Online · {profile?.county_hub || 'Kenya'}</small>
        </div>
        <Link href="/logout" className="icon" title="Log out" style={{ color: 'var(--muted)', textDecoration: 'none' }}>
          <LogOut className="w-4 h-4" />
        </Link>
      </div>
    </aside>
  )
}
