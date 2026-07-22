'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { clsx } from 'clsx'

interface Toast {
  id: string
  message: string
  type?: 'success' | 'error' | 'info' | 'warning'
}

const ToastContext = createContext<{
  toast: (message: string, type?: Toast['type']) => void
} | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2, 11)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              'toast',
              t.type === 'error' && 'bg-red text-bg',
              t.type === 'success' && 'bg-green text-[oklch(10%_0.01_155)]',
              t.type === 'warning' && 'bg-gold text-[oklch(10%_0.01_155)]',
              t.type === 'info' && 'bg-text text-bg',
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}