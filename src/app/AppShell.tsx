'use client'
import Link from 'next/link'
import { useUser, useSupabase, useTheme, toast } from './providers'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import CreateModal from '@/components/CreateModal'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useUser()
  const { theme, toggleTheme } = useTheme()
  const supabase = useSupabase()
  const router = useRouter()
  const path = usePathname()
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [onlineCount, setOnlineCount] = useState(0)
  const [recentProfiles, setRecentProfiles] = useState<any[]>([])
  const [trendingTopics, setTrendingTopics] = useState<any[]>([])
  const [postCount, setPostCount] = useState(0)
  const [userCount, setUserCount] = useState(0)
  const [moderationCount, setModerationCount] = useState(0)

  useEffect(() => {
    if (!loading && !profile) router.push('/')
  }, [loading, profile, router])

  useEffect(() => {
    if (!supabase) return
    supabase.from('profiles').select('id', { count: 'exact', head: true }).then(({ count }: { count: number | null }) => { if (count) setUserCount(count) })
    supabase.from('profiles').select('id, username, full_name').limit(5).then(({ data }: { data: any }) => { if (data) setRecentProfiles(data) })
    supabase.from('posts').select('id', { count: 'exact', head: true }).then(({ count }: { count: number | null }) => { if (count) setPostCount(count) })
    supabase.from('topics').select('name').order('follower_count', { ascending: false }).limit(3).then(({ data }: { data: any }) => { if (data) setTrendingTopics(data) })
    supabase.from('moderation').select('id', { count: 'exact', head: true }).then(({ count }: { count: number | null }) => { if (count) setModerationCount(count) })
  }, [supabase])

  useEffect(() => {
    const channel = supabase.channel('online-presence')
    channel.on('presence', { event: 'sync' }, () => {
      setOnlineCount(Object.keys(channel.presenceState()).length)
    }).subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_id: profile?.id, online_at: new Date().toISOString() })
      }
    })
    return () => { supabase.removeChannel(channel) }
  }, [supabase, profile?.id])

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
            <summary>Community members <span style={{ color: 'var(--green)', fontSize: 10, fontWeight: 400 }}>{userCount} total</span></summary>
            <div className="side-body">
              {recentProfiles.length === 0 ? (
                <small className="text-muted">No members yet</small>
              ) : recentProfiles.map((p, idx) => (
                <div key={p.id || idx} className="list-row">
                  <span className="avatar g">{(p.full_name || p.username || '?').slice(0, 2).toUpperCase()}</span>
                  <div className="side-copy"><b>{p.full_name || p.username}</b><small>Member</small></div>
                </div>
              ))}
            </div>
          </details>

          <details className="side-section" open>
            <summary>Trending topics</summary>
            <div className="side-body">
              {trendingTopics.length === 0 ? (
                <small className="text-muted">No topics yet</small>
              ) : trendingTopics.map((t, i) => (
                <div key={i} className="metric-line"><b>{t.name}</b><span>·</span></div>
              ))}
            </div>
          </details>

          <details className="side-section">
            <summary>Activity</summary>
            <div className="side-body">
              <div className="metric-line"><b>Posts</b><span>{postCount}</span></div>
              <div className="metric-line"><b>Members</b><span>{userCount}</span></div>
              <div className="metric-line"><b>Reports</b><span>{moderationCount}</span></div>
            </div>
          </details>

          <details className="side-section">
            <summary>Your Heshima</summary>
            <div className="side-body">
              <small style={{ fontSize: 10, color: 'var(--muted)' }}>Heshima rating</small>
              <strong style={{ display: 'block', fontWeight: 800, fontSize: 24, letterSpacing: '-.06em', fontFamily: 'var(--jakarta)', margin: '7px 0' }}>{profile.heshima_rating ?? 0}</strong>
              <Link href="/wallet" className="btn" style={{ background: 'var(--night)', color: 'var(--gold)', width: '100%', justifyContent: 'center' }}>View details</Link>
            </div>
          </details>
        </aside>
      </div>

      {/* Chat widget */}
      <div className={`chat${chatOpen ? ' open' : ''}`}>
        <div className="chat-head">
          <span className="avatar g" style={{ width: 32, height: 32, fontSize: 10 }}>{initials}</span>
          <div className="chat-head-main">
            <b>Support Chat</b>
            <small>Ask us anything</small>
          </div>
          <button className="chat-close" onClick={() => setChatOpen(false)}>×</button>
        </div>
        <div className="chat-list">
          <div className="chat-msg"><div className="bubble">Welcome to KikwetuConnect! How can we help?</div></div>
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
