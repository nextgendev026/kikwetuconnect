'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export interface ToolbarAction {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  badge?: number
  active?: boolean
  variant?: 'default' | 'primary' | 'gold' | 'danger'
}

export interface ToolbarConfig {
  actions?: ToolbarAction[]
  backUrl?: string
  onBack?: () => void
  variant?: 'default' | 'minimal'
}

const ToolbarCtx = createContext<{
  config: ToolbarConfig
  setConfig: (config: ToolbarConfig | null) => void
}>({ config: {}, setConfig: () => {} })

export function ToolbarProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<ToolbarConfig>({})
  const setConfig = useCallback((c: ToolbarConfig | null) => setConfigState(c || {}), [])
  return (
    <ToolbarCtx.Provider value={{ config, setConfig }}>
      {children}
    </ToolbarCtx.Provider>
  )
}

export function useToolbar() {
  return useContext(ToolbarCtx)
}
