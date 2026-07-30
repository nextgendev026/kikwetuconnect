'use client'
import Link from 'next/link'
import { useUser, useSupabase, useTheme, toast } from './providers'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, useRef } from 'react'
import CreateModal from '@/components/CreateModal'
import { ToolbarProvider } from '@/lib/toolbar'
import { Send, MessageSquare } from 'lucide-react'

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
  const [recentProfiles, setRecentProfiles] = useState<any[]>([])
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
      // Only redirect if not already on a public path (avoid loop with middleware)
      const publicPaths = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/onboarding']
      const isPublic = publicPaths.some(p => path === p || path.startsWith(p))
      if (!isPublic) router.push('/')
    }
  }, [loading, profile, router, path])

  useEffect(() => {
    if (!profile || !supabase) return
    fetchUnreadCount()
  }, [profile, supabase, fetchUnreadCount])

  useEffect(() => {
    if (!supabase) return
    supabase.from('profiles').select('id', { count: 'exact', head: true }).then(({ count }: { count: number | null }) => { if (count !== null) setUserCount(count ?? 0) })
    supabase.from('profiles').select('id, username, full_name').limit(5).then(({ data }: { data: any }) => { if (data) setRecentProfiles(data) })
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

  const openSupportChat = useCallback(async () => {
    if (!profile || !supabase) return
    setChatOpen(true)
    if (chatConvId) {
      const res = await fetch(`/api/messages?conversation_id=${chatConvId}`)
      if (res.ok) setChatMessages(await res.json())
      return
    }
    const { data: convs } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', profile.id)
    if (convs && convs.length > 0) {
      const cIds = convs.map((c: any) => c.conversation_id)
      const { data: supportConvs } = await supabase
        .from('conversations')
        .select('id')
        .in('id', cIds)
        .eq('type', 'support')
        .limit(1)
      if (supportConvs && supportConvs.length > 0) {
        setChatConvId(supportConvs[0].id)
        const res = await fetch(`/api/messages?conversation_id=${supportConvs[0].id}`)
        if (res.ok) setChatMessages(await res.json())
        return
      }
    }
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'support', title: 'KikwetuConnect Support', member_ids: [] }),
    })
    if (res.ok) {
      const { conversation_id } = await res.json()
      setChatConvId(conversation_id)
      setChatMessages([])
    }
  }, [profile, supabase, chatConvId])

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
  const noLayout = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email'].includes(path) || path.startsWith('/auth')
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
          <Sidebar initials={initials} profile={profile} theme={theme} toggleTheme={toggleTheme} onlineCount={onlineCount} onlineUsers={onlineUsers} />

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
                <Link href="/notifications" className="icon" aria-label={unreadNotifCount > 0 ? `${unreadNotifCount} unread notifications` : 'Notifications'} title="Notifications" style={{ position: 'relative' }}>
                  ♡
                  {unreadNotifCount > 0 && (
                    <span style={{
                      position: 'absolute', top: -2, right: -2,
                      background: 'var(--red)', color: '#fff',
                      fontSize: 8, fontWeight: 700, minWidth: 16, height: 16,
                      borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 3px', lineHeight: 1,
                    }}>{unreadNotifCount > 99 ? '99+' : unreadNotifCount}</span>
                  )}
                </Link>
                <button className="icon" style={{ position: 'relative' }} onClick={() => { if (chatOpen) { setChatOpen(false) } else { openSupportChat() } }} aria-label={chatOpen ? 'Close chat' : 'Open chat'} title="Messages">
                  ◍
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
      </ToolbarProvider>

      {/* Chat widget — support conversation */}
      <div className={`chat${chatOpen ? ' open' : ''}`} role="dialog" aria-label="Support chat" aria-live="polite">
        <div className="chat-head">
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
      </div>

      {/* Create modal */}
      <CreateModal />


    </>
  )
}
