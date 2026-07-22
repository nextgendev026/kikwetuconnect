'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Search, Bell, User, Plus, LogOut } from 'lucide-react'
import { clsx } from 'clsx'
import Image from 'next/image'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  const navItems = [
    { href: '/feed', label: 'Home', icon: '🏠' },
    { href: '/baraza', label: 'Baraza', icon: '🌍' },
    { href: '/topics', label: 'Topics', icon: '🏷️' },
    { href: '/search', label: 'Search', icon: '🔍' },
    { href: '/bookmarks', label: 'Bookmarks', icon: '🔖' },
    { href: '/notifications', label: 'Notifications', icon: '🔔' },
    { href: '/profile', label: 'Profile', icon: '👤' },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <div className="flex h-screen bg-bg">
      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed lg:static inset-y-0 left-0 z-40 w-64',
          'bg-surface border-r border-line-soft',
          'transform transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 p-6 border-b border-line-soft">
            <div className="w-10 h-10 bg-gradient-to-br from-green to-gold rounded-lg flex items-center justify-center font-bold text-bg">
              K
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm">Kikwetu</span>
              <span className="text-xs text-quiet">Connect</span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium',
                  'transition-all hover:bg-surface-2',
                  isActive(item.href)
                    ? 'bg-green text-bg'
                    : 'text-muted hover:text-text'
                )}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-line-soft space-y-2">
            <button className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-muted hover:text-text hover:bg-surface-2 transition-colors">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-surface border-b border-line-soft">
          <div className="flex items-center justify-between h-16 px-6">
            {/* Left */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-surface-2 rounded-lg transition-colors"
            >
              {sidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>

            {/* Search Bar */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="w-full relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-quiet" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="input pl-10 py-2 text-sm"
                />
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-4">
              <Link
                href="/create"
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-green text-bg rounded-lg font-medium text-sm hover:bg-green-light transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create
              </Link>

              <button className="relative p-2 hover:bg-surface-2 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red rounded-full" />
              </button>

              <Link href="/profile" className="p-2 hover:bg-surface-2 rounded-lg transition-colors">
                <User className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 lg:hidden bg-black/50 z-30 animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
