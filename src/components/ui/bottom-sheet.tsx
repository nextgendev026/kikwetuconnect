'use client'

import { useEffect, useRef, useCallback } from 'react'
import { X } from 'lucide-react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export default function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key !== 'Tab' || !sheetRef.current) return
    const focusable = sheetRef.current.querySelectorAll<HTMLElement>('button, textarea, select, input, [tabindex]:not([tabindex="-1"])')
    if (!focusable.length) return
    const first = focusable[0], last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }, [onClose])

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        display: 'flex', alignItems: 'flex-end',
        background: 'color-mix(in oklab, var(--night) 70%, transparent)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Bottom sheet'}
    >
      <div
        ref={sheetRef}
        className="animate-slide-up"
        style={{
          width: '100%',
          maxHeight: '90vh',
          background: 'var(--surface)',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 20px 0',
          position: 'sticky', top: 0, zIndex: 1,
          background: 'var(--surface)',
        }}>
          <div style={{ width: 32 }} />
          <div style={{
            width: 40, height: 4, borderRadius: 2,
            background: 'var(--line)', margin: '0 auto',
          }} />
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--raised)', color: 'var(--muted)',
              border: 0, cursor: 'pointer',
              display: 'grid', placeItems: 'center', flexShrink: 0,
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {title && (
          <h2 style={{
            font: '800 18px var(--jakarta)', letterSpacing: '-.04em',
            color: 'var(--ink)', padding: '16px 20px 0', margin: 0,
          }}>
            {title}
          </h2>
        )}

        <div style={{ padding: 20 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
