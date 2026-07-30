'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useSupabase, useUser, toast } from '@/app/providers'

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
  sender?: { username: string; full_name: string; avatar_url: string | null }
  reactions?: MessageReaction[]
  media?: MediaItem[]
}

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
  full_name: string
}

export function useConversations() {
  const { user, profile } = useUser()
  const supabase = useSupabase()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<any>(null)

  const fetchUnreadCounts = useCallback(async () => {
    if (!user) return {}
    const { data } = await supabase.rpc('unread_message_count')
    return (data as Array<{ conversation_id: string; count: number }> || []).reduce((acc: Record<string, number>, r: any) => {
      acc[r.conversation_id || r.conversation_id] = r.count
      return acc
    }, {})
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

  return { conversations, loading, fetchConversations, createConversation }
}

export function useMessages(conversationId: string | null) {
  const { user } = useUser()
  const supabase = useSupabase()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const channelRef = useRef<any>(null)
  const typingRef = useRef<any>(null)
  const typingTimeoutRef = useRef<any>(null)

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !user) return
    setLoading(true)
    const [msgResult, reactResult, mediaResult] = await Promise.all([
      supabase
        .from('messages')
        .select(`*, sender:profiles!messages_sender_id_fkey (username, full_name, avatar_url)`)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(100),
      supabase
        .from('message_reactions')
        .select('*')
        .in('message_id', messages.map(m => m.id)),
      supabase
        .from('media_items')
        .select('*')
        .in('message_id', messages.map(m => m.id))
    ])

    if (msgResult.data) {
      const reactionsMap: Record<string, MessageReaction[]> = {}
      reactResult.data?.forEach((r: any) => {
        if (!reactionsMap[r.message_id]) reactionsMap[r.message_id] = []
        reactionsMap[r.message_id].push(r)
      })
      const mediaMap: Record<string, MediaItem[]> = {}
      mediaResult.data?.forEach((m: any) => {
        if (!mediaMap[m.message_id]) mediaMap[m.message_id] = []
        mediaMap[m.message_id].push(m)
      })
      const mapped = (msgResult.data as any[]).map(m => ({
        ...m,
        sender: m.sender,
        reactions: reactionsMap[m.id] || [],
        media: mediaMap[m.id] || [],
      }))
      setMessages(mapped)
      await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId })
    }
    setLoading(false)
  }, [supabase, conversationId, user])

  useEffect(() => {
    fetchMessages()
    if (!conversationId || !user) return

    const channel = supabase.channel(`messages:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload: any) => {
        const msg = payload.new as Message
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload: any) => {
        const msg = payload.new as Message
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, ...msg } : m))
      })
      .subscribe()
    channelRef.current = channel

    const typingChannel = supabase.channel(`typing:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_typing', filter: `conversation_id=eq.${conversationId}` }, async (payload: any) => {
        const t = payload.new as any
        if (t.user_id === user.id) return
        const { data: prof } = await supabase.from('profiles').select('username, full_name').eq('id', t.user_id).single()
        if (prof) setTypingUsers(prev => prev.some(u => u.user_id === t.user_id) ? prev : [...prev, { user_id: t.user_id, ...prof }])
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'user_typing', filter: `conversation_id=eq.${conversationId}` }, (payload: any) => {
        const old = payload.old as any
        setTypingUsers(prev => prev.filter(u => u.user_id !== old.user_id))
      })
      .subscribe()
    typingRef.current = typingChannel

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      if (typingRef.current) supabase.removeChannel(typingRef.current)
    }
  }, [fetchMessages, conversationId, user, supabase])

  const sendMessage = useCallback(async (content: string, messageType: string = 'text', metadata: any = {}) => {
    if (!conversationId || !user || !content.trim()) return
    const { error } = await supabase.rpc('send_message', {
      p_conversation_id: conversationId,
      p_content: content.trim(),
      p_message_type: messageType,
      p_metadata: metadata,
    })
    if (error) toast(error.message)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    await supabase.from('user_typing').delete().eq('conversation_id', conversationId).eq('user_id', user.id)
  }, [supabase, conversationId, user])

  const sendMediaMessage = useCallback(async (file: File, messageType: string) => {
    if (!conversationId || !user) return null
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `chat/${conversationId}/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error: uploadErr } = await supabase.storage.from('media').upload(path, file)
    if (uploadErr) { toast(uploadErr.message); return null }
    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path)
    const metadata = { url: publicUrl, name: file.name, size: file.size, mime: file.type }
    const { error } = await supabase.rpc('send_message', {
      p_conversation_id: conversationId,
      p_content: '',
      p_message_type: messageType,
      p_metadata: metadata,
    })
    if (error) { toast(error.message); return null }
    return publicUrl
  }, [supabase, conversationId, user])

  const startTyping = useCallback(async () => {
    if (!conversationId || !user) return
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    await supabase.from('user_typing').upsert({ conversation_id: conversationId, user_id: user.id }, { onConflict: 'conversation_id,user_id' })
    typingTimeoutRef.current = setTimeout(async () => {
      await supabase.from('user_typing').delete().eq('conversation_id', conversationId).eq('user_id', user.id)
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

  return { messages, loading, fetchMessages, sendMessage, sendMediaMessage, startTyping, typingUsers, addReaction, removeReaction }
}
