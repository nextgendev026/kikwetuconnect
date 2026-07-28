'use client'
import Link from 'next/link'
import { useUser, useSupabase, useTheme, toast } from './providers'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import CreateModal from '@/components/CreateModal'

const LIVE_USERS = [
  { i: 'AK', c: 'g', n: 'Agnes Kiplagat', s: 'Answering in #KilimoSmart' },
  { i: 'JM', c: 'b', n: 'Joseph Mumo', s: 'Available for guidance' },
  { i: 'WN', c: '', n: 'Wanjiku Njeri', s: 'Active in Legal Rights' },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useUser()
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()
  const path = usePathname()
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')

  useEffect(() => {
    if (!loading && !profile) router.push('/login')
  }, [loading, profile, router])

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
    <div style={{ width: 30, height: 30, border: '3px solid var(--line)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
  </div>
  if (!profile) return null

  const initials = (profile.full_name || profile.username || 'U').slice(0, 2).toUpperCase()
  const noLayout = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email'].includes(path) || path.startsWith('/auth')
  if (noLayout) return <>{children}</>

  const handleChatSend = () => {
    if (!chatInput.trim()) return
    toast('Message delivered')
    setChatInput('')
  }

  return (
    <>
      <div className="app">
        {/* Sidebar */}
        <Sidebar initials={initials} profile={profile} theme={theme} toggleTheme={toggleTheme} />

        {/* Main */}
        <main className="main">
          <header className="topbar">
            <div className="search">⌕ <input placeholder="Search Baraza, spaces, people..." /></div>
            <div className="top-actions">
              <Link href="/explore" className="icon" title="Search">⌕</Link>
              <Link href="/notifications" className="icon" title="Notifications">♡</Link>
              <button className="icon" onClick={() => setChatOpen(!chatOpen)} title="Messages">◍</button>
              <Link href="/profile" className="icon" title="Profile">
                <span className="avatar" style={{ width: 30, height: 30, fontSize: 10 }}>{initials}</span>
              </Link>
            </div>
          </header>

          <section className="page active" style={{ paddingTop: 33, paddingBottom: 94 }}>
            {children}
          </section>

          <MobileNav />
        </main>

        {/* Right Panel */}
        <aside className="right-panel">
          <details className="side-section" open>
            <summary>Live right now <span style={{ color: 'var(--green)', fontSize: 10, fontWeight: 400 }}>38 online</span></summary>
            <div className="side-body">
              {LIVE_USERS.map((u, idx) => (
                <div key={idx} className="list-row">
                  <span className={`avatar ${u.c}`}>{u.i}</span>
                  <div className="side-copy"><b>{u.n}</b><small>{u.s}</small></div>
                  <button className="side-action" onClick={() => { setChatOpen(true); toast('Live chat opened with ' + u.n) }}>Chat</button>
                </div>
              ))}
            </div>
          </details>

          <details className="side-section" open>
            <summary>Trending near you</summary>
            <div className="side-body">
              {[{ n: '#NairobiTechWeek', v: '2.4k' }, { n: 'Farming in Kitale', v: '892' }, { n: '#M-PesaForBusiness', v: '641' }].map((t, i) => (
                <div key={i} className="metric-line"><b>{t.n}</b><span>{t.v}</span></div>
              ))}
            </div>
          </details>

          <details className="side-section">
            <summary>Community health</summary>
            <div className="side-body">
              {[{ n: 'Reports resolved', v: '86%' }, { n: 'Translation coverage', v: '74%' }, { n: 'Realtime health', v: '99.98%' }].map((m, i) => (
                <div key={i} className="metric-line"><b>{m.n}</b><span>{m.v}</span></div>
              ))}
            </div>
          </details>

          <details className="side-section">
            <summary>Wallet snapshot</summary>
            <div className="side-body">
              <small style={{ fontSize: 10, color: 'var(--muted)' }}>Available balance</small>
              <strong style={{ display: 'block', fontWeight: 800, fontSize: 24, letterSpacing: '-.06em', fontFamily: 'var(--jakarta)', margin: '7px 0' }}>KSh 2,500</strong>
              <Link href="/wallet" className="btn" style={{ background: 'var(--night)', color: 'var(--gold)', width: '100%', justifyContent: 'center' }}>Open wallet</Link>
            </div>
          </details>
        </aside>
      </div>

      {/* Chat widget */}
      <div className={`chat${chatOpen ? ' open' : ''}`}>
        <div className="chat-head">
          <span className="avatar g" style={{ width: 32, height: 32, fontSize: 10 }}>AK</span>
          <div className="chat-head-main">
            <b>Agnes Kiplagat</b>
            <small><span className="online" style={{ verticalAlign: -1, marginRight: 4 }} />Online now</small>
          </div>
          <button className="chat-close" onClick={() => setChatOpen(false)}>×</button>
        </div>
        <div className="chat-list">
          <div className="chat-msg"><div className="bubble">Hey Ink master, your soil checklist is ready. Want the Kiswahili version too?</div></div>
          <div className="chat-msg me"><div className="bubble">Yes please, and add the cost range for Kitale.</div></div>
          <div className="chat-msg"><div className="bubble">On it. I'll send it here in a minute.</div></div>
        </div>
        <div className="chat-input">
          <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChatSend()} placeholder="Write a message..." />
          <button onClick={handleChatSend}>↗</button>
        </div>
      </div>

      {/* Create modal */}
      <CreateModal />

      {/* Toast */}
      <div className="toast" id="global-toast"></div>
    </>
  )
}
