'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@/app/providers'
import { useEffect, useState } from 'react'

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
  ]},
]

export default function Sidebar() {
  const path = usePathname()
  const { profile } = useUser()
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (saved) setTheme(saved)
  }, [])

  const toggleTheme = (t: 'light' | 'dark') => {
    setTheme(t)
    localStorage.setItem('theme', t)
    document.documentElement.setAttribute('data-theme', t)
  }

  const initials = (profile?.full_name || profile?.username || 'U').slice(0, 2).toUpperCase()

  return (
    <aside className="hidden md:flex flex-col w-[220px] border-r border-[oklch(28%_.025_151)] p-[25px_15px] min-h-[calc(100vh-68px)] overflow-y-auto bg-night text-cream flex-none">
      {sections.map(s => (
        <div key={s.label} className="mb-[4px]">
          <div className="text-[10px] tracking-[.13em] uppercase text-[oklch(57%_.025_151)] px-[10px] mb-[2px] mt-[7px]">{s.label}</div>
          {s.items.map(i => {
            const isActive = path === i.href || (i.href !== '/feed' && path.startsWith(i.href))
            return (
              <Link key={i.href} href={i.href} className={`flex items-center gap-[10px] h-[42px] px-[12px] rounded-[11px] text-[12px] mb-[1px] no-underline transition-[transform_background_color] duration-200 ${isActive ? 'bg-gold text-night font-bold' : 'text-[oklch(73%_.025_151)] hover:bg-[oklch(25%_.03_151)] hover:text-cream hover:translate-x-[2px]'}`}>
                <span className="text-[16px] flex-none">{i.icon}</span>
                <span className="truncate">{i.label}</span>
              </Link>
            )
          })}
        </div>
      ))}
      <div className="mt-auto">
        <div className="flex gap-[4px] bg-[oklch(23%_.03_151)] p-[4px] rounded-[11px] mb-[12px]">
          <button onClick={() => toggleTheme('light')} className={`flex-1 rounded-[8px] py-[8px] text-[10px] font-bold ${theme === 'light' ? 'bg-gold text-night' : 'bg-transparent text-[oklch(72%_.02_151)]'}`}>☼ Light</button>
          <button onClick={() => toggleTheme('dark')} className={`flex-1 rounded-[8px] py-[8px] text-[10px] font-bold ${theme === 'dark' ? 'bg-gold text-night' : 'bg-transparent text-[oklch(72%_.02_151)]'}`}>◐ Dark</button>
        </div>
        <div className="flex items-center gap-[9px] p-[11px_8px] border-t border-[oklch(30%_.025_151)]">
          <div className="w-[36px] h-[36px] rounded-full grid place-items-center flex-none bg-earth text-gold font-extrabold text-[11px]">{initials}</div>
          <div className="flex-1 min-w-0">
            <strong className="text-[12px] block truncate">{profile?.full_name || profile?.username || 'User'}</strong>
            <small className="text-[10px] text-[oklch(68%_.02_151)] block mt-[3px] truncate"><span className="w-[8px] h-[8px] rounded-full bg-green inline-block mr-[5px]" style={{ boxShadow: '0 0 0 3px oklch(27% .055 151)' }}></span>Online · {profile?.county_hub || 'Kenya'}</small>
          </div>
          <Link href="/logout" className="w-[42px] h-[42px] grid place-items-center rounded-[12px] text-[oklch(65%_.028_151)] no-underline hover:text-cream" title="Log out">↪</Link>
        </div>
      </div>
    </aside>
  )
}
