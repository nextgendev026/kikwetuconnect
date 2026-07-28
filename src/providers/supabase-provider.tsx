'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'

const SupabaseContext = createContext<any>(undefined)

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ))

  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase() {
  const context = useContext(SupabaseContext)
  if (!context) {
    throw new Error('useSupabase must be used within SupabaseProvider')
  }
  return context
}

export function useUser() {
  const supabase = useSupabase()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(profile)
      }
      setLoading(false)
    }
    getUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          setProfile(profile)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )
    return () => { subscription.unsubscribe() }
  }, [supabase])

  return { user, profile, loading }
}

export function useRealtime<T>(
  table: string,
  query?: (query: any) => any
) {
  const supabase = useSupabase()
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      let queryBuilder = supabase.from(table).select('*')
      if (query) {
        queryBuilder = query(queryBuilder)
      }
      const { data: result, error } = await queryBuilder
      if (error) setError(error.message)
      else setData(result || [])
      setLoading(false)
    }
    fetchData()
    const subscription = supabase
      .channel(`public:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table },
        (payload: any) => {
          setData((prev: any) => {
            const newData = [...prev]
            const index = newData.findIndex((item: any) => item.id === payload.new?.id)
            if (payload.eventType === 'INSERT') return [payload.new as T, ...newData]
            else if (payload.eventType === 'UPDATE') {
              if (index >= 0) newData[index] = payload.new as T
              return newData
            } else if (payload.eventType === 'DELETE') {
              return newData.filter((item: any) => item.id !== payload.old?.id)
            }
            return newData
          })
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(subscription) }
  }, [supabase, table, JSON.stringify(query)])

  return { data, loading, error }
}
