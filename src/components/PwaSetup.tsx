'use client'
import { useEffect, useState } from 'react'
import { useGeolocation } from '@/hooks/useGeolocation'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { Bell, MapPin, Download, X, Check, RefreshCw } from 'lucide-react'

export default function PwaSetup() {
  const [installable, setInstallable] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [installed, setInstalled] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false)
  const [dismissedPerms, setDismissedPerms] = useState(false)
  const { permitted: locationPermitted, loading: locationLoading, requestPosition } = useGeolocation()
  const { permitted: notifPermitted, subscribed, loading: notifLoading, subscribe, unsubscribe } = usePushNotifications()

  // Service worker registration
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        setSwRegistration(reg)
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true)
              }
            })
          }
        })
      }).catch(() => {})

      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data?.type === 'NAVIGATE' && event.data.url) {
          window.location.href = event.data.url
        }
      })
    }
  }, [])

  const handleUpdate = () => {
    if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  }

  // Install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setInstallable(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => {
      setInstalled(true)
      setInstallable(false)
      setDeferredPrompt(null)
    })
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setInstallable(false)
      setDeferredPrompt(null)
    }
  }

  // Show permission prompt after delay
  useEffect(() => {
    const dismissed = localStorage.getItem('kikwetu-perms-dismissed')
    if (dismissed) { setDismissedPerms(true); return }
    const timer = setTimeout(() => {
      const needsPerms = notifPermitted !== 'granted' || locationPermitted !== true
      if (needsPerms) setShowPermissionPrompt(true)
    }, 5000)
    return () => clearTimeout(timer)
  }, [notifPermitted, locationPermitted])

  const handleEnableAll = async () => {
    if (notifPermitted !== 'granted') await subscribe()
    if (locationPermitted !== true) await requestPosition()
    setShowPermissionPrompt(false)
    localStorage.setItem('kikwetu-perms-dismissed', 'true')
  }

  const handleDismissPerms = () => {
    setShowPermissionPrompt(false)
    setDismissedPerms(true)
    localStorage.setItem('kikwetu-perms-dismissed', 'true')
  }

  // Track install status
  const [isInstalled, setIsInstalled] = useState(installed)
  useEffect(() => { if (!installed && typeof window !== 'undefined') { setIsInstalled(window.matchMedia?.('(display-mode: standalone)').matches) } }, [installed])

  return (
    <>
      {/* Update available banner */}
      {updateAvailable && (
        <div className="fixed top-4 left-4 right-4 z-50 animate-rise" style={{ maxWidth: 400, margin: '0 auto' }}>
          <div className="rounded-[16px] p-3 shadow-xl" style={{ background: 'var(--night)', color: 'var(--surface)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <RefreshCw className="w-4 h-4" style={{ color: 'var(--gold)', flexShrink: 0 }} />
            <span className="text-[11px] flex-1">Update available</span>
            <button onClick={handleUpdate}
              className="py-1.5 px-3 rounded-[10px] text-[10px] font-bold border-0 cursor-pointer"
              style={{ background: 'var(--gold)', color: 'var(--night)', whiteSpace: 'nowrap' }}>
              Refresh
            </button>
            <button onClick={() => setUpdateAvailable(false)}
              className="p-1 rounded-full border-0 cursor-pointer"
              style={{ background: 'none', color: 'var(--muted)' }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Install banner */}
      {installable && !isInstalled && (
        <div className="fixed bottom-[88px] left-4 right-4 z-50 animate-rise" style={{ maxWidth: 360, margin: '0 auto' }}>
          <div className="rounded-[16px] p-4 shadow-xl" style={{ background: 'var(--night)', color: 'var(--surface)', border: '1px solid var(--line)' }}>
            <div className="flex items-center gap-3 mb-2">
              <Download className="w-5 h-5" style={{ color: 'var(--gold)' }} />
              <div>
                <p className="text-[12px] font-semibold">Install KikwetuConnect</p>
                <p className="text-[10px]" style={{ opacity: 0.7 }}>Add to home screen for best experience</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleInstall}
                className="flex-1 py-2 px-3 rounded-[10px] text-[11px] font-bold border-0 cursor-pointer"
                style={{ background: 'var(--gold)', color: 'var(--night)' }}>
                Install
              </button>
              <button onClick={() => setInstallable(false)}
                className="py-2 px-3 rounded-[10px] text-[11px] font-medium border-0 cursor-pointer"
                style={{ background: 'var(--raised)', color: 'var(--muted)' }}>
                Not now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permission prompt */}
      {showPermissionPrompt && !dismissedPerms && (
        <div className="fixed bottom-[88px] left-4 right-4 z-50 animate-rise" style={{ maxWidth: 360, margin: '0 auto' }}>
          <div className="rounded-[16px] p-4 shadow-xl" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-bold" style={{ color: 'var(--ink)' }}>Enable features</p>
              <button onClick={handleDismissPerms} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--muted)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col gap-2 mb-3">
              <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--muted)' }}>
                <Bell className="w-3.5 h-3.5" style={{ color: notifPermitted === 'granted' ? 'var(--green)' : 'var(--muted)' }} />
                <span>Notifications & alerts</span>
                {notifPermitted === 'granted' && <Check className="w-3 h-3" style={{ color: 'var(--green)' }} />}
              </div>
              <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--muted)' }}>
                <MapPin className="w-3.5 h-3.5" style={{ color: locationPermitted ? 'var(--green)' : 'var(--muted)' }} />
                <span>Location for nearby content</span>
                {locationPermitted && <Check className="w-3 h-3" style={{ color: 'var(--green)' }} />}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleEnableAll}
                disabled={notifLoading || locationLoading}
                className="flex-1 py-2 px-3 rounded-[10px] text-[11px] font-bold border-0 cursor-pointer"
                style={{ background: 'var(--gold)', color: 'var(--night)', opacity: (notifLoading || locationLoading) ? 0.6 : 1 }}>
                {(notifLoading || locationLoading) ? 'Requesting...' : 'Enable All'}
              </button>
              <button onClick={handleDismissPerms}
                className="py-2 px-3 rounded-[10px] text-[11px] font-medium border-0 cursor-pointer"
                style={{ background: 'var(--raised)', color: 'var(--muted)' }}>
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
