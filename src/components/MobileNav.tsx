'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useUser, useSupabase, useTheme } from '@/app/providers'
import { isAdmin } from '@/lib/roles'
import { useToolbar } from '@/lib/toolbar'
import { Home, Search, User, Plus, Grid3X3, Trophy, Store, Shield, X, Menu as MenuIcon, GraduationCap, Briefcase, MessageSquare, ArrowLeft, Compass, Calendar, Wallet, Settings, Zap, Sun, Moon } from 'lucide-react'

const mainItems = [
  { href: '/feed', label: 'Home', icon: Home },
  { href: '/explore', label: 'Explore', icon: Search },
  { href: '#create', label: '', icon: Plus, isPlus: true },
  { href: '/profile', label: 'You', icon: User },
  { href: '#menu', label: 'Menu', icon: MenuIcon, isMenu: true },
]

const menuSections = [
  { label: 'Main', items: [
    { href: '/baraza', label: 'Baraza', icon: Compass, desc: 'Community discussions' },
    { href: '/spaces', label: 'Spaces', icon: Grid3X3, desc: 'Topic communities & orgs' },
    { href: '/explore', label: 'Explore', icon: Search, desc: 'Discover people & topics' },
  ]},
  { label: 'Guidance', items: [
    { href: '/students', label: 'Students', icon: GraduationCap, desc: 'Learning resources' },
    { href: '/experts', label: 'Experts', icon: Briefcase, desc: 'Find experts' },
    { href: '/messages', label: 'Messages', icon: MessageSquare, desc: 'Chat with people' },
    { href: '/sessions', label: 'Sessions', icon: Calendar, desc: 'Booked sessions' },
  ]},
  { label: 'Community', items: [
    { href: '/market', label: 'Market', icon: Store, desc: 'Buy & sell locally' },
    { href: '/nyumba', label: 'Nyumba Kumi', icon: Shield, desc: 'Neighbourhood safety' },
    { href: '/quizzes', label: 'Quizzes', icon: Trophy, desc: 'Test your knowledge' },
  ]},
  { label: 'You', items: [
    { href: '/wallet', label: 'Wallet', icon: Wallet, desc: 'Tips & earnings' },
    { href: '/profile', label: 'Profile', icon: User, desc: 'Your public profile' },
    { href: '/settings', label: 'Settings', icon: Settings, desc: 'Account settings' },
  ]},
]

export default function MobileNav() {
  const path = usePathname()
  const { user, profile } = useUser()
  const supabase = useSupabase()
  const { theme, toggleTheme } = useTheme()
  const { config } = useToolbar()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [unreadMsg, setUnreadMsg] = useState(0)

  useEffect(() => {
    setMounted(true)
    const check = () => setIsMobile(window.innerWidth < 760)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (!user || !supabase) return
    const fetchUnread = async () => {
      const { data } = await supabase.rpc('unread_message_count')
      if (data !== null) setUnreadMsg(data)
    }
    fetchUnread()
    const channel = supabase.channel('mobile-msg-count')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => fetchUnread())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, supabase])

  if (!mounted || !isMobile) return null

  const isActive = (href: string) => {
    if (href === '/feed') return path === '/feed' || path === '/'
    if (href === '/profile') return path.startsWith('/profile') || path.startsWith('/settings')
    return path.startsWith(href)
  }

  // Determine if we should render contextual toolbar
  const hasContext = config.actions && config.actions.length > 0

  return (
    <>
      {/* Contextual action bar (slides in above bottom nav) */}
      {hasContext && (
        <div className="fixed z-50 animate-rise" style={{
          left: '50%', transform: 'translateX(-50%)',
          bottom: 82,
          width: 'calc(100vw - 20px)',
          maxWidth: 400,
          touchAction: 'manipulation',
        }}>
          <div className="flex gap-1.5 justify-center" style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 16,
            padding: '6px 8px',
            boxShadow: '0 4px 20px color-mix(in oklab, var(--night) 15%, transparent)',
            touchAction: 'manipulation',
          }}>
            {config.backUrl && (
              <Link href={config.backUrl} onClick={config.onBack}
                className="flex items-center gap-1 px-3 py-1.5 rounded-[10px] text-[11px] font-semibold"
                style={{ background: 'var(--raised)', color: 'var(--muted)', textDecoration: 'none' }}>
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </Link>
            )}
            {config.actions!.map((action, i) => {
              const Icon = action.icon
              const bgMap = { default: 'var(--raised)', primary: 'var(--gold)', gold: 'var(--gold)', danger: 'var(--red)' }
              const colorMap = { default: 'var(--ink)', primary: 'var(--night)', gold: 'var(--night)', danger: '#fff' }
              return (
                <button key={i} onClick={action.onClick}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-[10px] text-[11px] font-semibold border-0 cursor-pointer transition-all whitespace-nowrap"
                  style={{
                    background: action.variant ? bgMap[action.variant] || 'var(--raised)' : action.active ? 'var(--gold)' : 'var(--raised)',
                    color: action.variant ? colorMap[action.variant] || 'var(--ink)' : action.active ? 'var(--night)' : 'var(--ink)',
                    position: 'relative',
                  }}>
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{action.label}</span>
                  {action.badge !== undefined && action.badge > 0 && (
                    <span style={{
                      position: 'absolute', top: -3, right: -3,
                      background: 'var(--red)', color: '#fff',
                      fontSize: 7, fontWeight: 700, minWidth: 14, height: 14,
                      borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 2px',
                    }}>{action.badge > 99 ? '99+' : action.badge}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Bottom navigation */}
      <nav style={{
        position: 'fixed', display: 'flex', zIndex: 12,
        left: '50%', transform: 'translateX(-50%)',
        bottom: 10, height: 65,
        width: 'calc(100vw - 20px)',
        maxWidth: 400,
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 20,
        justifyContent: 'space-around',
        alignItems: 'center',
        boxShadow: '0 16px 40px color-mix(in oklab, var(--night) 20%, transparent)',
        touchAction: 'manipulation',
        pointerEvents: 'auto',
      }}>
        {mainItems.map(i => {
          const Icon = i.icon
          if (i.isPlus) {
            return (
              <button key={i.href} className="plus" aria-label="Create new post"
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
              <button key={i.href} onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                style={{
                  background: 'none', border: 0, cursor: 'pointer', display: 'grid',
                  placeItems: 'center', gap: 4, minWidth: 45, fontSize: 9, position: 'relative',
                  color: active ? 'var(--gold-text)' : 'var(--muted)',
                }}>
                <Icon className="w-5 h-5" />
                <span>{i.label}</span>
                {unreadMsg > 0 && (
                  <span style={{
                    position: 'absolute', top: -2, right: 2,
                    background: 'var(--red)', color: '#fff',
                    fontSize: 7, fontWeight: 700, minWidth: 14, height: 14,
                    borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 2px', lineHeight: 1,
                  }}>{unreadMsg > 99 ? '99+' : unreadMsg}</span>
                )}
              </button>
            )
          }
          const active = isActive(i.href)
          return (
            <Link key={i.href} href={i.href}
              style={{
                textDecoration: 'none', display: 'grid',
                placeItems: 'center', gap: 4, minWidth: 45, fontSize: 9,
                color: active ? 'var(--gold-text)' : 'var(--muted)',
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
              <div className="flex items-center gap-2">
                <button onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                  className="w-8 h-8 rounded-full grid place-items-center"
                  style={{ background: 'var(--raised)', color: 'var(--muted)', border: 0, cursor: 'pointer' }}>
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                <button onClick={() => setMenuOpen(false)}
                  className="w-8 h-8 rounded-full grid place-items-center"
                  style={{ background: 'var(--raised)', color: 'var(--muted)', border: 0, cursor: 'pointer' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex flex-col">
              {menuSections.map(section => (
                <div key={section.label} className="mb-1">
                  <div className="text-[9px] uppercase tracking-[.13em] px-1 my-2 font-semibold" style={{ color: 'var(--faint)' }}>{section.label}</div>
                  <div className="flex flex-col">
                    {section.items.map(item => {
                      const Icon = item.icon
                      const active = isActive(item.href)
                      return (
                        <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 p-2.5 rounded-xl transition-all"
                          style={active ? { background: 'var(--gold)', color: 'var(--night)' } : { color: 'var(--ink)' }}>
                          <div style={{ position: 'relative', flex: 'none', width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', background: active ? 'color-mix(in oklab, var(--night) 12%, transparent)' : 'var(--raised)' }}>
                            <Icon className="w-4 h-4" />
                            {item.href === '/messages' && unreadMsg > 0 && (
                              <span style={{
                                position: 'absolute', top: -4, right: -6,
                                background: 'var(--red)', color: '#fff',
                                fontSize: 8, fontWeight: 700, minWidth: 16, height: 16,
                                borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                padding: '0 3px', lineHeight: 1,
                              }}>{unreadMsg > 99 ? '99+' : unreadMsg}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-xs block">{item.label}</span>
                            <span className="text-[9px]" style={{ color: active ? 'var(--night)' : 'var(--muted)' }}>{item.desc}</span>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
              {isAdmin(profile?.role) && (
                <Link href="/admin/dashboard" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 p-2.5 rounded-xl transition-all mt-1"
                  style={{ background: 'var(--red)', color: '#fff' }}>
                  <div className="w-[30px] h-[30px] rounded-[9px] grid place-items-center" style={{ background: 'rgba(255,255,255,.14)' }}>
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs block">Admin console</span>
                    <span className="text-[9px]" style={{ color: 'rgba(255,255,255,.7)' }}>Platform management</span>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
