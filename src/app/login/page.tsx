'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Input } from '@/components/ui/form'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { useSupabase } from '@/providers/supabase-provider'

export default function LoginPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
      } else {
        router.push('/feed')
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
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-bg flex items-center justify-center">
              <span className="text-green font-bold">K</span>
            </div>
            <span className="font-bold text-xl">
              Kikwetu<b>Connect</b>
            </span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
          <p className="text-muted">Your Baraza is waiting.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-bg/20 border border-red/30 text-red text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email address"
            type="email"
            placeholder="you@example.com"
            icon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Your password"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
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

          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-sm text-green hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" variant="primary" className="w-full" loading={loading} disabled={loading}>
            Sign in
          </Button>
        </form>

        <div className="my-6 flex items-center">
          <div className="flex-1 h-px bg-line"></div>
          <span className="px-4 text-xs text-quiet">or continue with</span>
          <div className="flex-1 h-px bg-line"></div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <Button variant="secondary" className="w-full" disabled={loading}>
            Google
          </Button>
          <Button variant="secondary" className="w-full" disabled={loading}>
            Apple
          </Button>
        </div>

        <p className="text-center text-sm text-quiet">
          New to KikwetuConnect?{' '}
          <Link href="/signup" className="text-green font-semibold hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}