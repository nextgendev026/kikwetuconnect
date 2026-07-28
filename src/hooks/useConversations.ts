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
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  read_at: string | null
  sender?: { username: string; full_name: string; avatar_url: string | null }
}

export function useConversations() {
  const { user, profile } = useUser()
  const supabase = useSupabase()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<any>(null)

  const fetchConversations = useCallback(async () => {
    if (!user || !profile) return
    const { data } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        conversations (
          id, created_at, updated_at, last_message, last_message_at,
          conversation_participants (
            user_id,
            profiles (id, username, full_name, avatar_url)
          )
        )
      `)
      .eq('user_id', user.id)

    if (data) {
      const convos = (data as any[]).map(cp => {
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
          participants: otherParticipants,
          unread_count: 0
        }
      })
      setConversations(convos)
    }
    setLoading(false)
  }, [supabase, user, profile])

  useEffect(() => {
    fetchConversations()
    if (!user) return
    const channel = supabase.channel('conversations')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => fetchConversations())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, () => fetchConversations())
      .subscribe()
    channelRef.current = channel
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [fetchConversations, user, supabase])

  const createConversation = useCallback(async (otherUserId: string) => {
    if (!user) return null
    const { data: existing } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id)
      .in('conversation_id', 
        supabase.from('conversation_participants').select('conversation_id').eq('user_id', otherUserId)
      )
      .maybeSingle()
    
    if (existing) return existing.conversation_id

    const { data: conv } = await supabase
      .from('conversations')
      .insert({})
      .select('id')
      .single()
    
    if (conv) {
      await supabase.from('conversation_participants').insert([
        { conversation_id: conv.id, user_id: user.id },
        { conversation_id: conv.id, user_id: otherUserId }
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
  const channelRef = useRef<any>(null)

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !user) return
    setLoading(true)
    const { data } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey (username, full_name, avatar_url)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(100)
    
    if (data) {
      const mapped = (data as any[]).map(m => ({
        ...m,
        sender: m.sender
      }))
      setMessages(mapped)
      
      // Mark as read
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .is('read_at', null)
    }
    setLoading(false)
  }, [supabase, conversationId, user])

  useEffect(() => {
    fetchMessages()
    if (!conversationId || !user) return
    const channel = supabase.channel(`messages:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload: { new: any }) => {
        const msg = payload.new as Message
        setMessages(prev => [...prev, msg])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload: { new: any }) => {
        const msg = payload.new as Message
        setMessages(prev => prev.map(m => m.id === msg.id ? msg : m))
      })
      .subscribe()
    channelRef.current = channel
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [fetchMessages, conversationId, user, supabase])

  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId || !user || !content.trim()) return
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
      })
    if (error) toast(error.message)
  }, [supabase, conversationId, user])

  return { messages, loading, fetchMessages, sendMessage }
}