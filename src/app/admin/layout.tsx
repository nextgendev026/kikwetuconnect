'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useUser, useSupabase, useTheme, toast } from '@/app/providers'
import { useEffect, useState } from 'react'
import { isAdmin } from '@/lib/roles'

const NAV = {
  Monitor: [
    { id: 'dashboard', label: 'Overview', icon: '\u25A6' },
    { id: 'analytics', label: 'Analytics', icon: '\u25D2' },
    { id: 'health', label: 'Platform health', icon: '\u2726' },
  ],
  Control: [
    { id: 'moderation', label: 'Moderation', icon: '\u2691' },
    { id: 'verification', label: 'Verification', icon: '\u2713' },
    { id: 'users', label: 'Users', icon: '\u25C9' },
    { id: 'spaces', label: 'Spaces', icon: '\u25A6' },
    { id: 'marketplace', label: 'Marketplace', icon: '\u25A4' },
    { id: 'safety', label: 'Nyumba Kumi', icon: '\u2662' },
  ],
  Money: [
    { id: 'payments', label: 'Payments & payouts', icon: '\u25C8' },
    { id: 'ads', label: 'Ads', icon: '\u25B2' },
  ],
  System: [
    { id: 'settings', label: 'Platform settings', icon: '\u2699' },
    { id: 'audit', label: 'Audit log', icon: '\u2637' },
  ],
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useUser()
  const { theme, toggleTheme } = useTheme()
  const supabase = useSupabase()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pendingModCount, setPendingModCount] = useState(0)

  useEffect(() => {
    if (!loading && (!user || !isAdmin(profile?.role))) setTimeout(() => router.push('/feed'), 0)
  }, [user, profile, loading, router])

  useEffect(() => {
    if (!supabase || !isAdmin(profile?.role)) return
    supabase.from('moderation_queue').select('id', { count: 'exact', head: true }).eq('status', 'pending')
      .then(({ count }: { count: number | null }) => { if (count !== null) setPendingModCount(count) })
  }, [supabase, profile])

  const current = pathname.split('/').pop() || 'dashboard'
  const initials = (profile?.full_name || profile?.username || 'AD').slice(0, 2).toUpperCase()

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}><div className="w-[32px] h-[32px] rounded-full animate-spin" style={{ border: '3px solid var(--gold)', borderTopColor: 'transparent' }} /></div>
  if (!user || !isAdmin(profile?.role)) return null

  return (
    <div className="min-h-screen max-w-[1700px] mx-auto" style={{ background: 'var(--bg)' }}>
      <div className="flex flex-col md:flex-row">
        {/* Sidebar overlay for mobile */}
        {mobileOpen && (
          <div onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-black/50 md:hidden" />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed md:sticky top-0 z-50 h-full md:h-screen
          ${mobileOpen ? 'left-0' : '-left-full'} md:left-0
          transition-[left] duration-300 ease-in-out
          w-[260px] flex-shrink-0 overflow-y-auto
          flex flex-col gap-5 p-[22px_15px]
        `} style={{ background: 'var(--night)', color: '#fff' }}>
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-[35px] h-[35px] rounded-[11px] grid place-items-center font-extrabold text-lg flex-shrink-0" style={{ background: 'var(--gold)', color: 'var(--night)', transform: 'rotate(-8deg)' }}>K</div>
            <div className="flex-1 min-w-0">
              <b className="font-extrabold text-[15px] tracking-[-.05em] block truncate">KikwetuConnect</b>
              <small className="block text-[9px] uppercase tracking-[.13em] mt-0.5" style={{ color: 'var(--muted)' }}>Admin console</small>
            </div>
            <button onClick={() => setMobileOpen(false)} className="md:hidden bg-none text-white text-[22px] border-0 cursor-pointer">×</button>
          </div>

          <div className="p-3 rounded-[14px]" style={{ border: '1px solid var(--line)', background: 'var(--raised)' }}>
            <small className="text-[9px] uppercase tracking-[.12em]" style={{ color: 'var(--muted)' }}>Workspace</small>
            <strong className="block text-[12px] mt-1.5">Ink master&apos;s Workspace</strong>
            <div className="text-[9px] mt-1" style={{ color: 'var(--muted)' }}>Production · Kenya</div>
          </div>

          <nav className="flex-1 grid gap-1 overflow-y-auto">
            {Object.entries(NAV).map(([section, items]) => (
              <div key={section}>
                <div className="text-[10px] uppercase tracking-[.13em] mx-2.5 my-[7px_3px]" style={{ color: 'var(--faint)' }}>{section}</div>
                {items.map(item => (
                  <button key={item.id} onClick={() => { router.push(`/admin/${item.id}`); setMobileOpen(false) }}
                    className="w-full flex items-center gap-1.5 h-[42px] rounded-[11px] px-3 text-[12px] text-left border-0 cursor-pointer transition-all"
                    style={{
                      background: current === item.id ? 'var(--gold)' : 'none',
                      color: current === item.id ? 'var(--night)' : 'oklch(73% .025 151)',
                      fontWeight: current === item.id ? 700 : 400,
                    }}>
                    {item.icon} <span className="ml-1">{item.label}</span>
                    {item.id === 'moderation' && pendingModCount > 0 && (
                      <span className="ml-auto flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[9px] font-bold px-1" style={{ background: 'var(--red)', color: '#fff' }}>{pendingModCount}</span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          <div style={{ borderTop: '1px solid var(--line)' }} className="pt-3">
            <div className="grid grid-cols-2 gap-1 p-1 rounded-[10px] mb-2.5" style={{ background: 'var(--raised)' }}>
              <button onClick={() => { if (theme !== 'light') toggleTheme() }}
                className="rounded-[8px] py-2 px-1 text-[10px] border-0 cursor-pointer"
                style={{ background: theme === 'light' ? 'var(--gold)' : 'none', color: theme === 'light' ? 'var(--night)' : 'oklch(73% .02 151)', fontWeight: theme === 'light' ? 700 : 400 }}>☼ Light</button>
              <button onClick={() => { if (theme !== 'dark') toggleTheme() }}
                className="rounded-[8px] py-2 px-1 text-[10px] border-0 cursor-pointer"
                style={{ background: theme === 'dark' ? 'var(--gold)' : 'none', color: theme === 'dark' ? 'var(--night)' : 'oklch(73% .02 151)', fontWeight: theme === 'dark' ? 700 : 400 }}>◐ Dark</button>
            </div>
            <a href="/feed" className="block text-center py-2 rounded-[8px] text-[10px] mb-2 no-underline" style={{ color: 'var(--muted)', border: '1px solid var(--line)' }}>← Back to app</a>
            <div className="flex items-center gap-2.5 px-1.5 py-1.5">
              <div className="w-[34px] h-[34px] rounded-full grid place-items-center flex-shrink-0 text-[10px] font-extrabold" style={{ background: 'var(--night)', color: 'var(--gold)' }}>{initials}</div>
              <div className="flex-1 min-w-0">
                <strong className="text-[11px] block truncate text-white">{profile?.full_name || 'Admin'}</strong>
                <small className="block text-[9px] mt-0.5" style={{ color: 'var(--muted)' }}>Super admin · Online</small>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          <header className="sticky top-0 z-10 flex items-center h-[68px] md:h-[74px] px-4 md:px-8 gap-3" style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}>
            <button onClick={() => setMobileOpen(true)} className="md:hidden bg-none border-0 cursor-pointer text-lg" style={{ color: 'var(--muted)' }}>☰</button>
            <div className="text-[12px] truncate" style={{ color: 'var(--muted)' }}>
              Admin console <span style={{ color: 'var(--faint)' }}>/</span> <b style={{ color: 'var(--ink)' }}>{current.charAt(0).toUpperCase() + current.slice(1)}</b>
            </div>
            <div className="flex gap-1.5 ml-auto">
              <div className="hidden sm:flex gap-1 p-[3px] rounded-[9px]" style={{ background: 'var(--raised)' }}>
                <button onClick={() => { if (theme !== 'light') toggleTheme() }}
                  className="rounded-[7px] px-[10px] py-[6px] text-[10px] border-0 cursor-pointer"
                  style={{ background: theme === 'light' ? 'var(--gold)' : 'none', color: theme === 'light' ? 'var(--night)' : 'var(--muted)', fontWeight: theme === 'light' ? 700 : 400 }}>☼</button>
                <button onClick={() => { if (theme !== 'dark') toggleTheme() }}
                  className="rounded-[7px] px-[10px] py-[6px] text-[10px] border-0 cursor-pointer"
                  style={{ background: theme === 'dark' ? 'var(--gold)' : 'none', color: theme === 'dark' ? 'var(--night)' : 'var(--muted)', fontWeight: theme === 'dark' ? 700 : 400 }}>◐</button>
              </div>
              <button className="w-[38px] h-[38px] md:w-[40px] md:h-[40px] rounded-[11px] grid place-items-center text-base border-0 cursor-pointer" style={{ background: 'none', color: 'var(--muted)' }}
                onClick={() => toast('Global search ready')}>⌕</button>
              <button className="w-[38px] h-[38px] md:w-[40px] md:h-[40px] rounded-[11px] grid place-items-center text-base border-0 cursor-pointer" style={{ background: 'none', color: 'var(--muted)' }}
                onClick={() => toast('3 operational alerts')}>♢</button>
              <button className="w-[38px] h-[38px] md:w-[40px] md:h-[40px] rounded-[11px] grid place-items-center text-base border-0 cursor-pointer" style={{ background: 'none', color: 'var(--muted)' }}
                onClick={() => setDrawerOpen(true)}>＋</button>
              <button className="w-[38px] h-[38px] md:w-[40px] md:h-[40px] rounded-[11px] grid place-items-center border-0 cursor-pointer">
                <div className="w-[26px] h-[26px] md:w-[29px] md:h-[29px] rounded-full grid place-items-center text-[9px] font-extrabold" style={{ background: 'var(--earth)', color: 'var(--gold)' }}>{initials}</div>
              </button>
            </div>
          </header>
          <div className="max-w-[1400px] px-4 md:px-8 py-[24px] md:py-[31px] pb-[50px] md:pb-[70px] mx-auto">{children}</div>
        </main>
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setDrawerOpen(false) }}
          className="fixed inset-0 z-20 flex justify-end" style={{ background: 'color-mix(in srgb, var(--night) 60%, transparent)' }}>
          <div className="w-full sm:w-[520px] h-full overflow-y-auto animate-slide-in-right" style={{ background: 'var(--surface)', borderLeft: '1px solid var(--line)', padding: 22 }}>
            <div className="flex justify-between items-start">
              <div>
                <div className="text-[10px] uppercase tracking-[.15em] font-extrabold" style={{ color: 'var(--green)' }}>Admin action</div>
                <h2 className="font-extrabold text-[clamp(1.1rem,2.5vw,1.25rem)] tracking-[-.05em] m-0 mt-1" style={{ color: 'var(--ink)' }}>Quick admin action</h2>
                <p className="text-[12px] mt-1 leading-relaxed" style={{ color: 'var(--muted)' }}>Choose a scoped action. Every change creates an audit record.</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="bg-none border-0 cursor-pointer text-2xl" style={{ color: 'var(--muted)' }}>×</button>
            </div>
            <div className="grid gap-2 my-4">
              <label className="text-[10px]" style={{ color: 'var(--muted)' }}>Action type</label>
              <select className="h-[43px] rounded-[10px] px-3 text-[11px]" style={{ border: '1px solid var(--line)', background: 'var(--raised)', color: 'var(--ink)' }}>
                <option>Publish platform notice</option>
                <option>Assign Community Jury</option>
                <option>Pause new marketplace listings</option>
                <option>Trigger payout review</option>
                <option>Export operational report</option>
              </select>
            </div>
            <div className="grid gap-2 my-4">
              <label className="text-[10px]" style={{ color: 'var(--muted)' }}>Scope</label>
              <select className="h-[43px] rounded-[10px] px-3 text-[11px]" style={{ border: '1px solid var(--line)', background: 'var(--raised)', color: 'var(--ink)' }}>
                <option>Entire platform</option>
                <option>Nairobi</option>
                <option>Experts</option>
                <option>Marketplace</option>
                <option>Nyumba Kumi</option>
              </select>
            </div>
            <div className="grid gap-2 my-4">
              <label className="text-[10px]" style={{ color: 'var(--muted)' }}>Reason or internal note</label>
              <textarea placeholder="Add context for the audit trail..." className="h-[90px] p-3 rounded-[10px] text-[11px] resize-y" style={{ border: '1px solid var(--line)', background: 'var(--raised)', color: 'var(--ink)' }} />
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setDrawerOpen(false)}
                className="min-h-[42px] rounded-[10px] px-[13px] text-[11px] font-bold cursor-pointer" style={{ background: 'var(--raised)', border: '1px solid var(--line)', color: 'var(--ink)' }}>Cancel</button>
              <button onClick={() => { toast('Action queued for confirmation'); setDrawerOpen(false) }}
                className="min-h-[42px] rounded-[10px] px-[13px] text-[11px] font-bold cursor-pointer border-0" style={{ background: 'var(--gold)', color: 'var(--night)' }}>Review action</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
