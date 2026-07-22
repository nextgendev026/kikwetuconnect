'use client'

import React, { useState } from 'react'
import { clsx } from 'clsx'

interface TooltipProps {
  content: string
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

const positionClasses = {
  top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
  bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
  left: 'right-full mr-2 top-1/2 -translate-y-1/2',
  right: 'left-full ml-2 top-1/2 -translate-y-1/2',
}

const arrowClasses = {
  top: 'top-full left-1/2 -translate-x-1/2 border-8 border-t-surface border-r-transparent border-b-transparent border-l-transparent',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-8 border-b-surface border-r-transparent border-t-transparent border-l-transparent',
  left: 'left-full top-1/2 -translate-y-1/2 border-8 border-l-surface border-t-transparent border-b-transparent border-r-transparent',
  right: 'right-full top-1/2 -translate-y-1/2 border-8 border-r-surface border-t-transparent border-b-transparent border-l-transparent',
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 200,
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    const id = setTimeout(() => {
      setIsVisible(true)
    }, delay)
    setTimeoutId(id)
  }

  const handleMouseLeave = () => {
    if (timeoutId) clearTimeout(timeoutId)
    setIsVisible(false)
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {isVisible && (
        <div
          className={clsx(
            'absolute z-50 px-3 py-2 text-xs font-medium',
            'bg-surface border border-line rounded-md whitespace-nowrap',
            'animate-fade-in pointer-events-none',
            positionClasses[position]
          )}
        >
          {content}
          <div className={clsx('absolute', arrowClasses[position])} />
        </div>
      )}
    </div>
  )
}
