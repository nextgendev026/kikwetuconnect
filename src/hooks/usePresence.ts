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

const HEARTBEAT_MS = 15000
const REFRESH_MS = 15000
const PRESENCE_CHANNEL = 'online-presence'

type ChannelState = 'UNSUBSCRIBED' | 'SUBSCRIBING' | 'SUBSCRIBED'

interface SharedChannel {
  channel: any
  state: ChannelState
  refs: number
  /** Every usePresence subscriber registers a listener fired on each presence sync. */
  listeners: Set<() => void>
  /** Guards so the current user's presence is tracked once across all subscribers. */
  tracked: boolean
}

// One realtime channel is shared across all usePresence subscribers on the
// client (AppShell, Messages, etc.). Each subscriber registers its own sync
// listener so online/offline changes render in real time everywhere, and the
// user's presence is only untracked when the LAST subscriber unmounts.
const presenceChannels = new Map<string, SharedChannel>()

export function usePresence() {
  const { user, profile } = useUser()
  const supabase = useSupabase()
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([])
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())
  const userIdRef = useRef<string | undefined>(undefined)
  const profileIdRef = useRef<string | undefined>(undefined)
  useEffect(() => { userIdRef.current = user?.id }, [user?.id])
  useEffect(() => { profileIdRef.current = profile?.id }, [profile?.id])

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

  const readState = useCallback((channel: any) => {
    // presenceState() is keyed by per-client presence keys (socket/connection ids),
    // NOT user ids. The actual profile id lives on each tracked payload as `user_id`.
    const state = channel.presenceState() as Record<string, Array<{ user_id?: string }> | { user_id?: string }>
    const ids = new Set<string>()
    for (const presences of Object.values(state)) {
      const list = Array.isArray(presences) ? presences : [presences]
      for (const p of list) {
        if (p?.user_id && p.user_id !== userIdRef.current) ids.add(p.user_id)
      }
    }
    void syncOnlineUsers(Array.from(ids))
  }, [syncOnlineUsers])

  const trackMe = useCallback((sc: SharedChannel) => {
    const pid = profileIdRef.current
    if (!pid) return
    if (sc.tracked) return
    sc.tracked = true
    sc.channel.track({ user_id: pid, online_at: new Date().toISOString() }).catch(() => { /* ignore */ })
  }, [])

  useEffect(() => {
    if (!supabase || !profile?.id) return

    let sc = presenceChannels.get(PRESENCE_CHANNEL)
    if (!sc) {
      const channel = supabase.channel(PRESENCE_CHANNEL)
      sc = { channel, state: 'UNSUBSCRIBED', refs: 0, listeners: new Set(), tracked: false }
      presenceChannels.set(PRESENCE_CHANNEL, sc)

      channel.on('presence', { event: 'sync' }, () => {
        for (const fn of sc!.listeners) fn()
      })

      channel.subscribe((status: string) => {
        sc!.state = status as ChannelState
        if (status === 'SUBSCRIBED') {
          trackMe(sc!)
          for (const fn of sc!.listeners) fn()
        }
      })
    }

    const listener = () => readState(sc.channel)
    sc.listeners.add(listener)
    sc.refs += 1
    trackMe(sc)

    if (sc.state === 'SUBSCRIBED') readState(sc.channel)

    const heartbeat = setInterval(() => {
      if (sc!.state !== 'SUBSCRIBED') return
      const pid = profileIdRef.current
      if (!pid) return
      sc!.channel.track({ user_id: pid, online_at: new Date().toISOString() }).catch(() => { /* ignore */ })
    }, HEARTBEAT_MS)

    // Backup poll so statuses converge even if a presence sync event is missed.
    const refreshPoll = setInterval(() => {
      if (sc!.state === 'SUBSCRIBED') readState(sc!.channel)
    }, REFRESH_MS)

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && sc!.state === 'SUBSCRIBED') {
        trackMe(sc!)
      }
    }
    const onFocus = () => {
      if (sc!.state === 'SUBSCRIBED') readState(sc!.channel)
    }
    window.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onFocus)

    return () => {
      clearInterval(heartbeat)
      clearInterval(refreshPoll)
      window.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onFocus)
      sc!.listeners.delete(listener)
      sc!.refs -= 1
      if (sc!.refs <= 0) {
        try { sc!.channel.untrack().catch(() => { /* ignore */ }) } catch { /* ignore */ }
        try { sc!.channel.unsubscribe() } catch { /* ignore */ }
        presenceChannels.delete(PRESENCE_CHANNEL)
      }
    }
  }, [supabase, profile?.id, readState, trackMe])

  const refresh = useCallback(() => {
    const sc = presenceChannels.get(PRESENCE_CHANNEL)
    if (!sc || sc.state !== 'SUBSCRIBED') return
    readState(sc.channel)
  }, [readState])

  return { onlineUsers, onlineIds, onlineCount: onlineUsers.length, refresh }
}
