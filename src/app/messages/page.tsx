'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Search, Send, Paperclip, Mic, MoreVertical, Shield, Flag, AlertTriangle, Phone, Video, ChevronLeft, Clock, CheckCheck, Plus } from 'lucide-react'
import { useSupabase, useUser, toast } from '@/app/providers'
import { useConversations, useMessages, Conversation, Message } from '@/hooks/useConversations'

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`
  return new Date(date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function MessagesPage() {
  const { user, profile, loading: userLoading } = useUser()
  const supabase = useSupabase()
  const { conversations, loading: convosLoading, fetchConversations, createConversation } = useConversations()
  
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [msgText, setMsgText] = useState('')
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const [newChatSearch, setNewChatSearch] = useState('')
  const [newChatUsers, setNewChatUsers] = useState<any[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const { messages, loading: msgsLoading, sendMessage } = useMessages(selectedConversationId)

  // Fetch users for new chat
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) { setNewChatUsers([]); return }
    setSearchingUsers(true)
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
        .neq('id', user?.id)
        .limit(10)
      setNewChatUsers(data || [])
    } catch {}
    setSearchingUsers(false)
  }, [supabase, user?.id])

  useEffect(() => {
    if (newChatSearch) {
      const timeout = setTimeout(() => searchUsers(newChatSearch), 300)
      return () => clearTimeout(timeout)
    } else {
      setNewChatUsers([])
    }
  }, [newChatSearch, searchUsers])

  // Start new conversation
  const startConversation = async (otherUserId: string) => {
    const convId = await createConversation(otherUserId)
    if (convId) {
      setSelectedConversationId(convId)
      setShowNewChat(false)
      setNewChatSearch('')
      setNewChatUsers([])
    }
  }

  const filteredConversations = conversations.filter(c => {
    if (filter === 'unread') return (c as any).unread_count > 0
    return true
  }).filter(c => {
    if (!searchTerm) return true
    const q = searchTerm.toLowerCase()
    const participants = (c as any).participants || []
    return participants.some((p: any) => 
      (p.full_name || p.username || '').toLowerCase().includes(q)
    )
  })

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSend = () => {
    if (!msgText.trim()) return
    sendMessage(msgText.trim())
    setMsgText('')
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

  if (userLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin w-8 h-8 border-2 border-green border-t-transparent rounded-full" />
    </div>
  )

  return (
    <>
      <section className="page-head">
        <h1 className="page-title">Messages</h1>
        <p className="text-muted text-sm">Private conversations</p>
      </section>

      <div className="flex flex-col md:flex-row gap-0 md:gap-4" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {/* Conversation List */}
        <div className={`w-full md:w-[340px] flex-shrink-0 ${selectedConversationId ? 'hidden md:block' : 'block'}`}>
          <div className="card section mb-4 flex items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(65%_.028_151)]" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-[oklch(18%_.028_151)] border border-[oklch(29%_.025_151)] rounded-[11px] pl-10 pr-4 py-2 text-sm text-cream placeholder-[oklch(65%_.028_151)] focus:outline-none focus:border-[oklch(55%_.13_151)]"
              />
            </div>
            <button 
              onClick={() => { setShowNewChat(true); setNewChatSearch('') }}
              className="ml-2 p-2 rounded-[10px] text-[oklch(65%_.028_151)] hover:text-cream hover:bg-[oklch(21%_.03_151)] transition-colors"
              title="New conversation"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="flex gap-1 mb-4 flex-wrap">
            {(['all', 'unread'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filter === f
                    ? 'bg-[oklch(55%_.13_151)] text-[oklch(14%_.025_151)]'
                    : 'bg-[oklch(18%_.028_151)] text-[oklch(65%_.028_151)] hover:text-cream border border-[oklch(29%_.025_151)]'
                }`}
              >
                {f === 'all' ? 'All' : 'Unread'}
              </button>
            ))}
          </div>

          {convosLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-green border-t-transparent rounded-full" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="card section text-center py-8">
              <p className="text-[oklch(65%_.028_151)] text-sm">No conversations yet</p>
              <button 
                onClick={() => { setShowNewChat(true); setNewChatSearch('') }}
                className="mt-3 bg-gold text-night text-[12px] font-bold px-[18px] py-[10px] rounded-full"
              >
                Start a conversation
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map(conv => {
                const otherUser = (conv as any).participants?.[0]
                const initials = getInitials(otherUser?.full_name || otherUser?.username)
                const lastMsg = (conv as any).last_message
                const lastMsgTime = (conv as any).last_message_at
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversationId(conv.id)}
                    className={`w-full text-left card section flex items-start gap-3 transition-colors ${
                      selectedConversationId === conv.id
                        ? 'border-[oklch(55%_.13_151)]/50 bg-[oklch(55%_.13_151)]/5'
                        : 'hover:bg-[oklch(21%_.03_151)]'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[oklch(55%_.13_151)] to-[oklch(75%_.14_84)] flex items-center justify-center text-xs font-bold text-[oklch(14%_.025_151)]">
                        {otherUser?.avatar_url ? (
                          <img src={otherUser.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          initials
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm truncate">
                          {otherUser?.full_name || otherUser?.username || 'Unknown'}
                        </span>
                        <span className="text-[10px] text-[oklch(65%_.028_151)] flex-shrink-0 ml-2">
                          {lastMsgTime ? timeAgo(lastMsgTime) : ''}
                        </span>
                      </div>
                      <p className="text-xs text-[oklch(65%_.028_151)] truncate mt-0.5">
                        {lastMsg || 'No messages yet'}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Chat View */}
        <div className={`flex-1 flex flex-col ${selectedConversationId ? 'block' : 'hidden md:block'}`}>
          {selectedConversationId ? (
            <div className="card section flex flex-col h-full md:min-h-[600px]">
              {/* Chat Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[oklch(29%_.025_151)] mb-4">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedConversationId(null)} className="md:hidden p-1 -ml-1 text-[oklch(65%_.028_151)] hover:text-cream">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[oklch(55%_.13_151)] to-[oklch(75%_.14_84)] flex items-center justify-center text-xs font-bold text-[oklch(14%_.025_151)]">
                      {(() => {
                        const conv = conversations.find(c => c.id === selectedConversationId)
                        const otherUser = (conv as any)?.participants?.[0]
                        if (otherUser?.avatar_url) return <img src={otherUser.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                        return getInitials(otherUser?.full_name || otherUser?.username)
                      })()}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[oklch(55%_.13_151)] rounded-full border-2 border-[oklch(18%_.028_151)]" />
                  </div>
                  <div>
                    <Link href={`/profile/{(() => {
                      const conv = conversations.find(c => c.id === selectedConversationId)
                      return (conv as any)?.participants?.[0]?.username || ''
                    })()}`} className="font-bold text-sm hover:underline">
                      {(() => {
                        const conv = conversations.find(c => c.id === selectedConversationId)
                        const otherUser = (conv as any)?.participants?.[0]
                        return otherUser?.full_name || otherUser?.username || 'Unknown'
                      })()}
                    </Link>
                    <p className="text-[10px] text-[oklch(55%_.13_151)]">Online</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-2 rounded-[10px] text-[oklch(65%_.028_151)] hover:text-cream hover:bg-[oklch(21%_.03_151)] transition-colors" title="Voice call">
                    <Phone className="w-4 h-4" />
                  </button>
                  <button className="p-2 rounded-[10px] text-[oklch(65%_.028_151)] hover:text-cream hover:bg-[oklch(21%_.03_151)] transition-colors" title="Video call">
                    <Video className="w-4 h-4" />
                  </button>
                  <div className="relative group">
                    <button className="p-2 rounded-[10px] text-[oklch(65%_.028_151)] hover:text-cream hover:bg-[oklch(21%_.03_151)] transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    <div className="absolute right-0 top-full mt-1 w-36 bg-[oklch(18%_.028_151)] border border-[oklch(29%_.025_151)] rounded-[11px] p-1 hidden group-hover:block z-10">
                      <button onClick={() => handleReportBlock((() => {
                        const conv = conversations.find(c => c.id === selectedConversationId)
                        return (conv as any)?.participants?.[0]?.id || ''
                      })(), 'report')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-cream hover:bg-[oklch(21%_.03_151)] rounded-[8px]">
                        <Flag className="w-3 h-3" />
                        Report
                      </button>
                      <button onClick={() => handleReportBlock((() => {
                        const conv = conversations.find(c => c.id === selectedConversationId)
                        return (conv as any)?.participants?.[0]?.id || ''
                      })(), 'block')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[oklch(62%_.15_28)] hover:bg-[oklch(21%_.03_151)] rounded-[8px]">
                        <AlertTriangle className="w-3 h-3" />
                        Block
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-3 mb-4 px-1" style={{ maxHeight: '400px' }}>
                {msgsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin w-6 h-6 border-2 border-green border-t-transparent rounded-full" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-xs text-[oklch(65%_.028_151)]">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg: Message) => {
                    const isMine = msg.sender_id === user?.id
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] px-4 py-2.5 rounded-[16px] text-sm ${
                          isMine
                            ? 'bg-[oklch(55%_.13_151)] text-[oklch(14%_.025_151)] rounded-br-[4px]'
                            : 'bg-[oklch(21%_.03_151)] text-cream rounded-bl-[4px]'
                        }`}>
                          <p className="leading-relaxed">{msg.content}</p>
                          <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-[9px] opacity-60">{timeAgo(msg.created_at)}</span>
                            {isMine && (
                              <CheckCheck className={`w-3 h-3 ${msg.read_at ? 'text-[oklch(55%_.13_151)]' : 'opacity-40'}`} />
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
              <div className="pt-4 border-t border-[oklch(29%_.025_151)]">
                <div className="flex items-end gap-2">
                  <div className="flex items-center gap-1">
                    <button className="p-2 rounded-[10px] text-[oklch(65%_.028_151)] hover:text-cream hover:bg-[oklch(21%_.03_151)] transition-colors" title="Attach file">
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-[10px] text-[oklch(65%_.028_151)] hover:text-cream hover:bg-[oklch(21%_.03_151)] transition-colors" title="Voice message">
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
                      className="w-full bg-[oklch(18%_.028_151)] border border-[oklch(29%_.025_151)] rounded-[11px] px-4 py-2.5 text-sm text-cream placeholder-[oklch(65%_.028_151)] focus:outline-none focus:border-[oklch(55%_.13_151)] resize-none"
                    />
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={!msgText.trim()}
                    className="p-2.5 rounded-[11px] bg-[oklch(55%_.13_151)] text-[oklch(14%_.025_151)] hover:opacity-90 disabled:opacity-30 transition-opacity"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card section flex items-center justify-center h-full md:min-h-[600px]">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-[oklch(18%_.028_151)] flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-[oklch(65%_.028_151)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-[oklch(65%_.028_151)] text-sm">Select a conversation to start chatting</p>
                <p className="text-xs text-[oklch(65%_.028_151)] mt-1">Your messages are private and encrypted</p>
              </div>
            </div>
          )}

          {/* Privacy notice */}
          <div className="mt-4 p-3 rounded-[11px] bg-[oklch(18%_.028_151)] border border-[oklch(29%_.025_151)]">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[oklch(55%_.13_151)] flex-shrink-0" />
              <p className="text-[10px] text-[oklch(65%_.028_151)]">
                Messages are encrypted. Never share personal information like M-Pesa PINs or passwords.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/60 z-50 md:flex md:items-center md:justify-center" onClick={() => { setShowNewChat(false); setNewChatSearch(''); setNewChatUsers([]) }}>
          <div className="fixed bottom-0 left-0 right-0 md:relative md:max-w-[400px] md:w-full bg-night2 border-t md:border border-[oklch(29%_.025_151)] rounded-t-[20px] md:rounded-[16px] max-h-[85vh] overflow-y-auto animate-sheet z-50" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-[16px] border-b border-[oklch(29%_.025_151)] sticky top-0 bg-night2 z-10">
              <button onClick={() => { setShowNewChat(false); setNewChatSearch(''); setNewChatUsers([]) }} className="text-[oklch(65%_.028_151)] text-[13px] font-semibold hover:text-cream">Cancel</button>
              <h2 className="text-cream font-bold text-[15px]">New Conversation</h2>
              <div className="w-[60px]" />
            </div>

            <div className="p-[16px]">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(65%_.028_151)]" />
                <input
                  type="text"
                  placeholder="Search by name or username..."
                  value={newChatSearch}
                  onChange={e => setNewChatSearch(e.target.value)}
                  autoFocus
                  className="w-full bg-[oklch(18%_.028_151)] border border-[oklch(29%_.025_151)] rounded-[11px] pl-10 pr-4 py-2 text-sm text-cream placeholder-[oklch(65%_.028_151)] focus:outline-none focus:border-[oklch(55%_.13_151)]"
                />
              </div>

              {searchingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-gold border-t-transparent rounded-full" />
                </div>
              ) : newChatUsers.length > 0 ? (
                <div className="space-y-1">
                  {newChatUsers.map((u: any) => (
                    <button
                      key={u.id}
                      onClick={() => startConversation(u.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-[12px] hover:bg-[oklch(21%_.03_151)] transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[oklch(55%_.13_151)] to-[oklch(75%_.14_84)] flex items-center justify-center text-xs font-bold text-[oklch(14%_.025_151)] flex-shrink-0">
                        {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" /> : getInitials(u.full_name || u.username)}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-semibold text-sm text-cream truncate">{u.full_name || u.username}</p>
                        <p className="text-xs text-[oklch(65%_.028_151)] truncate">@{u.username}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : newChatSearch ? (
                <p className="text-center text-[oklch(65%_.028_151)] text-sm py-8">No users found</p>
              ) : (
                <p className="text-center text-[oklch(65%_.028_151)] text-sm py-8">Search for someone to message</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}