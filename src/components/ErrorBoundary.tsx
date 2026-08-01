'use client'
import { Component, type ReactNode } from 'react'
import { reportError } from '@/lib/activity'
import { createBrowserClient } from '@/lib/supabase'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

// Reports any uncaught render error to the admin activity engine (error_reports)
// while keeping a graceful fallback instead of a blank screen.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    try {
      void reportError(createBrowserClient(), 'error-boundary', error, {
        metadata: { componentStack: info.componentStack || null },
      })
    } catch {
      // ignore
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
          <div className="text-center max-w-[380px]">
            <div className="mx-auto mb-4 w-[52px] h-[52px] rounded-[16px] grid place-items-center text-2xl font-extrabold" style={{ background: 'var(--gold)', color: 'var(--night)', transform: 'rotate(-8deg)' }}>K</div>
            <h1 className="text-[17px] font-extrabold mb-2" style={{ fontFamily: 'var(--jakarta)', color: 'var(--ink)', letterSpacing: '-.02em' }}>Something went wrong</h1>
            <p className="text-[12px] mb-5" style={{ color: 'var(--muted)' }}>This has been reported. Try refreshing the page.</p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.reload() }}
              className="px-5 py-2.5 rounded-full text-[12px] font-bold border-0 cursor-pointer transition-opacity hover:opacity-90"
              style={{ background: 'var(--gold)', color: 'var(--night)' }}
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
