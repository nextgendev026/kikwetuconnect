'use client'
import { useState, useCallback, useEffect } from 'react'
import { useSupabase, useUser, toast } from '@/app/providers'

interface GeoPosition {
  latitude: number
  longitude: number
  accuracy: number
}

export function useGeolocation() {
  const [position, setPosition] = useState<GeoPosition | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [permitted, setPermitted] = useState<boolean | null>(null)
  const supabase = useSupabase()
  const { user } = useUser()

  const requestPosition = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        })
      })
      const p = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }
      setPosition(p)
      setPermitted(true)

      // Save to database
      if (user) {
        await supabase.from('user_locations').upsert({
          user_id: user.id,
          latitude: p.latitude,
          longitude: p.longitude,
          accuracy: p.accuracy,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
      }
    } catch (err: any) {
      if (err.code === 1) {
        setPermitted(false)
        setError('Location permission denied')
      } else if (err.code === 2) {
        setError('Location unavailable')
      } else if (err.code === 3) {
        setError('Location request timed out')
      } else {
        setError(err.message || 'Failed to get location')
      }
    } finally {
      setLoading(false)
    }
  }, [supabase, user])

  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        setPermitted(result.state === 'granted')
        if (result.state === 'granted') requestPosition()
        result.onchange = () => setPermitted(result.state === 'granted')
      }).catch(() => {})
    }
  }, [requestPosition])

  return { position, error, loading, permitted, requestPosition }
}
