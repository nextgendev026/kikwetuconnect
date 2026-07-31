'use client'
import { useState, useRef, useEffect } from 'react'
import { Share2, Link2, Check, X } from 'lucide-react'
import { toast } from '@/app/providers'

export default function ShareMenu({ url, title, compact = false }: { url: string; title?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const shareUrl = typeof window !== 'undefined' ? new URL(url, window.location.origin).toString() : url
  const text = title ? `${title} — shared on KikwetuConnect` : 'Shared on KikwetuConnect'
  const encodedUrl = encodeURIComponent(shareUrl)
  const encodedText = encodeURIComponent(text)

  const targets = [
    {
      label: 'WhatsApp', icon: '💬', href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`, bg: 'oklch(52% .14 145)',
    },
    {
      label: 'X (Twitter)', icon: '𝕏', href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, bg: 'oklch(20% .02 240)',
    },
    {
      label: 'Facebook', icon: 'f', href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, bg: 'oklch(48% .16 255)',
    },
    {
      label: 'Telegram', icon: '✈️', href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, bg: 'oklch(55% .14 210)',
    },
  ]

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast('Link copied')
      setTimeout(() => setCopied(false), 1600)
    } catch {
      toast('Could not copy link')
    }
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="Share post"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: compact ? 4 : 6,
          background: open ? 'color-mix(in oklab, var(--gold) 12%, transparent)' : 'transparent',
          border: 0, color: open ? 'var(--gold)' : 'var(--muted)', cursor: 'pointer',
          fontSize: 11, fontWeight: 700, padding: '6px 8px', borderRadius: 9,
          transition: 'all .18s ease',
        }}>
        <Share2 className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        {!compact && 'Share'}
      </button>

      {open && (
        <div style={{
          position: 'absolute', zIndex: 60, bottom: '100%', right: 0, marginBottom: 8, minWidth: 220,
          background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14,
          boxShadow: '0 18px 50px color-mix(in oklab, var(--night) 25%, transparent)',
          padding: 8, animation: 'shareMenuIn .18s ease',
        }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', padding: '4px 10px 8px' }}>
            Share to
          </div>
          {targets.map(t => (
            <a key={t.label} href={t.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10,
                color: 'var(--ink)', fontSize: 12, fontWeight: 600, textDecoration: 'none',
                transition: 'background .15s ease',
              }}>
              <span style={{
                width: 26, height: 26, borderRadius: 8, display: 'grid', placeItems: 'center',
                background: t.bg, color: 'oklch(99% .005 91)', fontSize: 13, fontWeight: 800, flexShrink: 0,
              }}>{t.icon}</span>
              {t.label}
            </a>
          ))}
          <div style={{ height: 1, background: 'var(--line)', margin: '6px 8px' }} />
          <button type="button" onClick={copyLink}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10,
              background: 'none', border: 0, color: copied ? 'var(--green)' : 'var(--ink)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%', textAlign: 'left',
            }}>
            <span style={{
              width: 26, height: 26, borderRadius: 8, display: 'grid', placeItems: 'center',
              background: 'var(--raised)', color: 'var(--muted)', flexShrink: 0,
            }}>{copied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}</span>
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      )}

      <style>{`
        @keyframes shareMenuIn { from { opacity: 0; transform: translateY(5px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  )
}
