'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Input } from '@/components/ui/form'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { useSupabase } from '@/providers/supabase-provider'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    // Check if we have a valid session (reset link was used)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setSessionReady(true)
      } else {
        setError('Invalid or expired reset link. Please try again.')
      }
    }

    checkSession()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        setError(updateError.message)
      } else {
        router.push('/login?message=password-reset')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          {error ? (
            <>
              <h1 className="text-2xl font-bold mb-4">Invalid link</h1>
              <p className="text-muted mb-6">{error}</p>
              <Link href="/forgot-password" className="btn btn-primary">
                Request new link
              </Link>
            </>
          ) : (
            <div className="animate-spin w-8 h-8 border-2 border-green border-t-transparent rounded-full mx-auto" />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-bg flex items-center justify-center">
              <span className="text-green font-bold">K</span>
            </div>
            <span className="font-bold text-xl">
              Kikwetu<b>Connect</b>
            </span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Create new password</h1>
          <p className="text-muted">Make sure it's secure and easy for you to remember.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-bg/20 border border-red/30 text-red text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              label="New password"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 8 characters"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-quiet hover:text-muted disabled:opacity-50"
              disabled={loading}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="relative">
            <Input
              label="Confirm password"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Repeat your password"
              icon={Lock}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-9 text-quiet hover:text-muted disabled:opacity-50"
              disabled={loading}
            >
              {showConfirm ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            loading={loading}
            disabled={loading}
          >
            Reset password
          </Button>
        </form>

        <p className="text-center text-sm text-quiet mt-6">
          Remember your password?{' '}
          <Link href="/login" className="text-green font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
