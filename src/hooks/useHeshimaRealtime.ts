'use client'
import { useEffect } from 'react'
import { useSupabase, useUser, toast } from '@/app/providers'

export default function useHeshimaRealtime() {
  const supabase = useSupabase()
  const { profile } = useUser()

  useEffect(() => {
    if (!profile) return
    const userId = profile.id

    const notifChannel = supabase
      .channel(`heshima-notifs-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload: any) => {
        const n = payload.new
        if (n.type === 'heshima_earning') toast(`+${n.data?.amount || ''} Heshima`)
        else if (n.type === 'badge_awarded') toast(`${n.body || 'New badge! 🎉'}`)
      })
      .subscribe()

    const earningsChannel = supabase
      .channel(`heshima-earnings-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'heshima_earnings', filter: `user_id=eq.${userId}` }, (payload: any) => {
        const e = payload.new
        toast(`+${e.amount} Heshima ${e.description ? '— ' + e.description : ''}`)
      })
      .subscribe()

    const badgesChannel = supabase
      .channel(`heshima-badges-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_badges', filter: `user_id=eq.${userId}` }, (payload: any) => {
        toast('Badge unlocked 🎉')
      })
      .subscribe()

    return () => {
      supabase.removeChannel(notifChannel)
      supabase.removeChannel(earningsChannel)
      supabase.removeChannel(badgesChannel)
    }
  }, [supabase, profile])
}
