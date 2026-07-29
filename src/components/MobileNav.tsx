'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Home, Search, User, Plus, Grid3X3, Trophy, Store, Shield, X, Menu as MenuIcon, GraduationCap, Briefcase } from 'lucide-react'

const mainItems = [
  { href: '/feed', label: 'Home', icon: Home },
  { href: '/explore', label: 'Explore', icon: Search },
  { href: '#create', label: '', icon: Plus, isPlus: true },
  { href: '/profile', label: 'You', icon: User },
  { href: '#menu', label: 'Menu', icon: MenuIcon, isMenu: true },
]

const menuItems = [
  { href: '/spaces', label: 'Spaces', icon: Grid3X3, desc: 'Topic communities' },
  { href: '/quizzes', label: 'Quizzes', icon: Trophy, desc: 'Test your knowledge' },
  { href: '/market', label: 'Market', icon: Store, desc: 'Buy & sell locally' },
  { href: '/nyumba', label: 'Nyumba Kumi', icon: Shield, desc: 'Neighbourhood safety' },
  { href: '/students', label: 'Students', icon: GraduationCap, desc: 'Learning resources' },
  { href: '/professionals', label: 'Professionals', icon: Briefcase, desc: 'Find experts' },
]

export default function MobileNav() {
  const path = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const check = () => setIsMobile(window.innerWidth < 760)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (!mounted || !isMobile) return null

  const isActive = (href: string) => {
    if (href === '/feed') return path === '/feed' || path === '/'
    if (href === '/profile') return path.startsWith('/profile') || path.startsWith('/settings')
    return path.startsWith(href)
  }

  return (
    <>
      <nav style={{
        position: 'fixed', display: 'flex', zIndex: 12,
        left: 10, right: 10, bottom: 10, height: 65,
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 20,
        justifyContent: 'space-around',
        alignItems: 'center',
        boxShadow: '0 16px 40px color-mix(in oklab, var(--night) 20%, transparent)',
      }}>
        {mainItems.map(i => {
          const Icon = i.icon
          if (i.isPlus) {
            return (
              <button key={i.href} className="plus"
                onClick={() => document.dispatchEvent(new CustomEvent('open-create-modal'))}
                style={{
                  height: 46, width: 46, borderRadius: 15,
                  background: 'var(--gold)', color: 'var(--night)',
                  border: 0, cursor: 'pointer', display: 'grid', placeItems: 'center',
                  transform: 'translateY(-6px)',
                  boxShadow: '0 4px 12px color-mix(in oklab, var(--gold) 40%, transparent)',
                }}>
                <Plus className="w-5 h-5" />
              </button>
            )
          }
          if (i.isMenu) {
            const active = menuOpen
            return (
              <button key={i.href} onClick={() => setMenuOpen(!menuOpen)}
                style={{
                  background: 'none', border: 0, cursor: 'pointer', display: 'grid',
                  placeItems: 'center', gap: 4, minWidth: 45, fontSize: 9,
                  color: active ? 'var(--gold)' : 'var(--muted)',
                }}>
                <Icon className="w-5 h-5" />
                <span>{i.label}</span>
              </button>
            )
          }
          const active = isActive(i.href)
          return (
            <Link key={i.href} href={i.href}
              style={{
                textDecoration: 'none', display: 'grid',
                placeItems: 'center', gap: 4, minWidth: 45, fontSize: 9,
                color: active ? 'var(--gold)' : 'var(--muted)',
              }}>
              <Icon className="w-5 h-5" />
              <span>{i.label}</span>
            </Link>
          )
        })}
      </nav>

      {menuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'color-mix(in oklab, var(--night) 80%, transparent)' }}
          onClick={() => setMenuOpen(false)}>
          <div className="flex-1" />
          <div className="rounded-t-2xl p-5 animate-rise" style={{
            background: 'var(--surface)', borderTop: '1px solid var(--line)',
            maxHeight: '80vh', overflowY: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-base" style={{ color: 'var(--ink)' }}>Quick access</h2>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>Navigate around KikwetuConnect</p>
              </div>
              <button onClick={() => setMenuOpen(false)}
                className="w-8 h-8 rounded-full grid place-items-center"
                style={{ background: 'var(--raised)', color: 'var(--muted)', border: 0, cursor: 'pointer' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {menuItems.map(item => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                    className="flex flex-col items-start gap-1.5 p-3.5 rounded-xl transition-all"
                    style={active ? { background: 'var(--gold)', color: 'var(--night)' } : { background: 'var(--raised)', color: 'var(--ink)' }}>
                    <Icon className="w-5 h-5" />
                    <span className="font-bold text-xs">{item.label}</span>
                    <span className="text-[9px]" style={{ color: active ? 'var(--night)' : 'var(--muted)' }}>{item.desc}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
