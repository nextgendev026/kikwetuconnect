'use client'
import { useState, useCallback, useEffect, useRef } from 'react'

export function useGeolocation() {
  const [permitted, setPermitted] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [position, setPosition] = useState<GeolocationPosition | null>(null)
  const watchId = useRef<number | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.permissions.query({ name: 'geolocation' }).then(result => {
      setPermitted(result.state === 'granted')
      result.onchange = () => setPermitted(result.state === 'granted')
    })
  }, [])

  const requestPosition = useCallback(() => {
    if (!navigator.geolocation) return
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => { setPosition(pos); setPermitted(true); setLoading(false) },
      () => { setPermitted(false); setLoading(false) },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    )
  }, [])

  return { permitted, loading, position, requestPosition }
}
