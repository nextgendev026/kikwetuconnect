'use client'
import { createContext, useContext, type ReactNode } from 'react'

interface ToastContextValue {
  toast: (msg: string, type?: 'info' | 'success' | 'error') => void
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
})

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast" id="global-toast"></div>
    </ToastContext.Provider>
  )
}

export function toast(msg: string, type?: 'info' | 'success' | 'error') {
  if (typeof window !== 'undefined') {
    const el = document.getElementById('global-toast')
    if (el) {
      el.textContent = msg
      el.className = 'toast'
      if (type && type !== 'info') el.classList.add(type)
      el.classList.add('show')
      setTimeout(() => el.classList.remove('show'), 2400)
    }
  }
}

export const useToast = () => useContext(ToastContext)
