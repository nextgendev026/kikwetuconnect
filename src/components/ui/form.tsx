import { LucideIcon } from 'lucide-react'
import { clsx } from 'clsx'

type ButtonVariant = 'primary' | 'secondary' | 'gold' | 'danger' | 'ghost' | 'icon'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: LucideIcon
  loading?: boolean
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = 'btn'
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    gold: 'btn-gold',
    danger: 'btn-danger',
    ghost: 'btn-ghost',
    icon: 'btn-icon',
  }
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return (
    <button
      className={clsx(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        {
          'opacity-50 cursor-not-allowed': disabled || loading,
          'pointer-events-none': loading,
        },
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : Icon ? (
        <Icon className="w-4 h-4" />
      ) : null}
      {children}
    </button>
  )
}

export function Input({
  className,
  label,
  error,
  helper,
  icon: Icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
  helper?: string
  icon?: LucideIcon
}) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-xs font-semibold mb-1.5 text-muted">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-quiet" />
        )}
        <input
          className={clsx(
            'input',
            Icon && 'pl-11',
            error && 'border-red focus:border-red focus:ring-red/20',
            className
          )}
          {...props}
        />
      </div>
      {helper && !error && (
        <p className="mt-1.5 text-xs text-quiet">{helper}</p>
      )}
      {error && (
        <p className="mt-1.5 text-xs text-red">{error}</p>
      )}
    </div>
  )
}

export function Textarea({
  className,
  label,
  error,
  helper,
  rows = 4,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  error?: string
  helper?: string
}) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-xs font-semibold mb-1.5 text-muted">
          {label}
        </label>
      )}
      <textarea
        rows={rows}
        className={clsx(
          'input textarea-input resize-y min-h-[100px]',
          error && 'border-red focus:border-red focus:ring-red/20',
          className
        )}
        {...props}
      />
      {helper && !error && (
        <p className="mt-1.5 text-xs text-quiet">{helper}</p>
      )}
      {error && (
        <p className="mt-1.5 text-xs text-red">{error}</p>
      )}
    </div>
  )
}
