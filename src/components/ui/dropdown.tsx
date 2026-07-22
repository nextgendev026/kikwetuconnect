'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { clsx } from 'clsx'

interface DropdownItem {
  id: string
  label: string
  icon?: React.ReactNode
  divider?: boolean
  dangerous?: boolean
}

interface DropdownProps {
  items: DropdownItem[]
  onSelect: (id: string) => void
  trigger: React.ReactNode
  align?: 'left' | 'right'
  className?: string
}

export const Dropdown: React.FC<DropdownProps> = ({
  items,
  onSelect,
  trigger,
  align = 'right',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (id: string) => {
    onSelect(id)
    setIsOpen(false)
  }

  return (
    <div className={clsx('relative inline-block', className)} ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="transition-all hover:opacity-80"
      >
        {trigger}
      </button>

      {/* Menu */}
      {isOpen && (
        <div
          className={clsx(
            'absolute top-full mt-2 w-48 bg-surface border border-line rounded-lg shadow-lg',
            'animate-slide-up z-50',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          <div className="py-1">
            {items.map((item, idx) => (
              <React.Fragment key={item.id}>
                {item.divider && (
                  <div className="my-1 border-t border-line-soft" />
                )}
                <button
                  onClick={() => handleSelect(item.id)}
                  className={clsx(
                    'w-full px-4 py-2 text-sm font-medium flex items-center gap-2',
                    'transition-colors text-left',
                    item.dangerous
                      ? 'hover:bg-red/10 text-red'
                      : 'hover:bg-surface-2 text-text'
                  )}
                >
                  {item.icon}
                  {item.label}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface SelectProps {
  options: Array<{ value: string; label: string }>
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find((o) => o.value === value)

  return (
    <div className={clsx('relative', className)} ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'w-full px-4 py-2 bg-surface border border-line rounded-lg',
          'flex items-center justify-between text-left transition-all',
          'hover:border-green focus:border-green focus:ring-2 focus:ring-green/10'
        )}
      >
        <span className={selectedOption ? 'text-text' : 'text-quiet'}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          className={clsx(
            'w-4 h-4 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div
          className={clsx(
            'absolute top-full mt-2 w-full bg-surface border border-line',
            'rounded-lg shadow-lg animate-slide-up z-50'
          )}
        >
          <div className="py-1 max-h-60 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={clsx(
                  'w-full px-4 py-2 text-sm font-medium text-left transition-colors',
                  value === option.value
                    ? 'bg-green text-bg'
                    : 'hover:bg-surface-2 text-text'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
