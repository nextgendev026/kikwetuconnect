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
const PRESENCE_CHANNEL = 'online-presence'

type ChannelState = 'UNSUBSCRIBED' | 'SUBSCRIBING' | 'SUBSCRIBED'

const presenceChannels = new Map<string, { channel: any; state: ChannelState; refs: number }>()

export function usePresence() {
  const { user, profile } = useUser()
  const supabase = useSupabase()
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([])
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())
  const localChannelRef = useRef<any>(null)
  const localStateRef = useRef<ChannelState>('UNSUBSCRIBED')

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

  const handlePresenceSync = useCallback((channel: any, excludeUserId: string | undefined) => {
    const state = channel.presenceState()
    const ids = Object.keys(state).filter(k => k !== excludeUserId)
    void syncOnlineUsers(ids)
  }, [syncOnlineUsers])

  const refresh = useCallback(() => {
    const channel = localChannelRef.current
    if (!channel) return
    const state = channel.presenceState()
    const ids = Object.keys(state).filter(k => k !== user?.id)
    void syncOnlineUsers(ids)
  }, [user, syncOnlineUsers])

  useEffect(() => {
    if (!supabase || !profile) return

    const channelName = PRESENCE_CHANNEL
    let shared = presenceChannels.get(channelName)

    if (!shared) {
      const channel = supabase.channel(channelName)
      shared = { channel, state: 'UNSUBSCRIBED' as ChannelState, refs: 0 }
      presenceChannels.set(channelName, shared)

      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const ids = Object.keys(state).filter(k => k !== user?.id)
        void syncOnlineUsers(ids)
      })

      channel.subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          shared!.state = 'SUBSCRIBED'
          await channel.track({ user_id: profile.id, online_at: new Date().toISOString() })
          const state = channel.presenceState()
          const ids = Object.keys(state).filter(k => k !== user?.id)
          void syncOnlineUsers(ids)
        }
      })

      localChannelRef.current = channel
      localStateRef.current = 'SUBSCRIBING'
    } else {
      if (shared.state === 'SUBSCRIBED') {
        const state = shared.channel.presenceState()
        const ids = Object.keys(state).filter(k => k !== user?.id)
        void syncOnlineUsers(ids)
      }
      localChannelRef.current = shared.channel
      localStateRef.current = shared.state
    }
    shared.refs += 1

    const heartbeat = setInterval(() => {
      if (localStateRef.current !== 'SUBSCRIBED') return
      localChannelRef.current.track({ user_id: profile.id, online_at: new Date().toISOString() }).catch(() => { /* ignore */ })
    }, HEARTBEAT_MS)

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && localStateRef.current === 'SUBSCRIBED') {
        localChannelRef.current.track({ user_id: profile.id, online_at: new Date().toISOString() }).catch(() => { /* ignore */ })
      }
    }
    window.addEventListener('visibilitychange', onVisibility)

    return () => {
      clearInterval(heartbeat)
      window.removeEventListener('visibilitychange', onVisibility)
      if (localStateRef.current === 'SUBSCRIBED' && localChannelRef.current) {
        localChannelRef.current.untrack().catch(() => { /* ignore */ })
      }
      localChannelRef.current = null
      localStateRef.current = 'UNSUBSCRIBED'

      if (shared!.refs <= 1) {
        try { shared!.channel.unsubscribe() } catch { /* ignore */ }
        presenceChannels.delete(channelName)
      } else {
        shared!.refs -= 1
      }
    }
  }, [supabase, profile, user, syncOnlineUsers])

  return { onlineUsers, onlineIds, onlineCount: onlineUsers.length, refresh }
}
