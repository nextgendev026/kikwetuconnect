'use client'
import { useEffect, useState } from 'react'

export default function PwaSetup() {
  const [installable, setInstallable] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setInstallable(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
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

  if (!installable) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-rise" style={{ maxWidth: 360, margin: '0 auto' }}>
      <div className="rounded-[16px] p-4 shadow-xl" style={{ background: 'var(--night)', color: 'var(--surface)', border: '1px solid var(--line)' }}>
        <p className="text-[12px] font-semibold mb-2">Install KikwetuConnect</p>
        <p className="text-[10px] mb-3" style={{ opacity: 0.7 }}>Add to your home screen for the best experience</p>
        <div className="flex gap-2">
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
  )
}
