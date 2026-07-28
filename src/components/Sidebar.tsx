'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const sections = [
  { label: 'Main', items: [
    { href: '/feed', label: 'Home', icon: '⌂' },
    { href: '/baraza', label: 'Baraza', icon: '◌' },
    { href: '/explore', label: 'Explore', icon: '⌕' },
    { href: '/spaces', label: 'Spaces', icon: '▦' },
  ]},
  { label: 'Guidance', items: [
    { href: '/students', label: 'Students Area', icon: '◎' },
    { href: '/professionals', label: 'Professionals', icon: '✦' },
    { href: '/messages', label: 'Messages', icon: '◍' },
    { href: '/sessions', label: 'My sessions', icon: '□' },
  ]},
  { label: 'Community', items: [
    { href: '/market', label: 'Mtaa Exchange', icon: '▤' },
    { href: '/nyumba', label: 'Nyumba Kumi', icon: '♢' },
    { href: '/quizzes', label: 'Quizzes', icon: '♛' },
  ]},
  { label: 'You', items: [
    { href: '/wallet', label: 'Wallet & tips', icon: '◈' },
    { href: '/profile', label: 'Profile', icon: '◉' },
    { href: '/settings', label: 'Settings', icon: '⚙' },
    { href: '/admin/dashboard', label: 'Admin console', icon: '⚡', adminOnly: true },
  ]},
]

const navLinkStyle = (isActive: boolean): React.CSSProperties => ({
  height: 42,
  borderRadius: 11,
  background: isActive ? 'var(--gold)' : 'none',
  color: isActive ? 'var(--night)' : 'oklch(73% .025 151)',
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
    <aside className="sidebar">
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
        <div className="global-tools-label">Global navigation</div>
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
              const isActive = path === i.href || (i.href !== '/feed' && path.startsWith(i.href))
              return (
                <Link key={i.href} href={i.href} style={navLinkStyle(isActive)}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'oklch(25% .03 151)'; e.currentTarget.style.color = 'oklch(96% .012 91)'; e.currentTarget.style.transform = 'translateX(2px)' } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'oklch(73% .025 151)'; e.currentTarget.style.transform = 'none' } }}>
                  <span className="icon">{i.icon}</span>
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
        <Link href="/logout" className="icon" title="Log out" style={{ color: 'oklch(68% .02 151)', textDecoration: 'none', fontSize: 18 }}>↪</Link>
      </div>
    </aside>
  )
}
