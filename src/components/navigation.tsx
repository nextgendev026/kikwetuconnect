import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import {
  Home,
  Compass,
  Layers,
  Bell,
  Bookmark,
  User,
  Plus,
  Search,
  Moon,
  Sun,
} from 'lucide-react'
import { Button } from '@/components/ui/form'

const navItems = [
  { href: '/feed', label: 'Home', icon: Home },
  { href: '/baraza', label: 'Baraza', icon: Compass },
  { href: '/topics', label: 'Topics', icon: Layers },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
  { href: '/profile', label: 'Profile', icon: User },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="nav">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={clsx(
            'nav-item',
            pathname === item.href && 'active'
          )}
        >
          <item.icon className="w-5 h-5" />
          {item.label}
        </Link>
      ))}
    </nav>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function TopBar() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
      setSearchQuery('')
    }
  }

  return (
    <header className="topbar">
      <form onSubmit={handleSearch} className="search">
        <Search className="w-4 h-4 text-faint" />
        <input
          type="text"
          placeholder="Global Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent border-0 outline-none text-sm placeholder:text-quiet"
        />
      </form>
      <div className="tools flex items-center gap-2">
        <button className="icon w-9 h-9 rounded-full bg-transparent text-quiet flex items-center justify-center hover:bg-surface hover:text-text transition-colors">
          <Globe className="w-5 h-5" />
        </button>
        <button className="icon w-9 h-9 rounded-full bg-transparent text-quiet flex items-center justify-center hover:bg-surface hover:text-text transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red rounded-full"></span>
        </button>
        <button className="icon w-9 h-9 rounded-full bg-transparent text-quiet flex items-center justify-center hover:bg-surface hover:text-text transition-colors">
          <User className="w-5 h-5" />
        </button>
        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          className="ml-2"
        >
          Create
        </Button>
      </div>
    </header>
  )
}

import { Globe } from 'lucide-react'

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="bottom">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={clsx(
            'navbtn',
            pathname === item.href && 'active'
          )}
        >
          <item.icon className="w-5 h-5" />
          <span>{item.label}</span>
        </Link>
      ))}
      <Link href="/create" className="navbtn compose">
        <Plus className="w-5 h-5" />
        <span>Create</span>
      </Link>
    </nav>
  )
}

export function ThemeToggle() {
  return (
    <button
      id="theme"
      className="w-10 h-10 rounded-full bg-surface border border-line flex items-center justify-center text-muted hover:bg-surface-2 hover:text-text transition-colors"
      title="Toggle light mode"
    >
      <Sun className="w-5 h-5" />
    </button>
  )
}