'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Search, MessageSquare, User, Plus } from 'lucide-react'

const items = [
  { href: '/feed', label: 'Home', icon: Home },
  { href: '/explore', label: 'Explore', icon: Search },
  { href: '#create', label: '', icon: Plus, isPlus: true },
  { href: '/messages', label: 'Inbox', icon: MessageSquare },
  { href: '/profile', label: 'You', icon: User },
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
        const Icon = i.icon
        if (i.isPlus) {
          return (
            <button key={i.href} className="plus" onClick={() => document.dispatchEvent(new CustomEvent('open-create-modal'))}>
              <Plus className="w-5 h-5" />
            </button>
          )
        }
        const active = isActive(i.href)
        return (
          <Link key={i.href} href={i.href} className={active ? 'active' : ''} style={{ textDecoration: 'none' }}>
            <Icon className="w-5 h-5" />
            <span>{i.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
