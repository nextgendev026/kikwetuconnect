'use client'
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'

interface ThemeContextValue {
  theme: string
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggleTheme: () => {},
})

const LIGHT_COLOR = '#438854'
const DARK_COLOR = '#1a3a24'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState('light')

  const apply = useCallback((next: string) => {
    const dark = next === 'dark'
    document.documentElement.setAttribute('data-theme', next)
    document.body.setAttribute('data-theme', next)
    localStorage.setItem('kikwetu-theme', next)
    const iconLight = document.querySelector<HTMLLinkElement>('link[rel="icon"][href="/favicon.svg"]')
    const iconDark = document.querySelector<HTMLLinkElement>('link[rel="icon"][href="/favicon-dark.svg"]')
    if (iconLight) iconLight.media = dark ? '(prefers-color-scheme: dark)' : 'screen'
    if (iconDark) iconDark.media = dark ? 'screen' : '(prefers-color-scheme: dark)'
    document
      .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
      .forEach((m) => m.setAttribute('content', dark ? DARK_COLOR : LIGHT_COLOR))
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('kikwetu-theme') || 'light'
    setTheme(saved)
    apply(saved)
  }, [apply])

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    apply(next)
  }, [apply, theme])

  // Keep meta/favicon in sync when the tab regains focus (cross-tab changes).
  useEffect(() => {
    const onFocus = () => apply(document.body.getAttribute('data-theme') || 'light')
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [apply])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
