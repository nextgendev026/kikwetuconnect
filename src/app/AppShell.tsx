'use client'
import Link from 'next/link'
import { useUser, useSupabase, useTheme, toast } from './providers'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, useRef } from 'react'
import CreateModal from '@/components/CreateModal'
import NotificationTray from '@/components/NotificationTray'
import FeedAd from '@/components/FeedAd'
import { ToolbarProvider } from '@/lib/toolbar'
import { trackActivity } from '@/lib/activity'
import { usePresence } from '@/hooks/usePresence'
import { useKeyboardViewport } from '@/hooks/useKeyboardViewport'
import { playMessageSound, playNotificationSound } from '@/lib/sound'
import { showNativeNotification, getSenderName } from '@/lib/browser-notify'
import { Send, MessageSquare, Bell, Sun, Moon, Award } from 'lucide-react'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useUser()
  const { theme, toggleTheme } = useTheme()
  const supabase = useSupabase()
  const router = useRouter()
  const path = usePathname()
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const { onlineCount, onlineUsers } = usePresence()
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
  const [followingUsers, setFollowingUsers] = useState<any[]>([])
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const searchBoxRef = useRef<HTMLDivElement>(null)

  useKeyboardViewport()

  // Auto-collapse the sidebar when the viewport narrows below the right-rail
  // breakpoint, and auto-expand when there's room again. No manual toggle.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1180px)')
    const apply = () => setSidebarCollapsed(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  // Load suggested users for the right rail (region / interests / likes based)
  useEffect(() => {
    if (!profile || !supabase) return
    let cancelled = false
    setSuggestionsLoading(true)
    ;(async () => {
      try {
        const { data } = await supabase.rpc('get_user_recommendations', { p_limit: 6 })
        if (cancelled) return
        const filtered = Array.isArray(data)
          ? (data as any[]).filter(u => u && u.id !== profile.id && !followingIds.has(u.id)).slice(0, 6)
          : []
        setSuggestions(filtered)
      } catch { if (!cancelled) setSuggestions([]) }
      finally { if (!cancelled) setSuggestionsLoading(false) }
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, supabase, followingIds.size])

  // Close the search dropdown on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  // Debounced live search against /api/search (posts, profiles, topics)
  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 2) {
      setSearchResults([])
      setSearchLoading(false)
      setSearchOpen(false)
      return
    }
    setSearchOpen(true)
    setSearchLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
        if (!res.ok) throw new Error('search failed')
        const data = await res.json()
        const items: any[] = [
          ...(data.posts || []).map((p: any) => ({ ...p, _type: 'post', label: p.title || p.content?.slice(0, 60) })),
          ...(data.profiles || []).map((p: any) => ({ ...p, _type: 'profile', label: p.full_name || p.username })),
          ...(data.topics || []).map((t: any) => ({ ...t, _type: 'topic', label: t.name })),
        ].slice(0, 8)
        setSearchResults(items)
      } catch {
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const submitSearch = () => {
    const q = searchQuery.trim()
    if (!q) return
    setSearchOpen(false)
    router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  const goToResult = (r: any) => {
    setSearchOpen(false)
    if (r._type === 'post') router.push(`/posts/${r.id}`)
    else if (r._type === 'profile') router.push(`/profile/${r.username || r.id}`)
    else if (r._type === 'topic') router.push(`/topics/${r.slug || r.id}`)
  }

  // Recognize existing follow relationships so Community follow buttons reflect real state
  useEffect(() => {
    if (!profile || !supabase) return
    supabase.from('follows').select('following_id').eq('follower_id', profile.id)
      .then(async ({ data }) => {
        const rows = (data as any[] | null) || []
        const ids = rows.map(f => f.following_id).filter(Boolean)
        setFollowingIds(new Set(ids))
        if (ids.length === 0) { setFollowingUsers([]); return }
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, county_hub, is_verified_expert')
          .in('id', ids)
        setFollowingUsers(profiles || [])
      })
  }, [profile, supabase])

  // Record one session-start event per shell mount (activity engine / patterns)
  const sessionTrackedRef = useRef(false)
  useEffect(() => {
    if (!profile || !supabase || sessionTrackedRef.current) return
    sessionTrackedRef.current = true
    void trackActivity(supabase, { eventType: 'session_started', metadata: { path } }, profile.id)
  }, [profile, supabase, path])

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

  // Live notification + message sounds and badge updates.
  const shellNotifChannelRef = useRef<any>(null)
  const shellMsgChannelRef = useRef<any>(null)
  const shellMsgPollRef = useRef<any>(null)
  useEffect(() => {
    if (!profile || !supabase) return

    const notifChannel = supabase.channel('shell-notifications')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${profile.id}`,
      }, () => fetchUnreadCount())
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${profile.id}`,
      }, () => fetchUnreadCount())
      .subscribe()
    shellNotifChannelRef.current = notifChannel

    const onMessage = (payload: any) => {
      const m = payload.new as any
      if (!m || m.sender_id === profile.id) return
      playMessageSound()
      fetchUnreadCount()
      getSenderName(supabase, m.sender_id).then(name => {
        showNativeNotification({
          title: 'New message',
          body: `${name}: ${m.content || '📷 Image'}`,
          url: `/messages?conversation_id=${m.conversation_id}`,
          tag: `msg-${m.conversation_id}`,
        })
      })
    }
    const fetchConvIds = async () => {
      const { data } = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', profile.id)
      return (data || []).map(c => c.conversation_id).filter(Boolean) as string[]
    }
    const subscribeTo = (ids: string[]) => {
      if (ids.length === 0) return
      if (shellMsgChannelRef.current) supabase.removeChannel(shellMsgChannelRef.current)
      const msgChannel = supabase.channel(`shell-messages-${ids.length}-${ids[0]}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'messages',
          filter: `conversation_id=in.(${ids.join(',')})`,
        }, onMessage)
        .subscribe()
      shellMsgChannelRef.current = msgChannel
    }

    let currentIds: string[] = []
    ;(async () => {
      currentIds = await fetchConvIds()
      subscribeTo(currentIds)
      shellMsgPollRef.current = setInterval(async () => {
        // Skip polling while the tab is hidden (background tabs shouldn't churn).
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
        const next = await fetchConvIds()
        const changed = next.length !== currentIds.length || next.some(id => !currentIds.includes(id))
        if (changed) {
          currentIds = next
          subscribeTo(next)
        }
      }, 60000)
    })()

    return () => {
      if (shellNotifChannelRef.current) supabase.removeChannel(shellNotifChannelRef.current)
      if (shellMsgChannelRef.current) supabase.removeChannel(shellMsgChannelRef.current)
      if (shellMsgPollRef.current) clearInterval(shellMsgPollRef.current)
    }
  }, [profile, supabase, fetchUnreadCount])

  useEffect(() => {
    if (!supabase) return
    // Use estimated counts: exact COUNT on the biggest tables is expensive and
    // these are informational stats in the Activity panel.
    supabase.from('profiles').select('id', { count: 'estimated', head: true }).then(({ count }: { count: number | null }) => { if (count !== null) setUserCount(count ?? 0) })
    supabase.from('posts').select('id', { count: 'estimated', head: true }).then(({ count }: { count: number | null }) => { if (count !== null) setPostCount(count ?? 0) })
    supabase.from('topics').select('name').order('follower_count', { ascending: false }).limit(3).then(({ data }: { data: any }) => { if (data) setTrendingTopics(data) })
    // Moderation queue is staff-only info — skip loading it for regular members.
    if (profile && (profile.role === 'admin' || profile.role === 'moderator')) {
      supabase.from('moderation_queue').select('id', { count: 'estimated', head: true }).then(({ count }: { count: number | null }) => { if (count !== null) setModerationCount(count ?? 0) })
    }
  }, [supabase, profile])

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
  const onlineIdSet = new Set(onlineUsers.map(u => u.id))
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
        <div className={`app${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
          {/* Sidebar */}
          <Sidebar initials={initials} profile={profile} following={followingUsers} onlineIds={onlineIdSet} collapsed={sidebarCollapsed} />

          {/* Main */}
          <main className="main">
            <header className="topbar">
              <Link href="/feed" className="topbar-brand">
                <span className="mark" style={{ width: 30, height: 30, fontSize: 15, transform: 'rotate(-4deg)' }}>k</span>
                <span className="topbar-brand-text">kikwetu<span style={{ color: 'var(--gold)' }}>.</span></span>
              </Link>
              <div className="search" id="global-search" ref={searchBoxRef}>
                <button className="search-toggle" onClick={(e) => { e.currentTarget.closest('.search')?.classList.toggle('expanded'); (e.currentTarget.closest('.search')?.querySelector('input') as HTMLInputElement)?.focus() }} aria-label="Search">⌕</button>
                <input
                  aria-label="Search Baraza, spaces, people..."
                  placeholder="Search posts, people, topics..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); e.currentTarget.closest('.search')?.classList.add('expanded') }}
                  onFocus={(e) => { e.currentTarget.closest('.search')?.classList.add('expanded'); if (searchQuery.trim().length >= 2) setSearchOpen(true) }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitSearch()
                    if (e.key === 'Escape') { setSearchOpen(false); }
                  }}
                />
                {searchOpen && searchQuery.trim().length >= 2 && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 50,
                    background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14,
                    boxShadow: '0 12px 32px color-mix(in oklab, var(--night) 18%, transparent)',
                    overflow: 'hidden',
                  }}>
                    {searchLoading ? (
                      <div style={{ padding: '14px 18px', fontSize: 12, color: 'var(--muted)' }}>Searching…</div>
                    ) : searchResults.length === 0 ? (
                      <div style={{ padding: '14px 18px', fontSize: 12, color: 'var(--muted)' }}>
                        No results for “{searchQuery.trim()}”. <span style={{ color: 'var(--gold)', cursor: 'pointer' }} onClick={submitSearch}>View all →</span>
                      </div>
                    ) : (
                      <>
                        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                          {searchResults.map((r, i) => (
                            <button key={`${r._type}-${r.id}-${i}`} onClick={() => goToResult(r)}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--raised)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                              style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                                background: 'none', border: 0, cursor: 'pointer', textAlign: 'left', transition: 'background .15s',
                              }}>
                              <span style={{
                                flex: 'none', width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center',
                                fontSize: 11, fontWeight: 700,
                                background: r._type === 'profile' ? 'color-mix(in oklab, var(--blue) 18%, var(--surface))' : r._type === 'topic' ? 'color-mix(in oklab, var(--gold) 18%, var(--surface))' : 'color-mix(in oklab, var(--green) 18%, var(--surface))',
                                color: r._type === 'profile' ? 'var(--blue)' : r._type === 'topic' ? 'var(--gold)' : 'var(--green)',
                              }}>
                                {r._type === 'profile' ? (r.full_name || r.username || '?').slice(0, 1).toUpperCase() : r._type === 'topic' ? '#' : 'P'}
                              </span>
                              <span style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {r._type === 'profile' ? (r.full_name || `@${r.username}`) : r.label}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                  {r._type === 'post' && (
                                    <span style={{
                                      flex: 'none', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 6,
                                      color: 'var(--gold)', border: '1px solid color-mix(in oklab, var(--gold) 40%, var(--line))',
                                    }}>
                                      {r.post_type === 'article' ? 'Article' : r.post_type === 'poll' ? 'Poll' : r.post_type === 'inquiry' ? 'Question' : 'Post'}
                                    </span>
                                  )}
                                  <span style={{ fontSize: 10.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {r._type === 'profile' ? `@${r.username}${r.county_hub ? ` · ${r.county_hub}` : ''}${r.is_verified_expert ? ' · ✓ Expert' : ''}` : r._type === 'post' ? (r.content ? r.content.slice(0, 60) : 'Post') : `${r.follower_count ?? 0} followers`}
                                  </span>
                                </span>
                              </span>
                            </button>
                          ))}
                        </div>
                        <button onClick={submitSearch} style={{
                          width: '100%', padding: '12px 16px', border: 0, borderTop: '1px solid var(--line)',
                          background: 'color-mix(in oklab, var(--gold) 8%, var(--surface))', color: 'var(--gold)',
                          fontSize: 12, fontWeight: 700, cursor: 'pointer', textAlign: 'center',
                        }}>View all results for “{searchQuery.trim()}”</button>
                      </>
                    )}
                  </div>
                )}
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

            <section className="page active" style={path === '/messages' ? { padding: 0 } : { minHeight: 'calc(100vh - 33px)' }}>
              {children}
            </section>
          </main>

          {path !== '/messages' && <MobileNav />}

          {/* Right Panel */}
          <aside className="right-panel">
          <details className="side-section" open>
            <summary>Your Heshima</summary>
            <div className="side-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="avatar g" style={{ width: 46, height: 46, fontSize: 16 }}>
                  <Award className="w-5 h-5" style={{ color: 'var(--green)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ display: 'block', fontWeight: 800, fontSize: 22, letterSpacing: '-.06em', fontFamily: 'var(--jakarta)', lineHeight: 1.1 }}>{profile.heshima_rating ?? 0}</strong>
                  <small style={{ fontSize: 10, color: 'var(--muted)' }}>Heshima rating · streak {Number((profile as any).streak_days) || 0}d</small>
                </div>
              </div>
              <Link href="/wallet" className="btn" style={{ background: 'var(--gold)', color: 'var(--night)', width: '100%', justifyContent: 'center', marginTop: 12 }}>View wallet &amp; rewards</Link>
            </div>
          </details>

          <details className="side-section" open>
            <summary>Suggested for you</summary>
            <div className="side-body">
              {suggestionsLoading ? (
                <small className="text-muted">Finding people…</small>
              ) : suggestions.length === 0 ? (
                <small className="text-muted">No suggestions yet.</small>
              ) : suggestions.map((u: any) => {
                const isFollowing = followingIds.has(u.id)
                const name = u.full_name || u.username || 'User'
                const initials = name.slice(0, 2).toUpperCase()
                return (
                  <div key={u.id} className="list-row" style={{ cursor: 'pointer' }}
                    onClick={() => window.location.href = `/profile/${u.username || u.id}`}>
                    <span className="avatar" style={{ width: 32, height: 32, fontSize: 9, overflow: 'hidden', position: 'relative' }}>
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.textContent = initials }} />
                      ) : initials}
                      {u.is_verified_expert && (
                        <span style={{ position: 'absolute', bottom: -1, right: -1, background: 'var(--green)', color: '#fff', borderRadius: '50%', width: 11, height: 11, fontSize: 7, display: 'grid', placeItems: 'center' }}>✓</span>
                      )}
                    </span>
                    <div className="side-copy">
                      <b>{name}</b>
                      <small>{u.county_hub || 'Kenya'}{u.is_verified_expert ? ' · Expert' : ''}</small>
                    </div>
                    <button
                      onClick={async (e) => { e.stopPropagation(); const res = await fetch('/api/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'follow', target_user_id: u.id }) }); if (res.ok) { const d = await res.json(); if (d.following) { setFollowingIds(prev => new Set(prev).add(u.id)); setSuggestions(prev => prev.filter(x => x.id !== u.id)) } } }}
                      style={{ flex: 'none', padding: '5px 12px', borderRadius: 8, border: 0, cursor: 'pointer', fontWeight: 700, fontSize: 10, background: 'var(--gold)', color: 'var(--night)' }}
                      title="Follow">Follow</button>
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

          <div id="right-rail-ad"><FeedAd placement="sidebar" compact /></div>
        </aside>
      </div>
      </ToolbarProvider>

      {/* Chat widget — support conversation + online followers */}
      <div className={`chat${chatOpen ? ' open' : ''}`} role="dialog" aria-label="Messages" aria-live="polite">
        {chatConvId ? (
          <>
            <div className="chat-head">
              <button className="chat-close" style={{ marginRight: 4 }} onClick={() => setChatConvId(null)} aria-label="Back to conversations">←</button>
              <span className="avatar g" style={{ width: 32, height: 32, fontSize: 10 }}>KC</span>
              <div className="chat-head-main">
                <b>KikwetuConnect</b>
                <small>Support &amp; updates</small>
              </div>
              <button className="chat-close" onClick={() => { setChatOpen(false); setChatConvId(null) }} aria-label="Close chat">×</button>
            </div>
            <div className="chat-list" style={{ overflowY: 'auto', flex: 1 }}>
              {chatMessages.length === 0 ? (
                <div className="chat-msg">
                  <div className="chat-bubble">Welcome to KikwetuConnect! How can we help?</div>
                </div>
              ) : chatMessages.map((msg: any) => {
                const isMe = msg.sender_id === profile?.id
                return (
                  <div key={msg.id} className={`chat-msg ${isMe ? 'me' : ''}`}>
                    <div className="chat-bubble">{msg.content}</div>
                  </div>
                )
              })}
              <div ref={chatEndRef} />
            </div>
            <div className="chat-input">
              <textarea value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend() } }}
                placeholder="Write a message..." disabled={!chatConvId} rows={1}
                style={{ minHeight: 40, maxHeight: 100, resize: 'none' }} />
              <button onClick={handleChatSend} disabled={!chatConvId || !chatInput.trim() || chatSending} aria-label="Send message">↗</button>
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
              <button className="chat-close" onClick={() => setChatOpen(false)} aria-label="Close messages">×</button>
            </div>
            <div className="chat-list" style={{ overflowY: 'auto', flex: 1 }}>
              {followingUsers.length === 0 ? (
                <div className="chat-msg">
                  <div className="chat-bubble" style={{ color: 'var(--muted)' }}>You are not following anyone yet. Open a full chat to continue later.</div>
                </div>
              ) : followingUsers.slice(0, 12).map((p: any) => {
                const name = p.full_name || p.username || 'User'
                const isOnline = onlineIdSet.has(p.id)
                return (
                  <div key={p.id} className="list-row" style={{ cursor: 'pointer' }}
                    onClick={() => window.location.href = `/messages?user=${p.id}`}>
                    <span className="avatar" style={{ width: 32, height: 32, fontSize: 9, overflow: 'hidden', position: 'relative' }}>
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.textContent = name.slice(0, 2).toUpperCase() }} />
                      ) : name.slice(0, 2).toUpperCase()}
                      <span style={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: '50%', background: isOnline ? 'var(--green)' : 'var(--faint)', border: '2px solid var(--surface)' }} />
                    </span>
                    <div className="side-copy"><b style={{ fontSize: 11 }}>{name}</b><small style={{ fontSize: 9, color: isOnline ? 'var(--green)' : 'var(--muted)' }}>{isOnline ? 'Online' : (p.county_hub || 'Offline')}</small></div>
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
