'use client'
import { useEffect } from 'react'

/**
 * Keeps `--app-height` on <html> in sync with the *visual* viewport so that
 * fixed-height screens (notably the chat/messages page) resize correctly when
 * the on-screen keyboard opens or the browser UI collapses. Falls back to
 * `100dvh` when the VisualViewport API is unavailable.
 */
export function useKeyboardViewport() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const setHeight = () => {
      const vv = window.visualViewport
      const height = vv && vv.height > 0 ? `${vv.height}px` : '100dvh'
      document.documentElement.style.setProperty('--app-height', height)
    }

    setHeight()
    window.addEventListener('resize', setHeight)
    window.addEventListener('orientationchange', setHeight)
    const vv = window.visualViewport
    vv?.addEventListener('resize', setHeight)
    vv?.addEventListener('scroll', setHeight)

    return () => {
      window.removeEventListener('resize', setHeight)
      window.removeEventListener('orientationchange', setHeight)
      vv?.removeEventListener('resize', setHeight)
      vv?.removeEventListener('scroll', setHeight)
      document.documentElement.style.removeProperty('--app-height')
    }
  }, [])
}
