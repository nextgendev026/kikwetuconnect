'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useUser, useSupabase, useTheme, toast } from '@/app/providers'
import { useEffect, useState } from 'react'

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
  ],
  System: [
    { id: 'settings', label: 'Platform settings', icon: '\u2699' },
    { id: 'audit', label: 'Audit log', icon: '\u2637' },
  ],
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useUser()
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (!loading && (!user || profile?.role !== 'admin')) router.push('/feed')
  }, [user, profile, loading, router])

  const current = pathname.split('/').pop() || 'dashboard'
  const initials = (profile?.full_name || profile?.username || 'AD').slice(0, 2).toUpperCase()

  const openDrawer = () => setDrawerOpen(true)

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}><div style={{ width: 32, height: 32, border: '3px solid var(--gold)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .6s linear infinite' }} /></div>
  if (!user || profile?.role !== 'admin') return null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '245px minmax(0,1fr)', minHeight: '100vh', maxWidth: 1700, margin: 'auto', background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside style={{ background: 'var(--night)', color: '#fff', padding: '22px 15px', position: 'sticky', top: 0, height: '100vh', flexDirection: 'column', gap: 20, zIndex: 10 }}
        className={`${mobileOpen ? 'fixed inset-0 z-50 flex' : 'hidden'} md:flex md:static md:z-auto`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px' }}>
          <div style={{ width: 35, height: 35, borderRadius: 11, background: 'var(--gold)', color: 'var(--night)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 18, transform: 'rotate(-8deg)' }}>K</div>
          <div><b style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-.05em' }}>KikwetuConnect</b><small style={{ display: 'block', color: 'oklch(68% .025 151)', fontSize: 9, letterSpacing: '.13em', textTransform: 'uppercase', marginTop: 2 }}>Admin console</small></div>
          <button onClick={() => setMobileOpen(false)} className="md:hidden" style={{ marginLeft: 'auto', background: 'none', color: '#fff', fontSize: 22 }}>×</button>
        </div>
        <div style={{ padding: 12, border: '1px solid oklch(31% .025 151)', borderRadius: 14, background: 'oklch(22% .03 151)' }}>
          <small style={{ color: 'oklch(66% .025 151)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.12em' }}>Workspace</small>
          <strong style={{ display: 'block', fontSize: 12, marginTop: 6 }}>Ink master&apos;s Workspace</strong>
          <div style={{ fontSize: 9, color: 'oklch(68% .02 151)', marginTop: 5 }}>Production · Kenya</div>
        </div>
        <nav style={{ display: 'grid', gap: 4, flex: 1, overflow: 'auto' }}>
          {Object.entries(NAV).map(([section, items]) => (
            <div key={section}>
              <div style={{ color: 'oklch(57% .025 151)', fontSize: 10, letterSpacing: '.13em', textTransform: 'uppercase', margin: '7px 10px 3px' }}>{section}</div>
              {items.map(item => (
                <button key={item.id} onClick={() => { router.push(`/admin/${item.id}`); setMobileOpen(false) }}
                  style={{
                    height: 42, borderRadius: 11, background: current === item.id ? 'var(--gold)' : 'none',
                    color: current === item.id ? 'var(--night)' : 'oklch(73% .025 151)',
                    textAlign: 'left', padding: '0 12px', fontSize: 12, width: '100%',
                    fontWeight: current === item.id ? 700 : 400, cursor: 'pointer', border: 0,
                    transition: 'background .2s, transform .2s',
                  }}>
                  {item.icon} &nbsp; {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div style={{ borderTop: '1px solid oklch(30% .025 151)', paddingTop: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, background: 'oklch(23% .03 151)', padding: 4, borderRadius: 10, marginBottom: 10 }}>
            <button onClick={() => { if (theme !== 'light') toggleTheme() }}
              style={{ background: theme === 'light' ? 'var(--gold)' : 'none', color: theme === 'light' ? 'var(--night)' : 'oklch(73% .02 151)', borderRadius: 8, padding: '8px 4px', fontSize: 10, border: 0, cursor: 'pointer', fontWeight: theme === 'light' ? 700 : 400 }}>☼ Light</button>
            <button onClick={() => { if (theme !== 'dark') toggleTheme() }}
              style={{ background: theme === 'dark' ? 'var(--gold)' : 'none', color: theme === 'dark' ? 'var(--night)' : 'oklch(73% .02 151)', borderRadius: 8, padding: '8px 4px', fontSize: 10, border: 0, cursor: 'pointer', fontWeight: theme === 'dark' ? 700 : 400 }}>◐ Dark</button>
          </div>
          <a href="/feed" style={{ display: 'block', textAlign: 'center', padding: '8px 0', borderRadius: 8, color: 'oklch(68% .02 151)', fontSize: 10, border: '1px solid oklch(30% .025 151)', textDecoration: 'none', marginBottom: 8 }}>← Back to app</a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 5px' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', display: 'grid', placeItems: 'center', flex: 'none', background: 'var(--night)', color: 'var(--gold)', fontSize: 10, fontWeight: 800 }}>{initials}</div>
            <div style={{ flex: 1 }}><strong style={{ fontSize: 11, display: 'block', color: '#fff' }}>{profile?.full_name || 'Admin'}</strong><small style={{ display: 'block', color: 'oklch(68% .02 151)', fontSize: 9, marginTop: 2 }}>Super admin · Online</small></div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ minWidth: 0 }}>
        <header style={{ height: 74, padding: '0 32px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 4 }}>
          <button onClick={() => setMobileOpen(true)} className="md:hidden" style={{ background: 'none', color: 'var(--muted)', fontSize: 20, border: 0, cursor: 'pointer' }}>☰</button>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            Admin console <span style={{ color: 'var(--faint)' }}>/</span> <b style={{ color: 'var(--ink)' }}>{current.charAt(0).toUpperCase() + current.slice(1)}</b>
          </div>
          <div style={{ display: 'flex', gap: 5, marginLeft: 'auto' }}>
            <div style={{ display: 'flex', gap: 4, background: 'var(--raised)', padding: 3, borderRadius: 9 }}>
              <button onClick={() => { if (theme !== 'light') toggleTheme() }}
                style={{ background: theme === 'light' ? 'var(--gold)' : 'none', color: theme === 'light' ? 'var(--night)' : 'var(--muted)', borderRadius: 7, padding: '6px 10px', fontSize: 10, border: 0, cursor: 'pointer', fontWeight: theme === 'light' ? 700 : 400 }}>☼</button>
              <button onClick={() => { if (theme !== 'dark') toggleTheme() }}
                style={{ background: theme === 'dark' ? 'var(--gold)' : 'none', color: theme === 'dark' ? 'var(--night)' : 'var(--muted)', borderRadius: 7, padding: '6px 10px', fontSize: 10, border: 0, cursor: 'pointer', fontWeight: theme === 'dark' ? 700 : 400 }}>◐</button>
            </div>
            <button style={{ width: 40, height: 40, borderRadius: 11, background: 'none', color: 'var(--muted)', border: 0, cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 17, transition: 'background .2s' }}
              onClick={() => toast('Global search ready')}>⌕</button>
            <button style={{ width: 40, height: 40, borderRadius: 11, background: 'none', color: 'var(--muted)', border: 0, cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 17, transition: 'background .2s' }}
              onClick={() => toast('3 operational alerts')}>♢</button>
            <button style={{ width: 40, height: 40, borderRadius: 11, background: 'none', color: 'var(--muted)', border: 0, cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 17, transition: 'background .2s' }}
              onClick={openDrawer}>＋</button>
            <button style={{ width: 40, height: 40, borderRadius: 11, background: 'none', color: 'var(--muted)', border: 0, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
              <div style={{ width: 29, height: 29, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--earth)', color: 'var(--gold)', fontSize: 9, fontWeight: 800 }}>{initials}</div>
            </button>
          </div>
        </header>
        <div style={{ maxWidth: 1400, padding: '31px 32px 70px', margin: 'auto' }}>{children}</div>
      </main>

      {/* Overlay for mobile */}
      {mobileOpen && <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 40 }} className="md:hidden" />}

      {/* Drawer */}
      {drawerOpen && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setDrawerOpen(false) }} style={{ position: 'fixed', inset: 0, background: 'oklch(10% .02 151 / .6)', zIndex: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 'min(520px,100%)', height: '100%', background: 'var(--surface)', borderLeft: '1px solid var(--line)', padding: 22, overflow: 'auto', animation: 'slide .3s var(--ease)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--green)', fontWeight: 800 }}>Admin action</div>
                <h2 style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-.05em', margin: 0, color: 'var(--ink)' }}>Quick admin action</h2>
                <p style={{ color: 'var(--muted)', fontSize: 12, lineHeight: 1.5 }}>Choose a scoped action. Every change creates an audit record.</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', color: 'var(--muted)', fontSize: 24, border: 0, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ display: 'grid', gap: 7, margin: '16px 0' }}>
              <label style={{ fontSize: 10, color: 'var(--muted)' }}>Action type</label>
              <select style={{ height: 43, border: '1px solid var(--line)', background: 'var(--raised)', borderRadius: 10, padding: '0 11px', fontSize: 11, color: 'var(--ink)' }}>
                <option>Publish platform notice</option>
                <option>Assign Community Jury</option>
                <option>Pause new marketplace listings</option>
                <option>Trigger payout review</option>
                <option>Export operational report</option>
              </select>
            </div>
            <div style={{ display: 'grid', gap: 7, margin: '16px 0' }}>
              <label style={{ fontSize: 10, color: 'var(--muted)' }}>Scope</label>
              <select style={{ height: 43, border: '1px solid var(--line)', background: 'var(--raised)', borderRadius: 10, padding: '0 11px', fontSize: 11, color: 'var(--ink)' }}>
                <option>Entire platform</option>
                <option>Nairobi</option>
                <option>Professionals</option>
                <option>Marketplace</option>
                <option>Nyumba Kumi</option>
              </select>
            </div>
            <div style={{ display: 'grid', gap: 7, margin: '16px 0' }}>
              <label style={{ fontSize: 10, color: 'var(--muted)' }}>Reason or internal note</label>
              <textarea placeholder="Add context for the audit trail..." style={{ height: 90, padding: 11, border: '1px solid var(--line)', background: 'var(--raised)', borderRadius: 10, fontSize: 11, resize: 'vertical', color: 'var(--ink)' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setDrawerOpen(false)} style={{ minHeight: 42, borderRadius: 10, padding: '0 13px', background: 'var(--raised)', border: '1px solid var(--line)', color: 'var(--ink)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { toast('Action queued for confirmation'); setDrawerOpen(false) }} style={{ minHeight: 42, borderRadius: 10, padding: '0 13px', background: 'var(--gold)', color: 'var(--night)', fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 0 }}>Review action</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes slide{from{transform:translateX(30px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </div>
  )
}
