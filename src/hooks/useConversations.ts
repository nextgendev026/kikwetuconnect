'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useSupabase, useUser, toast } from '@/app/providers'
import { track } from '@/lib/analytics'

export interface Conversation {
  id: string
  created_at: string
  updated_at: string
  last_message: string | null
  last_message_at: string | null
  participants: Array<{ id: string; username: string; full_name: string; avatar_url: string | null }>
  unread_count: number
  type: string
}

export interface Message {
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
  client_temp_id?: string
  upload_progress?: number | null
  upload_error?: string | null
  sender?: { username: string; full_name: string | null; avatar_url: string | null }
  reactions?: MessageReaction[]
  media?: MediaItem[]
}

export const MESSAGE_PAGE_SIZE = 50

export interface MessageReaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
}

export interface MediaItem {
  id: string
  url: string
  thumbnail_url: string | null
  type: string
  width: number | null
  height: number | null
  duration: number
  sort_order: number
}

export interface TypingUser {
  user_id: string
  username: string
  full_name: string | null
}

export function useConversations() {
  const { user, profile } = useUser()
  const supabase = useSupabase()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<any>(null)

  const fetchUnreadCounts = useCallback(async () => {
    if (!user) return {}
    const { data } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('user_id', user.id)
    if (!data) return {}
    const convIds = data.map(r => r.conversation_id)
    if (convIds.length === 0) return {}

    const { data: unread } = await supabase
      .from('messages')
      .select('conversation_id, id, created_at')
      .in('conversation_id', convIds)
      .neq('sender_id', user.id)
      .is('read_at', null)

    const lastRead = new Map(data.map(r => [r.conversation_id, r.last_read_at]))
    const acc: Record<string, number> = {}
    for (const m of unread || []) {
      if (!m.conversation_id || !m.created_at) continue
      const lr = lastRead.get(m.conversation_id)
      if (lr && new Date(m.created_at).getTime() <= new Date(lr).getTime()) continue
      acc[m.conversation_id] = (acc[m.conversation_id] || 0) + 1
    }
    return acc
  }, [supabase, user])

  const fetchConversations = useCallback(async () => {
    if (!user || !profile) return
    const [convResult, unreadResult] = await Promise.all([
      supabase
        .from('conversation_participants')
        .select(`
          conversation_id, last_read_at,
          conversations (
            id, created_at, updated_at, last_message, last_message_at, type, title,
            conversation_participants (
              user_id,
              profiles (id, username, full_name, avatar_url)
            )
          )
        `)
        .eq('user_id', user.id)
        .order('conversation_id', { ascending: false }),
      fetchUnreadCounts()
    ])

    if (convResult.data) {
      const convos = (convResult.data as any[]).map(cp => {
        const conv = cp.conversations
        const otherParticipants = conv.conversation_participants
          .filter((p: any) => p.user_id !== user.id)
          .map((p: any) => p.profiles)
        return {
          id: conv.id,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
          last_message: conv.last_message,
          last_message_at: conv.last_message_at,
          type: conv.type,
          title: conv.title,
          participants: otherParticipants,
          unread_count: unreadResult[conv.id] || 0
        }
      })
      convos.sort((a: any, b: any) => new Date(b.last_message_at || b.created_at).getTime() - new Date(a.last_message_at || a.created_at).getTime())
      setConversations(convos)
    }
    setLoading(false)
  }, [supabase, user, profile, fetchUnreadCounts])

  useEffect(() => {
    fetchConversations()
    if (!user) return
    const channel = supabase.channel('conversations-hook')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (p: any) => {
        const msg = p.new as any
        if (msg.sender_id !== user.id) {
          setConversations(prev => prev.map(c => c.id === msg.conversation_id ? { ...c, unread_count: c.unread_count + 1 } : c))
        }
        fetchConversations()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, () => fetchConversations())
      .subscribe()
    channelRef.current = channel
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [fetchConversations, user, supabase])

  const createConversation = useCallback(async (otherUserId: string, convType: string = 'dm') => {
    if (!user) return null
    const { data: theirConvs } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', otherUserId)
    const theirIds = theirConvs?.map(c => c.conversation_id) || []
    if (theirIds.length > 0) {
      const { data: existing } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id)
        .in('conversation_id', theirIds)
        .maybeSingle()
      if (existing) return existing.conversation_id
    }
    const { data: conv } = await supabase
      .from('conversations')
      .insert({ type: convType, created_by: user.id })
      .select('id')
      .single()
    if (conv) {
      await supabase.from('conversation_participants').insert([
        { conversation_id: conv.id, user_id: user.id },
        { conversation_id: conv.id, user_id: otherUserId },
      ])
      return conv.id
    }
    return null
  }, [supabase, user])

  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!user) return false
    const { error } = await supabase
      .from('conversation_participants')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
    if (error) { toast(error.message); return false }
    setConversations(prev => prev.filter(c => c.id !== conversationId))
    return true
  }, [supabase, user])

  const deleteConversations = useCallback(async (conversationIds: string[]) => {
    if (!user || conversationIds.length === 0) return false
    const { error } = await supabase
      .from('conversation_participants')
      .delete()
      .in('conversation_id', conversationIds)
      .eq('user_id', user.id)
    if (error) { toast(error.message); return false }
    setConversations(prev => prev.filter(c => !conversationIds.includes(c.id)))
    return true
  }, [supabase, user])

  return { conversations, loading, fetchConversations, createConversation, deleteConversation, deleteConversations }
}

export function useMessages(conversationId: string | null) {
  const { user, profile } = useUser()
  const supabase = useSupabase()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [hasEarlier, setHasEarlier] = useState(false)
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const channelRef = useRef<any>(null)
  const typingRef = useRef<any>(null)
  const typingTimeoutRef = useRef<any>(null)
  const messagesRef = useRef<Message[]>([])
  useEffect(() => { messagesRef.current = messages }, [messages])
  const pendingRef = useRef<Map<string, Message>>(new Map())

  const applySender = useCallback(async (msg: Message): Promise<Message> => {
    if (!msg.sender && msg.sender_id !== user?.id) {
      const { data: prof } = await supabase.from('profiles').select('username, full_name, avatar_url').eq('id', msg.sender_id).maybeSingle()
      if (prof) return { ...msg, sender: prof }
    }
    return msg
  }, [supabase, user])

  const fetchBatch = useCallback(async (olderThan?: string) => {
    if (!conversationId || !user) return []
    let query = supabase
      .from('messages')
      .select(`*, sender:profiles!messages_sender_id_fkey (username, full_name, avatar_url)`)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: olderThan ? false : true })
      .limit(MESSAGE_PAGE_SIZE)
    if (olderThan) query = query.lt('created_at', olderThan)
    const msgResult = await query
    const msgRows = (msgResult.data as any[] || []).slice()
    if (olderThan) msgRows.reverse()
    if (msgRows.length === 0) return []

    const msgIds = msgRows.map(m => m.id)
    const [reactResult, mediaResult] = await Promise.all([
      supabase.from('message_reactions').select('*').in('message_id', msgIds),
      supabase.from('media_items').select('*').in('message_id', msgIds),
    ])
    const reactionsMap: Record<string, MessageReaction[]> = {}
    reactResult?.data?.forEach((r: any) => {
      if (!reactionsMap[r.message_id]) reactionsMap[r.message_id] = []
      reactionsMap[r.message_id].push(r)
    })
    const mediaMap: Record<string, MediaItem[]> = {}
    mediaResult?.data?.forEach((m: any) => {
      if (!mediaMap[m.message_id]) mediaMap[m.message_id] = []
      mediaMap[m.message_id].push(m)
    })
    return msgRows.map(m => ({
      ...m,
      status: m.status || 'sent',
      sender: m.sender,
      reactions: reactionsMap[m.id] || [],
      media: mediaMap[m.id] || [],
    }))
  }, [supabase, conversationId, user])

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !user) return
    setLoading(true)
    const rows = await fetchBatch()
    setMessages(rows)
    setHasEarlier(rows.length === MESSAGE_PAGE_SIZE)
    if (rows.length > 0) {
      try { await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId }) } catch { /* ignore */ }
    }
    setLoading(false)
  }, [conversationId, user, fetchBatch, supabase])

  const loadEarlier = useCallback(async () => {
    const current = messagesRef.current
    const oldest = current[0]
    if (!oldest) return
    const olderRows = await fetchBatch(oldest.created_at)
    if (olderRows.length > 0) setMessages(prev => [...olderRows, ...prev])
    setHasEarlier(olderRows.length === MESSAGE_PAGE_SIZE)
  }, [fetchBatch])

  const reconcilePending = (serverMsg: Message): Message[] => {
    const tempId = serverMsg.metadata?.client_temp_id
    const list = messagesRef.current
    if (tempId) {
      const idx = list.findIndex(m => m.client_temp_id === tempId)
      if (idx >= 0) {
        const next = list.slice()
        next[idx] = { ...serverMsg, status: 'sent', sender: next[idx].sender }
        pendingRef.current.delete(tempId)
        return next
      }
    }
    if (list.some(m => m.id === serverMsg.id)) return list
    return [...list, serverMsg]
  }

  useEffect(() => {
    fetchMessages()
    if (!conversationId || !user) return

    const pendingMap = pendingRef.current
    const channel = supabase.channel(`messages:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, async (payload: any) => {
        const raw = payload.new as Message
        const msg = await applySender(raw)
        setMessages(reconcilePending(msg))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload: any) => {
        const msg = payload.new as Message
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, ...msg, reactions: m.reactions, media: m.media } : m))
      })
      .subscribe()
    channelRef.current = channel

    const typingChannel = supabase.channel(`typing:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_typing', filter: `conversation_id=eq.${conversationId}` }, async (payload: any) => {
        const t = payload.new as any
        if (t.user_id === user.id) return
        const { data: prof } = await supabase.from('profiles').select('username, full_name').eq('id', t.user_id).maybeSingle()
        if (prof) setTypingUsers(prev => prev.some(u => u.user_id === t.user_id) ? prev : [...prev, { user_id: t.user_id, ...prof }])
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'user_typing', filter: `conversation_id=eq.${conversationId}` }, (payload: any) => {
        const old = payload.old as any
        setTypingUsers(prev => prev.filter(u => u.user_id !== old.user_id))
      })
      .subscribe()
    typingRef.current = typingChannel

    return () => {
      const msgChannel = channelRef.current
      const typingChannel = typingRef.current
      if (msgChannel) supabase.removeChannel(msgChannel)
      if (typingChannel) supabase.removeChannel(typingChannel)
      const pending = pendingMap
      pending.clear()
    }
  }, [fetchMessages, conversationId, user, supabase, applySender])

  const clearTyping = useCallback(async () => {
    if (!conversationId || !user) return
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    try { await supabase.from('user_typing').delete().eq('conversation_id', conversationId).eq('user_id', user.id) } catch { /* ignore */ }
  }, [supabase, conversationId, user])

  const persistPending = (pending: Message) => {
    pendingRef.current.set(pending.client_temp_id!, pending)
    setMessages(prev => prev.some(m => m.client_temp_id === pending.client_temp_id) ? prev : [...prev, pending])
  }

  const markPendingStatus = (tempId: string, patch: Partial<Message>) => {
    setMessages(prev => prev.map(m => m.client_temp_id === tempId ? { ...m, ...patch } : m))
  }

  const sendMessage = useCallback(async (content: string, messageType: string = 'text', metadata: any = {}, onProgress?: (p: number) => void) => {
    if (!conversationId || !user || !content.trim()) return null
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const replyTo = metadata?.reply_to || null
    const cleanMeta = { ...metadata }
    delete cleanMeta.reply_to
    const pending: Message = {
      id: tempId,
      client_temp_id: tempId,
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.trim(),
      message_type: messageType,
      metadata: { ...cleanMeta, client_temp_id: tempId },
      reply_to: replyTo,
      status: 'sending',
      created_at: new Date().toISOString(),
      read_at: null,
      sender: profile ? { username: profile.username, full_name: profile.full_name || '', avatar_url: profile.avatar_url } : undefined,
    }
    persistPending(pending)
    track('message_sent', { message_type: messageType })
    const { error } = await supabase.rpc('send_message', {
      p_conversation_id: conversationId,
      p_content: content.trim(),
      p_message_type: messageType,
      p_metadata: { ...cleanMeta, client_temp_id: tempId },
      p_reply_to: replyTo || undefined,
    })
    if (error) {
      markPendingStatus(tempId, { status: 'failed' })
      return null
    }
    markPendingStatus(tempId, { status: 'sent' })
    await clearTyping()
    return tempId
  }, [conversationId, user, profile, supabase, clearTyping])

  const retryMessage = useCallback(async (tempId: string) => {
    const msg = messagesRef.current.find(m => m.client_temp_id === tempId)
    if (!msg) return
    if (!conversationId) return
    markPendingStatus(tempId, { status: 'sending' })
    const replyTo = msg.reply_to || undefined
    const { error } = await supabase.rpc('send_message', {
      p_conversation_id: conversationId,
      p_content: msg.content,
      p_message_type: msg.message_type,
      p_metadata: { ...msg.metadata },
      p_reply_to: replyTo,
    })
    if (error) { markPendingStatus(tempId, { status: 'failed' }); return false }
    markPendingStatus(tempId, { status: 'sent' })
    return true
  }, [conversationId, supabase])

  const discardMessage = useCallback((tempId: string) => {
    setMessages(prev => prev.filter(m => m.client_temp_id !== tempId))
    pendingRef.current.delete(tempId)
  }, [])

  const sendMediaMessage = useCallback(async (file: File, messageType: string, onProgress?: (p: number) => void) => {
    if (!conversationId || !user) return null
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const pending: Message = {
      id: tempId,
      client_temp_id: tempId,
      conversation_id: conversationId,
      sender_id: user.id,
      content: messageType === 'image' ? '📷 Image' : '📎 File',
      message_type: messageType,
      metadata: { client_temp_id: tempId, name: file.name, size: file.size, mime: file.type },
      reply_to: null,
      status: 'sending',
      upload_progress: 0,
      created_at: new Date().toISOString(),
      read_at: null,
      sender: profile ? { username: profile.username, full_name: profile.full_name || '', avatar_url: profile.avatar_url } : undefined,
    }
    persistPending(pending)

    const ext = file.name.split('.').pop() || 'jpg'
    const path = `chat/${conversationId}/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    try {
      const { data: signedData, error: signedErr } = await supabase.storage
        .from('media')
        .createSignedUploadUrl(path)
      if (signedErr) throw new Error(signedErr.message)

      const put = new XMLHttpRequest()
      await new Promise<void>((resolve, reject) => {
        put.open('PUT', signedData.signedUrl)
        put.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100)
            markPendingStatus(tempId, { upload_progress: pct })
            onProgress?.(pct)
          }
        }
        put.onload = () => (put.status >= 200 && put.status < 300 ? resolve() : reject(new Error(`Upload failed (${put.status})`)))
        put.onerror = () => reject(new Error('Upload failed'))
        put.send(file)
      })

      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path)
      markPendingStatus(tempId, { upload_progress: 100 })
      const { error } = await supabase.rpc('send_message', {
        p_conversation_id: conversationId,
        p_content: messageType === 'image' ? '📷 Image' : '📎 File',
        p_message_type: messageType,
        p_metadata: { path, name: file.name, size: file.size, mime: file.type, client_temp_id: tempId },
      })
      if (error) throw new Error(error.message)
      markPendingStatus(tempId, { status: 'sent', metadata: { ...pending.metadata, path } })
      return path
    } catch (err: any) {
      markPendingStatus(tempId, { status: 'failed', upload_error: err?.message || 'Upload failed' })
      return null
    }
  }, [supabase, conversationId, user, profile])

  const startTyping = useCallback(async () => {
    if (!conversationId || !user) return
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    try {
      await supabase.from('user_typing').upsert({ conversation_id: conversationId, user_id: user.id }, { onConflict: 'conversation_id,user_id' })
    } catch { /* typing indicator errors are non-critical */ }
    typingTimeoutRef.current = setTimeout(async () => {
      try {
        await supabase.from('user_typing').delete().eq('conversation_id', conversationId).eq('user_id', user.id)
      } catch { /* ignore */ }
    }, 3000)
  }, [supabase, conversationId, user])

  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return
    const { error } = await supabase.from('message_reactions').upsert(
      { message_id: messageId, user_id: user.id, emoji },
      { onConflict: 'message_id,user_id,emoji' }
    )
    if (error) toast(error.message)
  }, [supabase, user])

  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return
    await supabase.from('message_reactions').delete()
      .eq('message_id', messageId).eq('user_id', user.id).eq('emoji', emoji)
  }, [supabase, user])

  return { messages, loading, hasEarlier, fetchMessages, loadEarlier, sendMessage, sendMediaMessage, retryMessage, discardMessage, startTyping, typingUsers, addReaction, removeReaction }
}
