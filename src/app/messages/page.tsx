'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useSupabase, useUser, toast } from '@/app/providers'
import { MessageSquare, Search, ArrowLeft, Send, Check, CheckCheck, Clock } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface Conversation {
  id: string
  type: string
  title: string | null
  last_message: string | null
  last_message_at: string | null
  updated_at: string
  created_at: string
  created_by: string | null
  participants: Array<{ id: string; username: string; full_name: string; avatar_url: string | null }>
}

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  message_type: string
  metadata: any
  reply_to: string | null
  status: string
  created_at: string
  read_at: string | null
  sender: { id: string; username: string; full_name: string; avatar_url: string | null } | null
}

export default function MessagesPage() {
  const { user, profile } = useUser()
  const supabase = useSupabase()
  const searchParams = useSearchParams()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeConv, setActiveConv] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [msgLoading, setMsgLoading] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<any>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => { scrollToBottom() }, [messages])

  // Auto-select conversation from URL param after conversations load
  useEffect(() => {
    const convId = searchParams.get('conversation_id')
    if (convId && conversations.length > 0) {
      const exists = conversations.some(c => c.id === convId)
      if (exists) { setActiveConv(convId); return }
      // Newly created — refetch to include it
      fetchConversations().then(() => setActiveConv(convId))
    }
  }, [searchParams, conversations])

  const fetchConversations = useCallback(async () => {
    if (!user) return
    const res = await fetch('/api/conversations')
    if (res.ok) {
      const data = await res.json()
      setConversations(data)
    }
    setLoading(false)
  }, [user])

  const fetchMessages = useCallback(async (convId: string) => {
    setMsgLoading(true)
    const res = await fetch(`/api/messages?conversation_id=${convId}`)
    if (res.ok) {
      const data = await res.json()
      setMessages(data)
      // Mark read
      await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: convId }),
      })
    }
    setMsgLoading(false)
  }, [])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    if (!user || !supabase) return
    const channel = supabase.channel('messages-global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchConversations()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, user, fetchConversations])

  // Realtime per conversation
  useEffect(() => {
    if (!activeConv || !supabase) return
    if (channelRef.current) { supabase.removeChannel(channelRef.current) }
    const channel = supabase.channel(`msg-${activeConv}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${activeConv}`,
      }, (payload: any) => {
        const msg = payload.new as Message
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
      })
      .subscribe()
    channelRef.current = channel
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [activeConv, supabase])

  const selectConversation = async (convId: string) => {
    setActiveConv(convId)
    await fetchMessages(convId)
  }

  const sendMessage = async () => {
    if (!input.trim() || !activeConv || sending) return
    setSending(true)
    const content = input.trim()
    setInput('')
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: activeConv, content }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      await fetchConversations()
    } catch (e: any) {
      toast(e.message || 'Failed to send')
    }
    setSending(false)
  }

  const getOtherParticipants = (conv: Conversation) => {
    if (!profile) return []
    return conv.participants.filter(p => p.id !== profile.id)
  }

  const conversationTitle = (conv: Conversation) => {
    const others = getOtherParticipants(conv)
    if (conv.title && conv.type === 'group') return conv.title
    if (conv.type === 'support') return 'KikwetuConnect Support'
    return others.map(p => p.full_name || p.username).join(', ') || 'Unknown'
  }

  const getInitials = (name: string) => (name || '?').slice(0, 2).toUpperCase()

  const formatTime = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60000) return 'now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`
    return d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })
  }

  const filteredConvs = conversations.filter(c => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return conversationTitle(c).toLowerCase().includes(q) || (c.last_message || '').toLowerCase().includes(q)
  })

  const activeConvData = conversations.find(c => c.id === activeConv)

  if (!user || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <MessageSquare className="w-12 h-12 mb-4" style={{ color: 'var(--muted)', opacity: 0.3 }} />
        <p className="text-muted mb-4">Sign in to see messages</p>
        <Link href="/login" className="btn btn-primary">Sign in</Link>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 140px)', gap: 1, background: 'var(--line)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--line)' }}>
      {/* Conversation List */}
      <div style={{ width: 320, minWidth: 260, background: 'var(--bg)', display: 'flex', flexDirection: 'column', flexShrink: 0, borderRight: '1px solid var(--line)' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Messages</h2>
            <Link href="/messages" style={{ color: 'var(--green)', fontSize: 12 }}>New</Link>
          </div>
          <div style={{ position: 'relative' }}>
            <Search className="w-4 h-4" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              style={{ width: '100%', padding: '8px 8px 8px 32px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--raised)', fontSize: 13, outline: 'none' }}
            />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin w-5 h-5 border-2" style={{ borderColor: 'var(--green)', borderTopColor: 'transparent', borderRadius: '50%' }} /></div>
          ) : filteredConvs.length === 0 ? (
            <div className="text-center py-8 px-4">
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>{searchQuery ? 'No matches' : 'No conversations yet'}</p>
              {!searchQuery && <p style={{ color: 'var(--muted)', fontSize: 11, marginTop: 4 }}>Visit a profile and click Message</p>}
            </div>
          ) : filteredConvs.map(conv => {
            const others = getOtherParticipants(conv)
            const avatarUser = others[0]
            const isActive = conv.id === activeConv
            return (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                style={{
                  padding: '12px 16px', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center',
                  background: isActive ? 'var(--raised)' : 'transparent',
                  borderBottom: '1px solid var(--line)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--raised)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--gold-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--gold)', flexShrink: 0, overflow: 'hidden' }}>
                  {avatarUser?.avatar_url ? (
                    <img src={avatarUser.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : getInitials(avatarUser?.full_name || avatarUser?.username || 'S')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{conversationTitle(conv)}</span>
                    <span style={{ fontSize: 10, color: 'var(--muted)', flexShrink: 0 }}>{conv.last_message_at ? formatTime(conv.last_message_at) : ''}</span>
                  </div>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.last_message || 'No messages yet'}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Message Pane */}
      <div style={{ flex: 1, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        {!activeConv ? (
          <div className="flex flex-col items-center justify-center h-full">
            <MessageSquare className="w-16 h-16 mb-4" style={{ color: 'var(--muted)', opacity: 0.15 }} />
            <p style={{ color: 'var(--muted)', fontSize: 14, fontWeight: 500 }}>Select a conversation</p>
            <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>Choose from the left or visit a profile to start a chat</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => setActiveConv(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'none', padding: 4 }} className="back-btn">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gold-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--gold)', flexShrink: 0, overflow: 'hidden' }}>
                {activeConvData ? (() => {
                  const others = getOtherParticipants(activeConvData)
                  const u = others[0]
                  return u?.avatar_url ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(u?.full_name || u?.username || '?')
                })() : '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{activeConvData ? conversationTitle(activeConvData) : 'Loading...'}</span>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)' }}>{activeConvData?.type === 'support' ? 'KikwetuConnect Support' : activeConvData?.type === 'session' ? 'Session chat' : 'Direct message'}</p>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {msgLoading ? (
                <div className="flex justify-center py-8"><div className="animate-spin w-5 h-5 border-2" style={{ borderColor: 'var(--green)', borderTopColor: 'transparent', borderRadius: '50%' }} /></div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <p style={{ color: 'var(--muted)', fontSize: 13 }}>No messages yet</p>
                  <p style={{ color: 'var(--muted)', fontSize: 11 }}>Say hello!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {messages.map(msg => {
                    const isMe = msg.sender_id === profile.id
                    const showAvatar = !isMe
                    return (
                      <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 6 }}>
                        {showAvatar && (
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
                            {msg.sender?.avatar_url ? <img src={msg.sender.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(msg.sender?.full_name || msg.sender?.username || '?')}
                          </div>
                        )}
                        <div style={{ maxWidth: '70%', minWidth: 60 }}>
                          <div style={{
                            padding: '8px 14px', borderRadius: 16, fontSize: 13, lineHeight: 1.45, wordBreak: 'break-word',
                            background: isMe ? 'var(--gold)' : 'var(--raised)',
                            color: isMe ? 'var(--night)' : 'var(--ink)',
                            borderBottomRightRadius: isMe ? 4 : 16,
                            borderBottomLeftRadius: isMe ? 16 : 4,
                          }}>
                            {msg.content}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                            <span style={{ fontSize: 9, color: 'var(--muted)' }}>{formatTime(msg.created_at)}</span>
                            {isMe && (
                              msg.status === 'read' ? <CheckCheck className="w-3 h-3" style={{ color: 'var(--green)' }} />
                              : msg.status === 'sent' ? <Check className="w-3 h-3" style={{ color: 'var(--muted)' }} />
                              : <Clock className="w-3 h-3" style={{ color: 'var(--muted)' }} />
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Composer */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder="Write a message..."
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 12, border: '1px solid var(--line)',
                  background: 'var(--raised)', fontSize: 13, outline: 'none', resize: 'none',
                  lineHeight: 1.4, maxHeight: 100,
                }}
                disabled={sending}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                style={{
                  width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0,
                  background: input.trim() ? 'var(--gold)' : 'var(--line)',
                  color: input.trim() ? 'var(--night)' : 'var(--muted)',
                  display: 'grid', placeItems: 'center', transition: 'all 0.15s',
                }}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
