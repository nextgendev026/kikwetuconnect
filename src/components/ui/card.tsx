import React from 'react'
import { clsx } from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  hoverable?: boolean
  animated?: boolean
  gradient?: boolean
  onClick?: () => void
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  hoverable = true,
  animated = true,
  gradient = false,
  onClick,
}) => {
  return (
    <div
      className={clsx(
        'card section',
        hoverable && 'cursor-pointer hover:shadow-lg',
        animated && 'animate-fade-in transition-all',
        gradient && 'bg-gradient-to-br from-surface to-surface-2',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  )
}

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={clsx('border-b border-line-soft pb-4 mb-4', className)}>
    {children}
  </div>
)

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={clsx('border-t border-line-soft pt-4 mt-4', className)}>
    {children}
  </div>
)

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => <h3 className={clsx('text-lg font-bold', className)}>{children}</h3>

export const CardDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => <p className={clsx('text-sm text-muted', className)}>{children}</p>
