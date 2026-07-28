'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import { RealtimeChannel } from '@supabase/supabase-js'

interface RealtimeContextType {
  subscribeToVotes: (postIds: string[], answerIds: string[], callback: (payload: any) => void) => () => void
  subscribeToNotifications: (userId: string, callback: (payload: any) => void) => () => void
  subscribeToPosts: (callback: (payload: any) => void) => () => void
}

const RealtimeContext = createContext<RealtimeContextType | null>(null)

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [channels, setChannels] = useState<RealtimeChannel[]>([])

  const subscribeToVotes = (postIds: string[], answerIds: string[], callback: (payload: any) => void) => {
    const channel = supabase
      .channel('votes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
          filter: `target_id=in.(${postIds.join(',')},${answerIds.join(',')})`,
        },
        callback
      )
      .subscribe()

    setChannels(prev => [...prev, channel])

    return () => {
      supabase.removeChannel(channel)
      setChannels(prev => prev.filter(c => c !== channel))
    }
  }

  const subscribeToNotifications = (userId: string, callback: (payload: any) => void) => {
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe()

    setChannels(prev => [...prev, channel])

    return () => {
      supabase.removeChannel(channel)
      setChannels(prev => prev.filter(c => c !== channel))
    }
  }

  const subscribeToPosts = (callback: (payload: any) => void) => {
    const channel = supabase
      .channel('posts-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
        },
        callback
      )
      .subscribe()

    setChannels(prev => [...prev, channel])

    return () => {
      supabase.removeChannel(channel)
      setChannels(prev => prev.filter(c => c !== channel))
    }
  }

  useEffect(() => {
    return () => {
      channels.forEach(channel => supabase.removeChannel(channel))
    }
  }, [channels, supabase])

  return (
    <RealtimeContext.Provider value={{ subscribeToVotes, subscribeToNotifications, subscribeToPosts }}>
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtime() {
  const context = useContext(RealtimeContext)
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider')
  }
  return context
}