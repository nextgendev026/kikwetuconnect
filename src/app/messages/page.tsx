'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Search, Send, Paperclip, Mic, MoreVertical, Shield, Flag, AlertTriangle, Phone, Video, ChevronLeft, Clock, CheckCheck } from 'lucide-react'
import { useSupabase, useUser, toast } from '@/app/providers'
import { Button } from '@/components/ui/form'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface Profile {
  id: string
  full_name: string
  username: string
  avatar_url: string | null
}

interface Message {
  id: string
  session_id: string | null
  sender_id: string
  receiver_id: string
  content: string
  file_url: string | null
  is_read: boolean
  created_at: string
}

interface Conversation {
  otherUser: Profile
  lastMessage: Message
  unreadCount: number
  online?: boolean
  sessionId?: string
  sessionStatus?: string
}

interface SessionBrief {
  id: string
  status: string
  topic: string
  scheduled_at: string | null
}

export default function MessagesPage() {
  const { profile, loading: userLoading } = useUser()
  const supabase = useSupabase()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [msgText, setMsgText] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread' | 'active' | 'completed'>('all')
  const [activeSession, setActiveSession] = useState<SessionBrief | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (profile) fetchConversations()
  }, [profile])

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  useEffect(() => {
    if (!profile || !selectedUserId) return
    fetchMessages(selectedUserId)
    subscribeToMessages(selectedUserId)
  }, [selectedUserId, profile])

  const fetchConversations = async () => {
    if (!profile) return
    setLoading(true)
    try {
      const { data: sentData } = await supabase
        .from('messages')
        .select('*')
        .eq('sender_id', profile.id)
        .order('created_at', { ascending: false })

      const { data: receivedData } = await supabase
        .from('messages')
        .select('*')
        .eq('receiver_id', profile.id)
        .order('created_at', { ascending: false })

      const all = [...(sentData || []), ...(receivedData || [])] as Message[]
      const grouped = new Map<string, { messages: Message[]; otherId: string }>()

      for (const msg of all) {
        const otherId = msg.sender_id === profile.id ? msg.receiver_id : msg.sender_id
        if (!grouped.has(otherId)) grouped.set(otherId, { messages: [], otherId })
        grouped.get(otherId)!.messages.push(msg)
      }

      const conversationPromises = Array.from(grouped.entries()).map(async ([otherId, { messages }]) => {
        const sorted = messages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        const unread = messages.filter(m => m.receiver_id === profile.id && !m.is_read).length
        const { data: otherProfile } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .eq('id', otherId)
          .single()

        return {
          otherUser: otherProfile as Profile,
          lastMessage: sorted[0],
          unreadCount: unread,
        } as Conversation
      })

      const convs = await Promise.all(conversationPromises)
      setConversations(convs)
    } catch (err) {
      console.error('Error fetching conversations:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (otherUserId: string) => {
    if (!profile) return
    setChatLoading(true)
    try {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${profile.id})`)
        .order('created_at', { ascending: true })

      setMessages((data || []) as Message[])

      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_id', profile.id)
        .eq('sender_id', otherUserId)
        .eq('is_read', false)

      if (selectedUserId === otherUserId) {
        setConversations(prev => prev.map(c =>
          c.otherUser.id === otherUserId ? { ...c, unreadCount: 0 } : c
        ))
      }
    } catch (err) {
      console.error('Error fetching messages:', err)
    } finally {
      setChatLoading(false)
    }
  }

  const subscribeToMessages = (otherUserId: string) => {
    if (!profile) return
    const channel = supabase
      .channel(`messages:${profile.id}:${otherUserId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${profile.id}`,
      }, (payload: RealtimePostgresChangesPayload<Message>) => {
        const newMsg = payload.new as Message
        if (newMsg.sender_id === otherUserId) {
          setMessages(prev => [...prev, newMsg])
          setConversations(prev => prev.map(c =>
            c.otherUser.id === otherUserId
              ? { ...c, lastMessage: newMsg, unreadCount: 0 }
              : c
          ))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }

  const handleSend = async () => {
    if (!profile || !selectedUserId || !msgText.trim()) return
    const content = msgText.trim()
    setMsgText('')
    try {
      const { error } = await supabase.from('messages').insert({
        sender_id: profile.id,
        receiver_id: selectedUserId,
        content,
        session_id: activeSession?.id || null,
      })
      if (error) throw error
    } catch (err) {
      toast('Failed to send message')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleReportBlock = async (userId: string, action: 'report' | 'block') => {
    if (action === 'report') {
      await supabase.from('moderation').insert({
        target_type: 'user',
        target_id: userId,
        reporter_id: profile?.id,
        reason: 'inappropriate_behavior',
      })
    }
    toast(`User ${action}ed`)
  }

  const filteredConversations = conversations.filter(c => {
    if (filter === 'unread') return c.unreadCount > 0
    if (filter === 'active') return c.lastMessage.session_id
    return true
  }).filter(c => {
    if (!searchTerm) return true
    const q = searchTerm.toLowerCase()
    return (c.otherUser.full_name || c.otherUser.username).toLowerCase().includes(q)
  })

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const formatTime = (ts: string) => {
    const d = new Date(ts)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60000) return 'now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`
    return d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })
  }

  const selectedConv = conversations.find(c => c.otherUser.id === selectedUserId)

  if (userLoading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-2 border-green border-t-transparent rounded-full" /></div>

  return (
    <>
      <section className="page-head">
        <h1 className="page-title">Messages</h1>
        <p className="text-muted text-sm">Private conversations</p>
      </section>

      <div className="flex flex-col md:flex-row gap-0 md:gap-4" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {/* Conversation List */}
        <div className={`w-full md:w-[340px] flex-shrink-0 ${selectedUserId ? 'hidden md:block' : 'block'}`}>
          <div className="card section mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[11px] pl-10 pr-4 py-2 text-sm text-cream placeholder-[var(--muted)] focus:outline-none focus:border-[var(--green)]"
              />
            </div>
          </div>

          <div className="flex gap-1 mb-4 flex-wrap">
            {(['all', 'unread', 'active', 'completed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filter === f
                    ? 'bg-[var(--green)] text-[var(--night)]'
                    : 'bg-[var(--surface)] text-[var(--muted)] hover:text-cream border border-[var(--line)]'
                }`}
              >
                {f === 'all' && 'All'}
                {f === 'unread' && 'Unread'}
                {f === 'active' && 'Active sessions'}
                {f === 'completed' && 'Completed'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-green border-t-transparent rounded-full" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="card section text-center py-8">
              <p className="text-[var(--muted)] text-sm">No conversations</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map(conv => (
                <button
                  key={conv.otherUser.id}
                  onClick={() => setSelectedUserId(conv.otherUser.id)}
                  className={`w-full text-left card section flex items-start gap-3 transition-colors ${
                    selectedUserId === conv.otherUser.id
                      ? 'border-[var(--green)]/50 bg-[var(--green)]/5'
                      : 'hover:bg-[var(--raised)]'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--green)] to-[var(--gold)] flex items-center justify-center text-xs font-bold text-[var(--night)]">
                      {conv.otherUser.avatar_url ? (
                        <img src={conv.otherUser.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        getInitials(conv.otherUser.full_name || conv.otherUser.username)
                      )}
                    </div>
                    {conv.online && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[var(--green)] rounded-full border-2 border-[oklch(14%_.025_151)]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm truncate">
                        {conv.otherUser.full_name || conv.otherUser.username}
                      </span>
                      <span className="text-[10px] text-[var(--muted)] flex-shrink-0 ml-2">
                        {formatTime(conv.lastMessage.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted)] truncate mt-0.5">
                      {conv.lastMessage.sender_id === profile?.id && 'You: '}
                      {conv.lastMessage.content}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--green)] text-[10px] font-bold text-[var(--night)] mt-1">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chat View */}
        <div className={`flex-1 flex flex-col ${selectedUserId ? 'block' : 'hidden md:block'}`}>
          {selectedUserId && selectedConv ? (
            <div className="card section flex flex-col h-full md:min-h-[600px]">
              {/* Chat Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[var(--line)] mb-4">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedUserId(null)} className="md:hidden p-1 -ml-1 text-[var(--muted)] hover:text-cream">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--green)] to-[var(--gold)] flex items-center justify-center text-xs font-bold text-[var(--night)]">
                      {selectedConv.otherUser.avatar_url ? (
                        <img src={selectedConv.otherUser.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        getInitials(selectedConv.otherUser.full_name || selectedConv.otherUser.username)
                      )}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[var(--green)] rounded-full border-2 border-[oklch(18%_.028_151)]" />
                  </div>
                  <div>
                    <Link href={`/profile/${selectedConv.otherUser.username}`} className="font-bold text-sm hover:underline">
                      {selectedConv.otherUser.full_name || selectedConv.otherUser.username}
                    </Link>
                    <p className="text-[10px] text-[var(--green)]">Online</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-2 rounded-[10px] text-[var(--muted)] hover:text-cream hover:bg-[var(--raised)] transition-colors">
                    <Phone className="w-4 h-4" />
                  </button>
                  <button className="p-2 rounded-[10px] text-[var(--muted)] hover:text-cream hover:bg-[var(--raised)] transition-colors">
                    <Video className="w-4 h-4" />
                  </button>
                  <div className="relative group">
                    <button className="p-2 rounded-[10px] text-[var(--muted)] hover:text-cream hover:bg-[var(--raised)] transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    <div className="absolute right-0 top-full mt-1 w-36 bg-[var(--surface)] border border-[var(--line)] rounded-[11px] p-1 hidden group-hover:block z-10">
                      <button onClick={() => handleReportBlock(selectedUserId, 'report')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-cream hover:bg-[var(--raised)] rounded-[8px]">
                        <Flag className="w-3 h-3" />
                        Report
                      </button>
                      <button onClick={() => handleReportBlock(selectedUserId, 'block')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--red)] hover:bg-[var(--raised)] rounded-[8px]">
                        <AlertTriangle className="w-3 h-3" />
                        Block
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Session Banner */}
              {activeSession && (
                <div className="mb-4 p-3 rounded-[11px] bg-[var(--green)]/10 border border-[var(--green)]/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[var(--green)]" />
                      <span className="text-xs font-medium text-[var(--green)]">
                        Active session: {activeSession.topic}
                      </span>
                    </div>
                    <Link href={`/sessions`} className="text-xs text-cream underline hover:no-underline">
                      View
                    </Link>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-3 mb-4 px-1" style={{ maxHeight: 'min(400px, 60vh)' }}>
                {chatLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin w-6 h-6 border-2 border-green border-t-transparent rounded-full" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-xs text-[var(--muted)]">No messages yet. Start a conversation!</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMine = msg.sender_id === profile?.id
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] px-4 py-2.5 rounded-[16px] text-sm ${
                          isMine
                            ? 'bg-[var(--green)] text-[var(--night)] rounded-br-[4px]'
                            : 'bg-[oklch(21%_.03_151)] text-cream rounded-bl-[4px]'
                        }`}>
                          <p className="leading-relaxed">{msg.content}</p>
                          <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-[9px] opacity-60">{formatTime(msg.created_at)}</span>
                            {isMine && (
                              <CheckCheck className={`w-3 h-3 ${msg.is_read ? 'text-[var(--green)]' : 'opacity-40'}`} />
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="pt-4 border-t border-[var(--line)]">
                <div className="flex items-end gap-2">
                  <div className="flex items-center gap-1">
                    <button className="p-2 rounded-[10px] text-[var(--muted)] hover:text-cream hover:bg-[var(--raised)] transition-colors">
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-[10px] text-[var(--muted)] hover:text-cream hover:bg-[var(--raised)] transition-colors">
                      <Mic className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 relative">
                    <textarea
                      value={msgText}
                      onChange={e => setMsgText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message..."
                      rows={1}
                      className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[11px] px-4 py-2.5 text-sm text-cream placeholder-[var(--muted)] focus:outline-none focus:border-[var(--green)] resize-none"
                    />
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={!msgText.trim()}
                    className="p-2.5 rounded-[11px] bg-[var(--green)] text-[var(--night)] hover:opacity-90 disabled:opacity-30 transition-opacity"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card section flex items-center justify-center h-full md:min-h-[600px]">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-[var(--surface)] flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                </div>
                <p className="text-[var(--muted)] text-sm">Select a conversation to start chatting</p>
                <p className="text-xs text-[var(--muted)] mt-1">Your messages are end-to-end encrypted</p>
              </div>
            </div>
          )}

          {/* Privacy notice */}
          <div className="mt-4 p-3 rounded-[11px] bg-[var(--surface)] border border-[var(--line)]">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[var(--green)] flex-shrink-0" />
              <p className="text-[10px] text-[var(--muted)]">
                Messages are end-to-end encrypted. Never share personal information like M-Pesa PINs or passwords.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
