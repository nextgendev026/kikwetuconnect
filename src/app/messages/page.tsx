'use client'
import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { useUser, useSupabase, toast } from '@/app/providers'
import { useConversations, useMessages, Message } from '@/hooks/useConversations'
import { usePresence } from '@/hooks/usePresence'
import { Virtuoso } from 'react-virtuoso'
import imageCompression from 'browser-image-compression'
import { Trash2, X, RotateCcw, Paperclip, ImagePlus, Loader2 } from 'lucide-react'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function NewChatModal({ onClose, onPick }: { onClose: () => void; onPick: (userId: string) => void }) {
  const { user } = useUser()
  const supabase = useSupabase()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return }
    let cancelled = false
    setLoading(true)
    ;(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .ilike('username', `%${q.trim()}%`)
        .limit(12)
      if (cancelled) return
      setResults((data || []).filter(p => p.id !== user?.id))
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [q, supabase, user])

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full max-w-[420px] rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--card-shadow)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <strong className="text-sm font-bold" style={{ color: 'var(--ink)' }}>New message</strong>
          <button onClick={onClose} aria-label="Close new message" className="bg-none border-0 cursor-pointer text-lg leading-none" style={{ color: 'var(--muted)' }}>×</button>
        </div>
        <input autoFocus placeholder="Search people by username..." value={q} onChange={e => setQ(e.target.value)}
          className="w-full h-[38px] rounded-lg px-3 text-sm outline-none mb-3"
          style={{ border: '1px solid var(--line)', background: 'var(--raised)', color: 'var(--ink)' }} />
        <div className="max-h-[300px] overflow-y-auto">
          {q.trim().length < 2 ? (
            <p className="text-xs text-center py-6" style={{ color: 'var(--muted)' }}>Type at least 2 characters to search</p>
          ) : loading ? (
            <p className="text-xs text-center py-6" style={{ color: 'var(--muted)' }}>Searching...</p>
          ) : results.length === 0 ? (
            <p className="text-xs text-center py-6" style={{ color: 'var(--muted)' }}>No users found</p>
          ) : results.map(p => (
            <button key={p.id} onClick={() => onPick(p.id)}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left border-0 cursor-pointer transition-colors"
              style={{ background: 'none', color: 'var(--ink)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--raised)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}>
              <div className="w-[40px] h-[40px] rounded-full flex-shrink-0 grid place-items-center text-xs font-bold overflow-hidden" style={{ background: p.avatar_url ? 'none' : 'var(--gold)', color: p.avatar_url ? 'none' : 'var(--night)' }}>
                {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : (p.full_name?.[0] || p.username?.[0] || '?').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <strong className="text-sm block truncate">{p.full_name || p.username}</strong>
                <span className="text-xs block truncate" style={{ color: 'var(--muted)' }}>@{p.username}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function MessagesInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile } = useUser()
  const supabase = useSupabase()
  const { conversations, loading: convsLoading, fetchConversations, deleteConversation, deleteConversations } = useConversations()
  const { onlineIds, onlineCount } = usePresence()

  const [convId, setConvId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [onlineOnly, setOnlineOnly] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null)
  const [replyTo, setReplyTo] = useState<{ id: string; content: string } | null>(null)
  const [showNewChat, setShowNewChat] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedConvs, setSelectedConvs] = useState<Set<string>>(new Set())
  const [pendingFiles, setPendingFiles] = useState<Array<{ id: string; file: File; preview: string }>>([])
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<any>(null)

  const { messages, loading: msgsLoading, hasEarlier, loadEarlier, sendMessage, sendMediaMessage, retryMessage, discardMessage, startTyping, typingUsers, addReaction, removeReaction } = useMessages(convId)

  useEffect(() => {
    const needSigning = messages.filter(m => {
      const path = m.metadata?.path
      return path && !m.id.startsWith('temp-') && !mediaUrls[path]
    }) 
    if (needSigning.length === 0) return
    let cancelled = false
    ;(async () => {
      const entries = await Promise.all(needSigning.map(async m => {
        try {
          const res = await fetch('/api/media/signed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messageId: m.id, path: m.metadata?.path }),
          })
          if (!res.ok) return null
          const data = await res.json()
          return data?.url ? { [m.metadata?.path as string]: data.url } : null
        } catch { return null }
      }))
      if (cancelled) return
      const merged: Record<string, string> = {}
      entries.forEach(e => { if (e) Object.assign(merged, e) })
      if (Object.keys(merged).length > 0) setMediaUrls(prev => ({ ...prev, ...merged }))
    })()
    return () => { cancelled = true }
  }, [messages, mediaUrls])

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
      if (convId) { setConvId(convId); setSidebarOpen(false); fetchConversations() }
    } catch { toast('Failed to open conversation') }
  }, [supabase, user, fetchConversations])

  useEffect(() => {
    const cid = searchParams.get('conversation_id')
    if (cid && UUID_RE.test(cid)) { setConvId(cid); setSidebarOpen(false) }
    else {
      const uid = searchParams.get('user')
      if (uid && UUID_RE.test(uid)) { openConversationWith(uid); setSidebarOpen(false) }
    }
  }, [searchParams, openConversationWith])

  const activeConv = conversations.find(c => c.id === convId)
  const otherUser = activeConv?.participants?.[0]
  const fallbackSender = messages.find(m => m.sender_id !== user?.id)?.sender
  const otherUserId = otherUser?.id || messages.find(m => m.sender_id !== user?.id)?.sender_id
  const otherOnline = !!otherUserId && onlineIds.has(otherUserId)
  const convTitle = activeConv
    ? (activeConv.type === 'support' ? 'KikwetuConnect Support' : (otherUser?.full_name || otherUser?.username || fallbackSender?.full_name || fallbackSender?.username || 'Conversation'))
    : (fallbackSender?.full_name || fallbackSender?.username || '')
  const convAvatar = otherUser || fallbackSender || undefined

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
    const content = input.trim()
    const hasFiles = pendingFiles.length > 0
    if (!content && !hasFiles) return
    setInput('')

    const onProgress = (p: number) => { /* progress tracked per-pending message */ }

    if (content && !hasFiles) {
      if (replyTo) {
        await sendMessage(content, 'text', { reply_to: replyTo.id, reply_content: replyTo.content })
        setReplyTo(null)
      } else {
        await sendMessage(content)
      }
    }
    if (hasFiles) {
      const files = pendingFiles
      setPendingFiles([])
      for (const item of files) {
        const type = item.file.type.startsWith('image/') ? 'image' : 'file'
        const toUpload = await compressImageIfNeeded(item.file)
        await sendMediaMessage(toUpload, type, onProgress)
      }
      if (content && replyTo) setReplyTo(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    else if (e.key === 'Enter' && e.shiftKey) { /* allow newline */ }
    else if (!e.metaKey && !e.ctrlKey && !e.altKey) startTyping()
  }

  const addPendingFiles = (fileList: FileList | File[] | null) => {
    if (!fileList) return
    const files = Array.from(fileList)
    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) { toast('Max 20MB per file'); continue }
      const id = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : ''
      setPendingFiles(prev => [...prev, { id, file, preview }])
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    addPendingFiles(e.target.files)
    e.target.value = ''
  }

  const handlePaste = async (e: React.ClipboardEvent) => {
    const files = e.clipboardData?.files
    if (files && files.length > 0) { addPendingFiles(files); e.preventDefault() }
  }

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation() }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    addPendingFiles(e.dataTransfer?.files)
  }

  const removePendingFile = (id: string) => {
    setPendingFiles(prev => {
      const item = prev.find(p => p.id === id)
      if (item?.preview) URL.revokeObjectURL(item.preview)
      return prev.filter(p => p.id !== id)
    })
  }

  const handleRetry = (messageId: string) => { retryMessage(messageId) }
  const handleDiscard = (messageId: string) => { discardMessage(messageId) }

  const compressImageIfNeeded = async (file: File): Promise<File> => {
    if (!file.type.startsWith('image/')) return file
    if (file.size <= 1024 * 1024) return file
    try {
      return await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
        fileType: file.type,
      })
    } catch { return file }
  }

  const handleReaction = async (messageId: string, emoji: string) => {
    const msg = messages.find(m => m.id === messageId)
    const has = msg?.reactions?.some(r => r.user_id === user?.id && r.emoji === emoji)
    if (has) await removeReaction(messageId, emoji)
    else await addReaction(messageId, emoji)
    setShowEmojiPicker(null)
  }

  const handleDeleteSelected = async () => {
    if (selectedConvs.size === 0) return
    if (!confirm(`Delete ${selectedConvs.size} conversation(s)? This cannot be undone.`)) return
    const ids = Array.from(selectedConvs)
    await deleteConversations(ids)
    setSelectedConvs(new Set())
    setSelectMode(false)
    if (ids.includes(convId || '')) setConvId(null)
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

  const isOwn = (senderId: string) => senderId === user?.id

  type ListRow =
    | { kind: 'date'; date: string; key: string }
    | { kind: 'msg'; msg: Message; idx: number; isLast: boolean; key: string }

  const rows: ListRow[] = useMemo(() => {
    const out: ListRow[] = []
    messages.forEach((msg, idx) => {
      if (idx === 0 || new Date(msg.created_at).toDateString() !== new Date(messages[idx - 1].created_at).toDateString()) {
        out.push({ kind: 'date', date: msg.created_at, key: `d-${msg.id}` })
      }
      const next = messages[idx + 1]
      const isLast = !next || next.sender_id !== msg.sender_id
      out.push({ kind: 'msg', msg, idx, isLast, key: msg.id })
    })
    return out
  }, [messages])

  const initialIndex = rows.length > 0 ? rows.length - 1 : 0

  const handleRangeChanged = useCallback((range: { startIndex: number; endIndex: number }) => {
    if (range.startIndex <= 5 && hasEarlier && !msgsLoading) loadEarlier()
  }, [hasEarlier, msgsLoading, loadEarlier])

  const isPending = (msg: Message) => msg.status === 'sending' || msg.status === 'failed'
  const isTemp = (msg: Message) => msg.id.startsWith('temp-')

  if (!user) return <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--bg)' }}><p style={{ color: 'var(--muted)' }}>Sign in to see messages</p></div>

  return (
    <div className="messages-shell flex" style={{ background: 'var(--bg)' }}>
      {/* Conversation list */}
      <div className={`${sidebarOpen ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[360px] flex-shrink-0 border-r`}>

      {/* Sidebar header */}
      <div className="p-3 pb-2 border-b" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-extrabold text-lg m-0" style={{ color: 'var(--ink)' }}>Chats</h1>
          <div className="flex items-center gap-1.5">
            {selectMode ? (
              <>
                <button onClick={() => { setSelectedConvs(new Set()); setSelectMode(false) }}
                  className="text-xs border-0 cursor-pointer p-1.5 rounded-lg" style={{ background: 'var(--raised)', color: 'var(--muted)' }}>
                  <X className="w-4 h-4" />
                </button>
                <button onClick={handleDeleteSelected} disabled={selectedConvs.size === 0}
                  className="text-xs border-0 cursor-pointer p-1.5 rounded-lg font-semibold" style={{ background: 'var(--red)', color: '#fff', opacity: selectedConvs.size === 0 ? 0.5 : 1 }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setOnlineOnly(o => !o)} aria-label="Toggle online users only"
                  className="text-xs border-0 cursor-pointer px-2 h-[28px] rounded-lg font-semibold"
                  style={{ background: onlineOnly ? 'var(--green)' : 'var(--raised)', color: onlineOnly ? 'var(--surface)' : 'var(--ink)' }}>
                  <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ background: onlineOnly ? 'var(--surface)' : 'var(--green)' }} />
                  Online {onlineCount > 0 ? `(${onlineCount})` : ''}
                </button>
                <button onClick={() => setShowNewChat(true)} aria-label="Create new message" className="text-xs border-0 cursor-pointer p-1.5 rounded-lg" style={{ background: 'var(--raised)', color: 'var(--ink)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
                <button onClick={() => setSelectMode(true)} aria-label="Select conversations" className="text-xs border-0 cursor-pointer p-1.5 rounded-lg" style={{ background: 'var(--raised)', color: 'var(--ink)' }}>
                  <input type="checkbox" className="w-[14px] h-[14px] cursor-pointer" style={{ accentColor: 'var(--gold)' }} readOnly />
                </button>
              </>
            )}
          </div>
        </div>
        <input placeholder="Search conversations..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full h-[34px] rounded-[8px] px-3 text-[11px] outline-none" style={{ border: '1px solid var(--line)', background: 'var(--raised)', color: 'var(--ink)' }} />
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {convsLoading ? Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl mb-1">
            <div className="w-[48px] h-[48px] rounded-full" style={{ background: 'var(--raised)' }} />
            <div className="flex-1"><div className="h-3 w-24 rounded mb-2" style={{ background: 'var(--raised)' }} /><div className="h-2 w-32 rounded" style={{ background: 'var(--raised)' }} /></div>
          </div>
        )) : filteredConvs.length === 0 ? (
          <div className="text-center py-10" style={{ color: 'var(--muted)' }}>
            <div className="text-3xl mb-2">💬</div>
            <p className="text-xs">{onlineOnly ? 'No online conversations right now' : 'No conversations yet'}</p>
            <p className="text-[10px] mt-1">Message someone from their profile</p>
          </div>
        ) : filteredConvs.map(c => {
          const avatar = c.participants?.[0]
          const isOnline = c.type !== 'support' && c.participants.some(p => onlineIds.has(p.id))
          return selectMode ? (
            <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl mb-1" style={{ background: selectedConvs.has(c.id) ? 'var(--raised)' : 'none' }}>
              <button
                onClick={() => {
                  const newSel = new Set(selectedConvs)
                  if (newSel.has(c.id)) newSel.delete(c.id)
                  else newSel.add(c.id)
                  setSelectedConvs(newSel)
                }}
                className="w-[20px] h-[20px] rounded border border-[var(--line)] flex-shrink-0 grid place-items-center cursor-pointer"
                style={{ background: selectedConvs.has(c.id) ? 'var(--gold)' : 'var(--raised)', borderColor: selectedConvs.has(c.id) ? 'var(--gold)' : 'var(--line)' }}
              >
                {selectedConvs.has(c.id) && <span style={{ color: 'var(--night)', fontSize: 10 }}>✓</span>}
              </button>
              <div className="w-[42px] h-[42px] rounded-full flex-shrink-0 grid place-items-center text-sm font-bold overflow-hidden relative" style={{ background: avatar?.avatar_url ? 'none' : 'var(--gold)', color: avatar?.avatar_url ? 'none' : 'var(--night)' }}>
                {avatar?.avatar_url ? <img src={avatar.avatar_url} alt="" className="w-full h-full object-cover" /> : (avatar?.full_name?.[0] || '?')}
                {isOnline && <span className="absolute bottom-0 right-0 w-[10px] h-[10px] rounded-full" style={{ background: 'var(--green)', border: '2px solid var(--surface)' }} />}
              </div>
              <div className="flex-1 min-w-0">
                <strong className="text-sm block truncate" style={{ color: 'var(--ink)' }}>{c.type === 'support' ? 'KikwetuConnect Support' : avatar?.full_name || avatar?.username || 'User'}</strong>
                <span className="text-xs truncate block" style={{ color: c.unread_count > 0 ? 'var(--ink)' : 'var(--muted)', fontWeight: c.unread_count > 0 ? 600 : 400 }}>{c.last_message || 'Start chatting'}</span>
              </div>
              {c.unread_count > 0 && <span className="ml-1 min-w-[16px] h-[16px] rounded-full flex items-center justify-center text-[8px] font-bold" style={{ background: 'var(--gold)', color: 'var(--night)' }}>{c.unread_count > 99 ? '99+' : c.unread_count}</span>}
            </div>
          ) : (
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
      <div className={`${!sidebarOpen ? 'flex' : 'hidden'} md:flex flex-1 flex-col h-full`}>
        {!convId ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-4" style={{ background: 'var(--surface)' }}>
            <div className="text-6xl mb-2">💬</div>
            <h2 className="font-extrabold text-2xl m-0" style={{ color: 'var(--ink)' }}>KikwetuChat</h2>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Select a conversation or start a new one</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowNewChat(true)} className="px-6 h-[42px] rounded-[10px] text-sm font-bold border-0 cursor-pointer" style={{ background: 'var(--gold)', color: 'var(--night)' }}>New message</button>
              <button onClick={() => router.push('/feed')} className="px-6 h-[42px] rounded-[10px] text-sm font-bold border-0 cursor-pointer" style={{ background: 'var(--raised)', color: 'var(--ink)', border: '1px solid var(--line)' }}>Browse the feed</button>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 h-[60px] border-b flex-shrink-0" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
              <button onClick={() => setSidebarOpen(true)} aria-label="Back to conversations" className="md:hidden bg-none border-0 text-xl cursor-pointer" style={{ color: 'var(--ink)' }}>←</button>
              <div className="w-[46px] h-[46px] rounded-full flex-shrink-0 grid place-items-center text-sm font-bold overflow-hidden" style={{ background: convAvatar?.avatar_url ? 'none' : 'var(--gold)', color: convAvatar?.avatar_url ? 'none' : 'var(--night)' }}>
                {convAvatar?.avatar_url ? <img src={convAvatar.avatar_url} alt="" className="w-full h-full object-cover" /> : (convAvatar?.full_name?.[0] || '?')}
              </div>
              <div className="flex-1 min-w-0">
                <strong className="text-base block truncate" style={{ color: 'var(--ink)' }}>{convTitle}</strong>
                {activeConv?.type !== 'support' && otherUserId && (
                  otherOnline ? (
                    <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--green)' }}>
                      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--green)' }} />Online
                    </span>
                  ) : (
                    <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--faint)' }} />Offline
                    </span>
                  )
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3" style={{ background: 'var(--bg)' }} onDragOver={handleDragOver} onDrop={handleDrop}>
              {msgsLoading ? (
                <div className="flex justify-center py-10"><div className="w-[24px] h-[24px] rounded-full animate-spin" style={{ border: '2px solid var(--gold)', borderTopColor: 'transparent' }} /></div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full flex-col gap-2">
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>No messages yet. Say hello!</p>
                  <p className="text-[10px]" style={{ color: 'var(--faint-accessible)' }}>Drop an image here, or paste one from your clipboard</p>
                </div>
              ) : (
                <Virtuoso
                  ref={listRef}
                  data={rows}
                  initialTopMostItemIndex={initialIndex}
                  atBottomThreshold={120}
                  followOutput={(isAtBottom) => (isAtBottom ? 'smooth' : false)}
                  rangeChanged={handleRangeChanged}
                  style={{ height: '100%' }}
                  components={{
                    Header: hasEarlier ? () => (
                      <div className="flex justify-center py-3">
                        <button onClick={() => void loadEarlier()} className="px-4 py-1.5 rounded-full text-[11px] font-bold border-0 cursor-pointer" style={{ background: 'var(--raised)', color: 'var(--ink)' }}>Load earlier messages</button>
                      </div>
                    ) : () => null,
                    Footer: () => (
                      <div>
                        {typingUsers.length > 0 && (
                          <div className="flex items-center gap-1.5 py-1.5 text-xs" style={{ color: 'var(--muted)' }}>
                            <div className="flex gap-0.5"><span className="w-1 h-1 rounded-full animate-bounce" style={{ background: 'var(--muted)', animationDelay: '0ms' }} /><span className="w-1 h-1 rounded-full animate-bounce" style={{ background: 'var(--muted)', animationDelay: '150ms' }} /><span className="w-1 h-1 rounded-full animate-bounce" style={{ background: 'var(--muted)', animationDelay: '300ms' }} /></div>
                            <i>{typingUsers.map(t => t.full_name || t.username).join(', ')} typing...</i>
                          </div>
                        )}
                      </div>
                    ),
                  }}
                  itemContent={(_index, row) => {
                    if (row.kind === 'date') {
                      return (
                        <div className="flex justify-center my-3">
                          <span className="text-[9px] px-3 py-1 rounded-full" style={{ background: 'var(--raised)', color: 'var(--muted)' }}>{formatDateSeparator(row.date)}</span>
                        </div>
                      )
                    }
                    const msg = row.msg
                    const own = isOwn(msg.sender_id)
                    const temp = isTemp(msg)
                    return (
                      <div className={`mb-1 ${own ? 'flex justify-end' : 'flex justify-start'}`}>
                        {!own && (
                          <div className={`mr-1.5 w-[26px] ${row.isLast ? '' : 'invisible'}`}>
                            {msg.sender?.avatar_url ? (
                              <img src={msg.sender.avatar_url} alt="" className="w-[26px] h-[26px] rounded-full object-cover" />
                            ) : (
                              <div className="w-[26px] h-[26px] rounded-full grid place-items-center text-[9px] font-bold" style={{ background: 'var(--gold)', color: 'var(--night)' }}>
                                {msg.sender?.full_name?.[0] || '?'}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="relative max-w-[75%]" style={{ opacity: temp ? 0.85 : 1 }}>
                          {msg.reply_to && !temp && (
                            <div className="px-2.5 pt-1.5 pb-1 rounded-t-xl text-[10px] border-l-2 mb-0.5" style={{ background: own ? 'rgba(255,255,255,0.15)' : 'var(--raised)', borderLeftColor: 'var(--gold)', color: 'var(--muted)' }}>
                              {msg.metadata?.reply_content || 'Replied to a message'}
                            </div>
                          )}
                          <div className={`px-3 py-1.5 rounded-2xl text-sm ${own ? 'rounded-br-md' : 'rounded-bl-md'}`}
                            style={{
                              background: own ? '#0F625B' : 'var(--surface)',
                              color: own ? '#FFFFFF' : 'var(--ink)',
                              borderBottomRightRadius: own ? '6px' : '18px',
                              borderBottomLeftRadius: own ? '18px' : '6px',
                            }}>
                            {msg.message_type === 'image' && (
                              msg.metadata?.path && mediaUrls[msg.metadata.path] ? (
                                <img src={mediaUrls[msg.metadata.path]} alt={msg.metadata?.name || ''} className="max-w-[240px] rounded-lg mb-1 max-h-[250px] object-cover cursor-pointer" onClick={() => window.open(mediaUrls[msg.metadata.path])} />
                              ) : msg.metadata?.url ? (
                                <img src={msg.metadata.url} alt={msg.metadata?.name || ''} className="max-w-[240px] rounded-lg mb-1 max-h-[250px] object-cover cursor-pointer" onClick={() => window.open(msg.metadata.url)} />
                              ) : null
                            )}
                            {msg.message_type === 'file' && (
                              (msg.metadata?.path && mediaUrls[msg.metadata.path]) || msg.metadata?.url ? (
                                <a href={mediaUrls[msg.metadata.path] || msg.metadata?.url} download={msg.metadata?.name} className="flex items-center gap-2 p-1.5 rounded-lg mb-1 no-underline" style={{ background: own ? 'rgba(0,0,0,0.15)' : 'var(--raised)', color: own ? '#FFFFFF' : 'var(--ink)' }}>
                                  <span>📎</span>
                                  <div className="min-w-0">
                                    <span className="text-xs truncate block">{msg.metadata?.name || 'File'}</span>
                                    <span className="text-[10px]">{msg.metadata?.size ? `${(msg.metadata.size / 1024).toFixed(0)} KB` : ''}</span>
                                  </div>
                                </a>
                              ) : null
                            )}
                            {msg.content && (msg.message_type !== 'image' || !msg.metadata?.url) && <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>}
                            {msg.status === 'sending' && msg.upload_progress !== undefined && (
                              <div className="mt-1 h-[3px] w-full rounded overflow-hidden" style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <div className="h-full transition-all" style={{ background: 'var(--gold)', width: `${msg.upload_progress || 0}%` }} />
                              </div>
                            )}
                            {msg.status === 'failed' && msg.upload_error && (
                              <div className="text-[9px] mt-1 font-semibold" style={{ color: own ? '#FFD6D6' : 'var(--red)' }}>{msg.upload_error}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5 text-[8px]" style={{ color: 'var(--faint-accessible)', marginLeft: own ? 'auto' : '0' }}>
                            {msg.status === 'sending' ? (
                              <span className="flex items-center gap-1" style={{ color: own ? '#B9E4DF' : 'var(--muted)' }}>
                                <Loader2 className="w-2.5 h-2.5 animate-spin" aria-hidden="true" />
                                <span>Sending...</span>
                              </span>
                            ) : msg.status === 'failed' ? (
                              <span className="flex items-center gap-1" style={{ color: 'var(--red)' }}>
                                <span>Failed</span>
                                <button onClick={() => handleRetry(msg.id)} aria-label="Retry sending message" className="flex items-center gap-0.5 border-0 cursor-pointer text-[8px] font-bold" style={{ background: 'none', color: 'var(--red)' }}>
                                  <RotateCcw className="w-2.5 h-2.5" aria-hidden="true" />Retry
                                </button>
                                <button onClick={() => handleDiscard(msg.id)} aria-label="Discard message" className="border-0 cursor-pointer" style={{ background: 'none', color: 'var(--red)' }}>
                                  <X className="w-2.5 h-2.5" aria-hidden="true" />
                                </button>
                              </span>
                            ) : (
                              <>
                                <span>{formatTime(msg.created_at)}</span>
                                {own && msg.status !== 'sending' && (
                                  <span style={{ color: msg.status === 'read' ? '#53bdeb' : 'var(--faint)' }}>
                                    <svg width="10" height="7" viewBox="0 0 18 12" fill="none">
                                      <path d="M1 6.5L5 10.5L14.5 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    {(msg.status === 'delivered' || msg.status === 'read') && (
                                      <svg width="10" height="7" viewBox="0 0 18 12" fill="none" style={{ marginLeft: -3 }}>
                                        <path d="M1 6.5L5 10.5L14.5 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    )}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  }}
                />
              )}
            </div>

            {/* Reply preview bar */}
            {replyTo && (
              <div className="flex-shrink-0 sticky bottom-[64px] flex items-center gap-2 px-3 py-1.5 border-t z-10" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
                <div className="flex-1">
                  <div className="text-[9px] font-bold" style={{ color: 'var(--gold)' }}>Replying</div>
                  <div className="text-xs truncate" style={{ color: 'var(--muted)' }}>{replyTo.content}</div>
                </div>
                <button onClick={() => setReplyTo(null)} aria-label="Cancel reply" className="bg-none border-0 cursor-pointer text-sm" style={{ color: 'var(--muted)' }}>✕</button>
              </div>
            )}

            {/* Composer - sticky at bottom */}
            <div className="flex-shrink-0 border-t z-10" style={{ borderColor: 'var(--line)', background: 'var(--surface)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
              {pendingFiles.length > 0 && (
                <div className="flex gap-2 px-3 pt-2 pb-1 overflow-x-auto">
                  {pendingFiles.map(p => (
                    <div key={p.id} className="relative flex-shrink-0">
                      {p.preview ? (
                        <Image src={p.preview} alt="" width={72} height={72} unoptimized className="w-[72px] h-[72px] rounded-lg object-cover" />
                      ) : (
                        <div className="w-[72px] h-[72px] rounded-lg flex flex-col items-center justify-center gap-1 text-[9px] font-semibold" style={{ background: 'var(--raised)', color: 'var(--muted)' }}>
                          <Paperclip className="w-4 h-4" aria-hidden="true" />
                          <span className="max-w-[60px] truncate">{p.file.name}</span>
                        </div>
                      )}
                      <button onClick={() => removePendingFile(p.id)} aria-label={`Remove ${p.file.name}`} className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] rounded-full grid place-items-center border-0 cursor-pointer" style={{ background: 'var(--red)', color: '#fff' }}>
                        <X className="w-2.5 h-2.5" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 px-3 py-2">
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileSelect(e, 'image/*')} />
                <input ref={fileInputRef} type="file" className="hidden" onChange={e => handleFileSelect(e, 'file')} />
                <button onClick={() => imageInputRef.current?.click()} aria-label="Attach image" className="w-[34px] h-[34px] rounded-full grid place-items-center text-sm flex-shrink-0 border-0 cursor-pointer" style={{ background: 'var(--raised)', color: 'var(--muted)' }}>
                  <ImagePlus className="w-[18px] h-[18px]" aria-hidden="true" />
                </button>
                <button onClick={() => fileInputRef.current?.click()} aria-label="Attach file" className="w-[34px] h-[34px] rounded-full grid place-items-center text-sm flex-shrink-0 border-0 cursor-pointer" style={{ background: 'var(--raised)', color: 'var(--muted)' }}>
                  <Paperclip className="w-[18px] h-[18px]" aria-hidden="true" />
                </button>
                <div className="flex-1 relative">
                  <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} onPaste={handlePaste}
                    placeholder="Type a message..." rows={1}
                    aria-label="Message"
                    className="composer-input w-full rounded-2xl px-3 py-2 text-sm outline-none resize-none"
                    style={{ background: 'var(--raised)', border: '1px solid var(--line)', color: 'var(--ink)', maxHeight: 120 }}
                    onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 120) + 'px' }} />
                </div>
                <button onClick={handleSend} disabled={!input.trim() && pendingFiles.length === 0} aria-label="Send message"
                  className="w-[40px] h-[40px] rounded-full grid place-items-center border-0 cursor-pointer flex-shrink-0"
                  style={{ background: input.trim() || pendingFiles.length > 0 ? '#0F625B' : 'var(--raised)', color: input.trim() || pendingFiles.length > 0 ? '#FFFFFF' : 'var(--faint)', opacity: input.trim() || pendingFiles.length > 0 ? 1 : 0.9 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onPick={(userId) => { setShowNewChat(false); openConversationWith(userId) }}
        />
      )}
    </div>
  )
}

export default function MessagesPage() {
  return <Suspense><MessagesInner /></Suspense>
}
