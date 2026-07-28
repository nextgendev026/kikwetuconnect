'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const items = [
  { href: '/feed', label: 'Home', icon: '⌂' },
  { href: '/explore', label: 'Explore', icon: '⌕' },
  { href: '#create', label: '', icon: '+', isPlus: true },
  { href: '/messages', label: 'Inbox', icon: '◍' },
  { href: '/profile', label: 'You', icon: '◉' },
]

export default function MobileNav() {
  const path = usePathname()
  const isActive = (href: string) => {
    if (href === '/feed') return path === '/feed'
    return path.startsWith(href)
  }

  return (
    <nav className="bottom">
      {items.map(i => {
        if (i.isPlus) {
          return (
            <button key={i.href} className="plus" onClick={() => document.dispatchEvent(new CustomEvent('open-create-modal'))}>
              ＋
            </button>
          )
        }
        const active = isActive(i.href)
        return (
          <Link key={i.href} href={i.href} className={active ? 'active' : ''} style={{ textDecoration: 'none' }}>
            {i.icon}
            <span>{i.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
