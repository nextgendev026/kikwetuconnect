'use client'
import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser, useSupabase, toast } from '@/app/providers'
import { useConversations, useMessages, Message } from '@/hooks/useConversations'
import { usePresence } from '@/hooks/usePresence'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function MessagesInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile } = useUser()
  const supabase = useSupabase()
  const { conversations, loading: convsLoading, fetchConversations } = useConversations()
  const { onlineIds, onlineCount } = usePresence()

  const [convId, setConvId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [onlineOnly, setOnlineOnly] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null)
  const [replyTo, setReplyTo] = useState<{ id: string; content: string } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const { messages, loading: msgsLoading, sendMessage, sendMediaMessage, startTyping, typingUsers, addReaction, removeReaction } = useMessages(convId)

  const openConversationWith = useCallback(async (userId: string) => {
    if (!supabase || !user || !UUID_RE.test(userId)) return
    try {
      const { data: theirConvs } = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', userId)
      const theirIds = theirConvs?.map(c => c.conversation_id) || []
      let convId = null
      if (theirIds.length > 0) {
        const { data: existing } = await supabase.from('conversation_participants')
          .select('conversation_id').eq('user_id', user.id).in('conversation_id', theirIds).maybeSingle()
        if (existing) convId = existing.conversation_id
      }
      if (!convId) {
        const { data: conv } = await supabase.rpc('create_conversation', {
          p_type: 'dm',
          p_title: null,
          p_member_ids: [userId],
        })
        if (conv) convId = conv
      }
      if (convId) { setConvId(convId); setSidebarOpen(false) }
    } catch { toast('Failed to open conversation') }
  }, [supabase, user])

  useEffect(() => {
    const cid = searchParams.get('conversation_id')
    if (cid && UUID_RE.test(cid)) { setConvId(cid); setSidebarOpen(false) }
    else {
      const uid = searchParams.get('user')
      if (uid && UUID_RE.test(uid)) { openConversationWith(uid); setSidebarOpen(false) }
    }
  }, [searchParams, openConversationWith])

  useEffect(() => { if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const activeConv = conversations.find(c => c.id === convId)
  const convTitle = activeConv ? (activeConv.type === 'support' ? 'KikwetuConnect Support' : activeConv.participants.map(p => p?.full_name || p?.username || 'User').join(', ') || 'Conversation') : ''
  const convAvatar = activeConv?.participants?.[0]

  const filteredConvs = conversations.filter(c => {
    const title = c.participants.map(p => p?.full_name || p?.username || 'User').join(' ').toLowerCase()
    const matchesSearch = title.includes(search.toLowerCase()) || (c.last_message || '').toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false
    if (onlineOnly) {
      return c.type !== 'support' && c.participants.some(p => onlineIds.has(p.id))
    }
    return true
  })

  const handleSend = async () => {
    if (!input.trim()) return
    const content = input.trim()
    setInput('')
    if (replyTo) {
      await sendMessage(content, 'text', { reply_to: replyTo.id, reply_content: replyTo.content })
      setReplyTo(null)
    } else {
      await sendMessage(content)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    else if (e.key === 'Enter' && e.shiftKey) { /* allow newline */ }
    else startTyping()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) { toast('Max 20MB'); return }
    await sendMediaMessage(file, type === 'image/*' ? 'image' : 'file')
    e.target.value = ''
  }

  const handleReaction = async (messageId: string, emoji: string) => {
    const msg = messages.find(m => m.id === messageId)
    const has = msg?.reactions?.some(r => r.user_id === user?.id && r.emoji === emoji)
    if (has) await removeReaction(messageId, emoji)
    else await addReaction(messageId, emoji)
    setShowEmojiPicker(null)
  }

  const formatTime = (d: string) => {
    const date = new Date(d); const now = new Date(); const diff = now.getTime() - date.getTime()
    if (diff < 60000) return 'now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (diff < 172800000) return 'Yesterday'
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' })
  }

  const formatDateSeparator = (d: string) => {
    const date = new Date(d); const now = new Date()
    const diff = now.getTime() - date.getTime()
    if (diff < 86400000) return 'Today'
    if (diff < 172800000) return 'Yesterday'
    return date.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
  }

  const shouldShowDate = (idx: number) => {
    if (idx === 0) return true
    const curr = new Date(messages[idx].created_at)
    const prev = new Date(messages[idx - 1].created_at)
    return curr.toDateString() !== prev.toDateString()
  }

  const isOwn = (senderId: string) => senderId === user?.id

  const isLastInGroup = (idx: number) => {
    const next = messages[idx + 1]
    return !next || next.sender_id !== messages[idx].sender_id
  }

  if (!user) return <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--bg)' }}><p style={{ color: 'var(--muted)' }}>Sign in to see messages</p></div>

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg)' }}>
      {/* Conversation list */}
      <div className={`${sidebarOpen ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[360px] flex-shrink-0 border-r`} style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
        <div className="p-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-extrabold text-lg m-0" style={{ color: 'var(--ink)' }}>Chats</h1>
            <div className="flex items-center gap-2">
              <button onClick={() => setOnlineOnly(o => !o)} aria-label="Toggle online users only"
                className="text-xs border-0 cursor-pointer px-2.5 h-[30px] rounded-lg font-semibold"
                style={{ background: onlineOnly ? 'var(--gold)' : 'var(--raised)', color: onlineOnly ? 'var(--night)' : 'var(--ink)' }}>
                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ background: onlineOnly ? 'var(--night)' : 'var(--green)' }} />
                Online {onlineCount > 0 ? `(${onlineCount})` : ''}
              </button>
              <button onClick={() => setConvId(null)} aria-label="Create new message" className="text-xs border-0 cursor-pointer p-2 rounded-lg" style={{ background: 'var(--raised)', color: 'var(--ink)' }}>+ New</button>
            </div>
          </div>
          <input placeholder="Search conversations..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full h-[38px] rounded-[10px] px-3 text-[12px] outline-none" style={{ border: '1px solid var(--line)', background: 'var(--raised)', color: 'var(--ink)' }} />
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {convsLoading ? Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl mb-1">
              <div className="w-[48px] h-[48px] rounded-full" style={{ background: 'var(--raised)' }} />
              <div className="flex-1"><div className="h-3 w-24 rounded mb-2" style={{ background: 'var(--raised)' }} /><div className="h-2 w-32 rounded" style={{ background: 'var(--raised)' }} /></div>
            </div>
          )          ) : filteredConvs.length === 0 ? (
            <div className="text-center py-10" style={{ color: 'var(--muted)' }}>
              <div className="text-3xl mb-2">\uD83D\uDCAC</div>
              <p className="text-xs">{onlineOnly ? 'No online conversations right now' : 'No conversations yet'}</p>
              <p className="text-[10px] mt-1">Message someone from their profile</p>
            </div>
          ) : filteredConvs.map(c => {
            const avatar = c.participants?.[0]
            const isOnline = c.type !== 'support' && c.participants.some(p => onlineIds.has(p.id))
            return (
              <button key={c.id} onClick={() => { setConvId(c.id); setSidebarOpen(false) }}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left border-0 cursor-pointer mb-0.5 transition-colors"
                style={{ background: convId === c.id ? 'var(--raised)' : 'none' }}>
                <div className="w-[48px] h-[48px] rounded-full flex-shrink-0 grid place-items-center text-sm font-bold overflow-hidden relative" style={{ background: avatar?.avatar_url ? 'none' : 'var(--gold)', color: avatar?.avatar_url ? 'none' : 'var(--night)' }}>
                  {avatar?.avatar_url ? <img src={avatar.avatar_url} alt="" className="w-full h-full object-cover" /> : (avatar?.full_name?.[0] || '?')}
                  {isOnline && <span className="absolute bottom-0 right-0 w-[11px] h-[11px] rounded-full" style={{ background: 'var(--green)', border: '2px solid var(--surface)' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center gap-2">
                    <strong className="text-sm truncate" style={{ color: 'var(--ink)' }}>{c.type === 'support' ? 'KikwetuConnect Support' : avatar?.full_name || avatar?.username || 'User'}</strong>
                    <span className="text-[10px] whitespace-nowrap" style={{ color: 'var(--muted)' }}>{c.last_message_at ? formatTime(c.last_message_at) : ''}</span>
                  </div>
                  <div className="flex justify-between items-center mt-0.5">
                    <span className="text-xs truncate flex-1" style={{ color: c.unread_count > 0 ? 'var(--ink)' : 'var(--muted)', fontWeight: c.unread_count > 0 ? 600 : 400 }}>{c.last_message || 'Start chatting'}</span>
                    {c.unread_count > 0 && <span className="ml-2 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold px-1" style={{ background: 'var(--gold)', color: 'var(--night)' }}>{c.unread_count > 99 ? '99+' : c.unread_count}</span>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Chat pane */}
      <div className={`${!sidebarOpen ? 'flex' : 'hidden'} md:flex flex-1 flex-col`}>
        {!convId ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-3" style={{ background: 'var(--surface)' }}>
            <div className="text-5xl mb-2">\uD83D\uDCAC</div>
            <h2 className="font-extrabold text-lg m-0" style={{ color: 'var(--ink)' }}>KikwetuChat</h2>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Select a conversation or start a new one</p>
            <button onClick={() => router.push('/feed')} className="px-4 h-[38px] rounded-[10px] text-xs font-bold border-0 cursor-pointer" style={{ background: 'var(--gold)', color: 'var(--night)' }}>Browse the feed</button>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 h-[64px] border-b flex-shrink-0" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
              <button onClick={() => setSidebarOpen(true)} aria-label="Back to conversations" className="md:hidden bg-none border-0 text-lg cursor-pointer" style={{ color: 'var(--muted)' }}>\u2190</button>
              <div className="w-[40px] h-[40px] rounded-full flex-shrink-0 grid place-items-center text-sm font-bold overflow-hidden" style={{ background: convAvatar?.avatar_url ? 'none' : 'var(--gold)', color: convAvatar?.avatar_url ? 'none' : 'var(--night)' }}>
                {convAvatar?.avatar_url ? <img src={convAvatar.avatar_url} alt="" className="w-full h-full object-cover" /> : (convAvatar?.full_name?.[0] || '?')}
              </div>
              <div className="flex-1 min-w-0">
                <strong className="text-sm block truncate" style={{ color: 'var(--ink)' }}>{convTitle}</strong>
                {typingUsers.length > 0 ? (
                  <span className="text-[10px]" style={{ color: 'var(--green)' }}>{typingUsers.map(t => t.full_name || t.username).join(', ')} typing...</span>
                ) : (
                  activeConv && activeConv.type !== 'support' && activeConv.participants.some(p => onlineIds.has(p.id)) && (
                    <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--green)' }}>
                      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--green)' }} />Online
                    </span>
                  )
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3" style={{ background: 'var(--bg)' }}>
              {msgsLoading ? (
                <div className="flex justify-center py-10"><div className="w-[24px] h-[24px] rounded-full animate-spin" style={{ border: '2px solid var(--gold)', borderTopColor: 'transparent' }} /></div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>No messages yet. Say hello!</p>
                </div>
              ) : (
                <div className="max-w-[680px] mx-auto">
                  {messages.map((msg, idx) => (
                    <div key={msg.id}>
                      {shouldShowDate(idx) && (
                        <div className="flex justify-center my-4">
                          <span className="text-[10px] px-3 py-1 rounded-full" style={{ background: 'var(--raised)', color: 'var(--muted)' }}>{formatDateSeparator(msg.created_at)}</span>
                        </div>
                      )}
                      <div className={`flex mb-1.5 group ${isOwn(msg.sender_id) ? 'justify-end' : 'justify-start'} items-end`}>
                        {!isOwn(msg.sender_id) && (
                          <div className={`flex-shrink-0 mr-1.5 w-[22px] ${isLastInGroup(idx) ? '' : 'invisible'}`}>
                            {msg.sender?.avatar_url ? (
                              <img src={msg.sender.avatar_url} alt="" className="w-[22px] h-[22px] rounded-full object-cover" />
                            ) : (
                              <div className="w-[22px] h-[22px] rounded-full grid place-items-center text-[9px] font-bold" style={{ background: 'var(--gold)', color: 'var(--night)' }}>
                                {msg.sender?.full_name?.[0] || '?'}
                              </div>
                            )}
                          </div>
                        )}
                        <div className={`relative max-w-[75%] ${isOwn(msg.sender_id) ? 'order-1' : 'order-1'}`}>
                          {/* Reply preview */}
                          {msg.reply_to && (
                            <div className="px-3 pt-2 pb-1 rounded-t-lg text-[10px] border-l-2 mb-0.5" style={{ background: isOwn(msg.sender_id) ? 'rgba(255,255,255,0.15)' : 'var(--raised)', borderLeftColor: 'var(--gold)', color: 'var(--muted)' }}>
                              {msg.metadata?.reply_content || 'Replied to a message'}
                            </div>
                          )}
                          {/* Message bubble */}
                          <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${isOwn(msg.sender_id) ? 'rounded-br-md' : 'rounded-bl-md'}`}
                            style={{
                              background: isOwn(msg.sender_id) ? 'var(--gold)' : 'var(--surface)',
                              color: isOwn(msg.sender_id) ? 'var(--night)' : 'var(--ink)',
                              borderBottomRightRadius: isOwn(msg.sender_id) ? '4px' : '16px',
                              borderBottomLeftRadius: isOwn(msg.sender_id) ? '16px' : '4px',
                            }}>
                            {msg.message_type === 'image' && msg.metadata?.url && (
                              <img src={msg.metadata.url} alt="" className="max-w-full rounded-lg mb-1.5 max-h-[300px] object-cover cursor-pointer" onClick={() => window.open(msg.metadata.url)} />
                            )}
                            {msg.message_type === 'file' && msg.metadata?.url && (
                              <div className="flex items-center gap-2 p-2 rounded-lg mb-1" style={{ background: isOwn(msg.sender_id) ? 'rgba(0,0,0,0.1)' : 'var(--raised)' }}>
                                <span>\uD83D\uDCCE</span>
                                <div className="min-w-0">
                                  <span className="text-xs truncate block">{msg.metadata?.name || 'File'}</span>
                                  <span className="text-[10px]">{msg.metadata?.size ? `${(msg.metadata.size / 1024).toFixed(0)} KB` : ''}</span>
                                </div>
                              </div>
                            )}
                            {msg.content && <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>}
                          </div>
                          {/* Reactions */}
                          {msg.reactions && msg.reactions.length > 0 && (
                            <div className={`flex gap-0.5 -mt-1.5 ${isOwn(msg.sender_id) ? 'justify-end' : 'justify-start'}`}>
                              {Object.entries(
                                msg.reactions.reduce((acc: Record<string, string[]>, r: any) => {
                                  if (!acc[r.emoji]) acc[r.emoji] = []
                                  acc[r.emoji].push(r.user_id)
                                  return acc
                                }, {})
                              ).map(([emoji]) => (
                                <button key={emoji} onClick={() => handleReaction(msg.id, emoji)} aria-label={`React with ${emoji}`}
                                  className={`text-xs px-1.5 py-0.5 rounded-full border cursor-pointer ${msg.reactions?.some(r => r.user_id === user?.id && r.emoji === emoji) ? 'border' : ''}`}
                                  style={{ background: msg.reactions?.some(r => r.user_id === user?.id && r.emoji === emoji) ? 'var(--gold)' : 'var(--surface)', borderColor: 'var(--line)' }}>
                                  <span aria-hidden="true">{emoji}</span>
                                </button>
                              ))}
                            </div>
                          )}
                          {/* Metadata row */}
                          <div className={`flex items-center gap-1 mt-0.5 ${isOwn(msg.sender_id) ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-[9px]" style={{ color: 'var(--faint)' }}>{formatTime(msg.created_at)}</span>
                            {isOwn(msg.sender_id) && msg.status !== 'sending' && (
                              <span className="relative inline-block w-[18px] h-[12px]" style={{ color: msg.status === 'read' ? '#53bdeb' : 'var(--faint)' }}>
                                <svg width="18" height="12" viewBox="0 0 18 12" fill="none" className="absolute left-0 top-0">
                                  <path d="M1 6.5L5 10.5L14.5 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                {(msg.status === 'delivered' || msg.status === 'read') && (
                                  <svg width="18" height="12" viewBox="0 0 18 12" fill="none" className="absolute left-[3px] top-0">
                                    <path d="M1 6.5L5 10.5L14.5 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </span>
                            )}
                          </div>
                          {/* Actions on hover */}
                          <div className={`absolute top-0 ${isOwn(msg.sender_id) ? 'left-0 -translate-x-full pr-1' : 'right-0 translate-x-full pl-1'} opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5`}>
                            <button onClick={() => { setReplyTo({ id: msg.id, content: msg.content?.slice(0, 80) || '' }); (document.querySelector('.composer-input') as HTMLInputElement)?.focus() }}
                              className="w-[28px] h-[28px] rounded-full grid place-items-center text-xs border-0 cursor-pointer" style={{ background: 'var(--surface)', color: 'var(--muted)' }} aria-label="Reply to message">\u21A9</button>
                            <button onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                              className="w-[28px] h-[28px] rounded-full grid place-items-center text-xs border-0 cursor-pointer" style={{ background: 'var(--surface)', color: 'var(--muted)' }} aria-label="Add reaction">\uD83D\uDE00</button>
                          </div>
                          {/* Inline emoji picker */}
                          {showEmojiPicker === msg.id && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 flex gap-1 p-1.5 rounded-xl z-10" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
                              {['\uD83D\uDC4D', '\uD83D\uDC4E', '\u2764\uFE0F', '\uD83D\uDE02', '\uD83D\uDE0A', '\uD83D\uDE22', '\uD83D\uDE21', '\uD83D\uDE4F'].map(e => (
                                <button key={e} onClick={() => handleReaction(msg.id, e)} aria-label={`React with ${e}`} className="text-lg border-0 bg-none cursor-pointer hover:scale-125 transition-transform">{e}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {typingUsers.length > 0 && (
                    <div className="flex items-center gap-2 py-2 text-xs" style={{ color: 'var(--muted)' }}>
                      <div className="flex gap-0.5"><span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--muted)', animationDelay: '0ms' }} /><span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--muted)', animationDelay: '150ms' }} /><span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--muted)', animationDelay: '300ms' }} /></div>
                      {typingUsers.map(t => t.full_name || t.username).join(', ')} typing...
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Reply preview bar */}
            {replyTo && (
              <div className="flex items-center gap-2 px-4 py-2 border-t" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
                <div className="flex-1">
                  <div className="text-[10px] font-bold" style={{ color: 'var(--gold)' }}>Replying</div>
                  <div className="text-xs truncate" style={{ color: 'var(--muted)' }}>{replyTo.content}</div>
                </div>
                <button onClick={() => setReplyTo(null)} aria-label="Cancel reply" className="bg-none border-0 cursor-pointer text-sm" style={{ color: 'var(--muted)' }}>\u2715</button>
              </div>
            )}

            {/* Composer */}
            <div className="flex items-center gap-2 px-4 py-3 border-t" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
              <button onClick={() => imageInputRef.current?.click()} aria-label="Upload image" className="w-[36px] h-[36px] rounded-full grid place-items-center text-sm flex-shrink-0 border-0 cursor-pointer" style={{ background: 'var(--raised)', color: 'var(--muted)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </button>
              <button onClick={() => fileInputRef.current?.click()} aria-label="Attach file" className="w-[36px] h-[36px] rounded-full grid place-items-center text-sm flex-shrink-0 border-0 cursor-pointer" style={{ background: 'var(--raised)', color: 'var(--muted)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
              </button>
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileSelect(e, 'image/*')} />
              <input ref={fileInputRef} type="file" className="hidden" onChange={e => handleFileSelect(e, 'file')} />
              <div className="flex-1 relative">
                <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder="Type a message..." rows={1}
                  className="composer-input w-full rounded-2xl px-4 py-2.5 text-sm outline-none resize-none"
                  style={{ background: 'var(--raised)', border: '1px solid var(--line)', color: 'var(--ink)', maxHeight: 120 }}
                  onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 120) + 'px' }} />
              </div>
              <button onClick={handleSend} disabled={!input.trim()} aria-label="Send message"
                className="w-[42px] h-[42px] rounded-full grid place-items-center border-0 cursor-pointer transition-opacity flex-shrink-0"
                style={{ background: input.trim() ? 'var(--gold)' : 'var(--raised)', color: input.trim() ? 'var(--night)' : 'var(--faint)', opacity: input.trim() ? 1 : 0.9 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function MessagesPage() {
  return <Suspense><MessagesInner /></Suspense>
}
