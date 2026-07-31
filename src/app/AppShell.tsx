'use client'
import Link from 'next/link'
import { useUser, useSupabase, useTheme, toast } from './providers'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, useRef } from 'react'
import CreateModal from '@/components/CreateModal'
import NotificationTray from '@/components/NotificationTray'
import { ToolbarProvider } from '@/lib/toolbar'
import { Send, MessageSquare, Bell, Sun, Moon } from 'lucide-react'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useUser()
  const { theme, toggleTheme } = useTheme()
  const supabase = useSupabase()
  const router = useRouter()
  const path = usePathname()
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [onlineCount, setOnlineCount] = useState(0)
  const [onlineUsers, setOnlineUsers] = useState<any[]>([])
  const [trendingTopics, setTrendingTopics] = useState<any[]>([])
  const [postCount, setPostCount] = useState(0)
  const [userCount, setUserCount] = useState(0)
  const [moderationCount, setModerationCount] = useState(0)
  const [unreadNotifCount, setUnreadNotifCount] = useState(0)
  const [unreadMsgCount, setUnreadMsgCount] = useState(0)
  const [chatConvId, setChatConvId] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const chatChannelRef = useRef<any>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [chatSending, setChatSending] = useState(false)
  const [showNotifTray, setShowNotifTray] = useState(false)
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())

  // Recognize existing follow relationships so Community follow buttons reflect real state
  useEffect(() => {
    if (!profile || !supabase) return
    supabase.from('follows').select('following_id').eq('follower_id', profile.id)
      .then(({ data }) => {
        if (data) setFollowingIds(new Set((data as any[]).map(f => f.following_id)))
      })
  }, [profile, supabase])

  const fetchUnreadCount = useCallback(async () => {
    if (!profile || !supabase) return
    const { count } = await supabase
      .from('notifications').select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id).eq('is_read', false)
    if (count !== null) setUnreadNotifCount(count)
    const { data: msgCount } = await supabase.rpc('unread_message_count')
    if (msgCount !== null) setUnreadMsgCount(msgCount)
  }, [profile, supabase])

  useEffect(() => {
    if (!loading && !profile) {
      const publicPaths = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/onboarding', '/welcome']
      const isPublic = publicPaths.some(p => path === p || path.startsWith(p))
      if (!isPublic) setTimeout(() => router.push('/'), 0)
    }
  }, [loading, profile, router, path])

  useEffect(() => {
    if (!profile || !supabase) return
    fetchUnreadCount()
  }, [profile, supabase, fetchUnreadCount])

  useEffect(() => {
    if (!supabase) return
    supabase.from('profiles').select('id', { count: 'exact', head: true }).then(({ count }: { count: number | null }) => { if (count !== null) setUserCount(count ?? 0) })
    supabase.from('posts').select('id', { count: 'exact', head: true }).then(({ count }: { count: number | null }) => { if (count !== null) setPostCount(count ?? 0) })
    supabase.from('topics').select('name').order('follower_count', { ascending: false }).limit(3).then(({ data }: { data: any }) => { if (data) setTrendingTopics(data) })
    supabase.from('moderation_queue').select('id', { count: 'exact', head: true }).then(({ count }: { count: number | null }) => { if (count !== null) setModerationCount(count ?? 0) })
  }, [supabase])

  useEffect(() => {
    if (!supabase) return
    const channel = supabase.channel('online-presence')
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      const userIds = Object.keys(state)
      setOnlineCount(userIds.length)
      if (userIds.length > 0) {
        supabase.from('profiles').select('id, username, full_name, avatar_url, heshima_rating, county_hub, is_verified_expert').in('id', userIds).then(({ data }: { data: any[] | null }) => {
          if (data) setOnlineUsers(data)
        })
      } else {
        setOnlineUsers([])
      }
    }).subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_id: profile?.id, online_at: new Date().toISOString() })
      }
    })
    return () => { supabase.removeChannel(channel) }
  }, [supabase, profile?.id])

  useEffect(() => {
    if (!chatConvId || !supabase) return
    if (chatChannelRef.current) supabase.removeChannel(chatChannelRef.current)
    chatChannelRef.current = supabase.channel(`chat-${chatConvId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${chatConvId}`,
      }, (payload: any) => {
        setChatMessages(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new])
      })
      .subscribe()
    return () => {
      if (chatChannelRef.current) supabase.removeChannel(chatChannelRef.current)
    }
  }, [chatConvId, supabase])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
    <div style={{ width: 30, height: 30, border: '3px solid var(--line)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
  </div>
  if (!profile) return null

  const initials = (profile.full_name || profile.username || 'U').slice(0, 2).toUpperCase()
  const noLayout = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/welcome'].includes(path) || path.startsWith('/auth')
  if (noLayout) return <>{children}</>

  const handleChatSend = async () => {
    if (!chatInput.trim() || !chatConvId || chatSending) return
    setChatSending(true)
    const content = chatInput.trim()
    setChatInput('')
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: chatConvId, content }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
    } catch (e: any) {
      toast(e.message || 'Failed to send')
    }
    setChatSending(false)
  }

  return (
    <>
      <ToolbarProvider>
        <div className="app">
          {/* Sidebar */}
          <Sidebar initials={initials} profile={profile} onlineCount={onlineCount} onlineUsers={onlineUsers} />

          {/* Main */}
          <main className="main">
            <header className="topbar">
              <Link href="/feed" className="topbar-brand">
                <span className="mark" style={{ width: 30, height: 30, fontSize: 15, transform: 'rotate(-6deg)' }}>K</span>
                <span className="topbar-brand-text">KikwetuConnect</span>
              </Link>
              <div className="search" id="global-search">
                <button className="search-toggle" onClick={() => document.getElementById('global-search')?.classList.toggle('expanded')}>⌕</button>
                <input aria-label="Search Baraza, spaces, people..." placeholder="Search Baraza, spaces, people..." />
              </div>
              <div className="top-actions">
                <button onClick={toggleTheme} className="icon" aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
                  {theme === 'dark' ? <Sun className="w-[17px] h-[17px]" /> : <Moon className="w-[17px] h-[17px]" />}
                </button>
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setShowNotifTray(p => !p)} className="icon" aria-label={unreadNotifCount > 0 ? `${unreadNotifCount} unread notifications` : 'Notifications'} title="Notifications" style={{ position: 'relative', background: 'none', border: 0, cursor: 'pointer' }}>
                    <Bell className="w-[17px] h-[17px]" />
                    {unreadNotifCount > 0 && (
                      <span style={{
                        position: 'absolute', top: -2, right: -2,
                        background: 'var(--red)', color: '#fff',
                        fontSize: 8, fontWeight: 700, minWidth: 16, height: 16,
                        borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 3px', lineHeight: 1,
                      }}>{unreadNotifCount > 99 ? '99+' : unreadNotifCount}</span>
                    )}
                  </button>
                  {showNotifTray && <NotificationTray onClose={() => setShowNotifTray(false)} />}
                </div>
                <button className="icon" style={{ position: 'relative' }} onClick={() => { setChatOpen(o => { if (!o) setChatConvId(null); return !o }) }} aria-label={chatOpen ? 'Close chat' : 'Open messages'} title="Messages">
                  <MessageSquare className="w-[17px] h-[17px]" />
                  {unreadMsgCount > 0 && !chatOpen && (
                    <span style={{
                      position: 'absolute', top: -2, right: -2,
                      background: 'var(--red)', color: '#fff',
                      fontSize: 8, fontWeight: 700, minWidth: 16, height: 16,
                      borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 3px', lineHeight: 1,
                    }}>{unreadMsgCount > 99 ? '99+' : unreadMsgCount}</span>
                  )}
                </button>
                <Link href="/profile" className="icon" aria-label="Profile" title="Profile">
                  <span className="avatar" style={{ width: 30, height: 30, fontSize: 10, overflow: 'hidden' }}>
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.textContent = initials }} />
                    ) : initials}
                  </span>
                </Link>
              </div>
            </header>

            <section className="page active" style={{ paddingTop: 33, paddingBottom: 94, minHeight: 'calc(100vh - 33px)' }}>
              {children}
            </section>
          </main>

          <MobileNav />

          {/* Right Panel */}
          <aside className="right-panel">
          <details className="side-section" open>
            <summary>Community <span style={{ color: 'var(--green)', fontSize: 10, fontWeight: 400 }}>{onlineCount} online</span></summary>
            <div className="side-body">
              {onlineUsers.length === 0 ? (
                <small className="text-muted">No members online</small>
              ) : onlineUsers.slice(0, 8).map((p) => {
                const name = p.full_name || p.username || 'User'
                const initials = name.slice(0, 2).toUpperCase()
                return (
                  <div key={p.id} className="list-row" style={{ position: 'relative', cursor: 'pointer' }}
                     onClick={() => window.location.href = `/profile/${p.username || p.id}`}>
                    <span className="avatar" style={{ width: 32, height: 32, fontSize: 9, overflow: 'hidden', position: 'relative' }}>
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.textContent = initials }} />
                      ) : initials}
                      <span style={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: '50%', background: 'var(--green)', border: '2px solid var(--surface)' }} />
                    </span>
                    <div className="side-copy"><b style={{ fontSize: 11 }}>{name}</b><small style={{ fontSize: 9 }}>{p.county_hub || 'Online'}</small></div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 2, flex: 'none' }} onClick={e => e.stopPropagation()}>
                      <button onClick={async (e) => { e.stopPropagation(); const res = await fetch('/api/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'follow', target_user_id: p.id }) }); if (res.ok) { const d = await res.json(); setFollowingIds(prev => { const n = new Set(prev); if (d.following) n.add(p.id); else n.delete(p.id); return n }) } }}
                        style={{ width: 24, height: 24, borderRadius: 6, border: 0, background: followingIds.has(p.id) ? 'var(--gold)' : 'var(--raised)', color: followingIds.has(p.id) ? 'var(--night)' : 'var(--muted)', cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 12 }}
                        title={followingIds.has(p.id) ? 'Unfollow' : 'Follow'}>{followingIds.has(p.id) ? '♥' : '♡'}</button>
                      <button onClick={() => window.location.href = `/messages?user=${p.id}`}
                        style={{ width: 24, height: 24, borderRadius: 6, border: 0, background: 'var(--raised)', color: 'var(--muted)', cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 9 }}
                        title="Message">◍</button>
                    </div>
                  </div>
                )
              })}
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
      </ToolbarProvider>

      {/* Chat widget — support conversation + online followers */}
      <div className={`chat${chatOpen ? ' open' : ''}`} role="dialog" aria-label="Messages" aria-live="polite">
        {chatConvId ? (
          <>
            <div className="chat-head">
              <button className="chat-close" style={{ marginRight: 4 }} onClick={() => setChatConvId(null)}>←</button>
              <span className="avatar g" style={{ width: 32, height: 32, fontSize: 10 }}>KC</span>
              <div className="chat-head-main">
                <b>KikwetuConnect</b>
                <small>Support &amp; updates</small>
              </div>
              <button className="chat-close" onClick={() => { setChatOpen(false); setChatConvId(null) }}>×</button>
            </div>
            <div className="chat-list" style={{ overflowY: 'auto', flex: 1 }}>
              {chatMessages.length === 0 ? (
                <div className="chat-msg">
                  <div className="bubble">Welcome to KikwetuConnect! How can we help?</div>
                </div>
              ) : chatMessages.map((msg: any) => {
                const isMe = msg.sender_id === profile?.id
                return (
                  <div key={msg.id} className={`chat-msg ${isMe ? 'me' : ''}`}>
                    <div className="bubble" style={{
                      background: isMe ? 'var(--gold)' : 'var(--raised)',
                      color: isMe ? 'var(--night)' : 'var(--ink)',
                    }}>{msg.content}</div>
                  </div>
                )
              })}
              <div ref={chatEndRef} />
            </div>
            <div className="chat-input">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleChatSend() } }}
                placeholder="Write a message..." disabled={!chatConvId} />
              <button onClick={handleChatSend} disabled={!chatConvId || !chatInput.trim() || chatSending}>↗</button>
            </div>
          </>
        ) : (
          <>
            <div className="chat-head">
              <span className="avatar g" style={{ width: 32, height: 32, fontSize: 10 }}>
                <MessageSquare className="w-4 h-4" style={{ color: 'var(--night)' }} />
              </span>
              <div className="chat-head-main">
                <b>Messages</b>
                <small>{onlineCount} online now</small>
              </div>
              <button className="chat-close" onClick={() => setChatOpen(false)}>×</button>
            </div>
            <div className="chat-list" style={{ overflowY: 'auto', flex: 1 }}>
              {onlineUsers.length === 0 ? (
                <div className="chat-msg">
                  <div className="bubble" style={{ color: 'var(--muted)' }}>No members online right now. Open a full chat to continue later.</div>
                </div>
              ) : onlineUsers.slice(0, 12).map((p: any) => {
                const name = p.full_name || p.username || 'User'
                return (
                  <div key={p.id} className="list-row" style={{ cursor: 'pointer' }}
                    onClick={() => window.location.href = `/messages?user=${p.id}`}>
                    <span className="avatar" style={{ width: 32, height: 32, fontSize: 9, overflow: 'hidden', position: 'relative' }}>
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.textContent = name.slice(0, 2).toUpperCase() }} />
                      ) : name.slice(0, 2).toUpperCase()}
                      <span style={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: '50%', background: 'var(--green)', border: '2px solid var(--surface)' }} />
                    </span>
                    <div className="side-copy"><b style={{ fontSize: 11 }}>{name}</b><small style={{ fontSize: 9 }}>{p.county_hub || 'Online'}</small></div>
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--gold)', flex: 'none' }}>Message →</span>
                  </div>
                )
              })}
              <div className="list-row" style={{ cursor: 'pointer' }} onClick={() => router.push('/messages')}>
                <span className="avatar" style={{ width: 32, height: 32, fontSize: 9, background: 'var(--raised)', color: 'var(--muted)' }}>⋯</span>
                <div className="side-copy"><b style={{ fontSize: 11 }}>All conversations</b><small style={{ fontSize: 9 }}>Full inbox</small></div>
                <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--gold)', flex: 'none' }}>Open →</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create modal */}
      <CreateModal />


    </>
  )
}
