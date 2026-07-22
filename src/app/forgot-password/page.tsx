'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button, Input } from '@/components/ui/form'
import { Mail, ArrowLeft } from 'lucide-react'
import { useSupabase } from '@/providers/supabase-provider'

export default function ForgotPasswordPage() {
  const supabase = useSupabase()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
      })

      if (resetError) {
        setError(resetError.message)
      } else {
        setSent(true)
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-text mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-bg flex items-center justify-center">
              <span className="text-green font-bold">K</span>
            </div>
            <span className="font-bold text-xl">
              Kikwetu<b>Connect</b>
            </span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Reset your password</h1>
          <p className="text-muted">Enter your email and we'll send you a link to create a new one.</p>
        </div>

        {sent ? (
          <div className="bg-green-bg/20 border border-green/30 rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-green-bg flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-green" />
            </div>
            <h2 className="font-bold text-lg mb-2">Check your email</h2>
            <p className="text-sm text-muted mb-6">We sent a password reset link to {email}. Click it to create a new password.</p>
            <Button
              variant="primary"
              className="w-full"
              onClick={() => setSent(false)}
            >
              Send another email
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-bg/20 border border-red/30 text-red text-sm">
                {error}
              </div>
            )}

            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={loading}
              disabled={loading}
            >
              Send reset link
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
