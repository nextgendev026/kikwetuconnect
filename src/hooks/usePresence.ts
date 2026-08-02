'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useSupabase, useUser } from '@/app/providers'

export interface PresenceUser {
  id: string
  username: string
  full_name: string
  avatar_url: string | null
  heshima_rating?: number
  county_hub?: string
  is_verified_expert?: boolean
}

const HEARTBEAT_MS = 30000

export function usePresence() {
  const { user, profile } = useUser()
  const supabase = useSupabase()
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([])
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())
  const channelRef = useRef<any>(null)

  const syncOnlineUsers = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setOnlineUsers([])
      setOnlineIds(new Set())
      return
    }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, heshima_rating, county_hub, is_verified_expert')
        .in('id', ids)
      const users = (data as PresenceUser[] | null) || []
      setOnlineUsers(users)
      setOnlineIds(new Set(users.map(u => u.id)))
    } catch { /* presence is non-critical */ }
  }, [supabase])

  const refresh = useCallback(() => {
    const channel = channelRef.current
    if (!channel) return
    const state = channel.presenceState()
    const ids = Object.keys(state).filter(k => k !== user?.id)
    void syncOnlineUsers(ids)
  }, [user, syncOnlineUsers])

  useEffect(() => {
    if (!supabase || !profile) return
    const channel = supabase.channel('online-presence')
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      const ids = Object.keys(state).filter(k => k !== user?.id)
      void syncOnlineUsers(ids)
    }).subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_id: profile.id, online_at: new Date().toISOString() })
      }
    })
    channelRef.current = channel

    const heartbeat = setInterval(() => {
      channel.track({ user_id: profile.id, online_at: new Date().toISOString() }).catch(() => { /* ignore */ })
    }, HEARTBEAT_MS)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        channel.track({ user_id: profile.id, online_at: new Date().toISOString() }).catch(() => { /* ignore */ })
      }
    }
    window.addEventListener('visibilitychange', onVisibility)

    return () => {
      clearInterval(heartbeat)
      window.removeEventListener('visibilitychange', onVisibility)
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }, [supabase, profile, user, syncOnlineUsers])

  return { onlineUsers, onlineIds, onlineCount: onlineUsers.length, refresh }
}
