'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Input } from '@/components/ui/form'
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react'
import { useSupabase } from '@/providers/supabase-provider'

export default function SignupPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agree, setAgree] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    if (!fullName.trim()) newErrors.name = 'Enter your name to continue.'
    if (!email || !email.includes('@')) newErrors.email = 'Use a valid email address.'
    if (password.length < 8) newErrors.pass = 'Use at least 8 characters.'
    if (!agree) newErrors.terms = 'Accept the Community Guidelines to continue.'
    
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        },
      })

      if (error) {
        setErrors({ submit: error.message })
      } else {
        setMessage('Check your email to confirm your account!')
        setTimeout(() => {
          router.push('/verify-email')
        }, 2000)
      }
    } catch (error: any) {
      setErrors({ submit: error.message || 'An error occurred' })
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
          <h1 className="text-2xl font-bold mb-2">Join the Baraza</h1>
          <p className="text-muted">Start with the basics. You can edit these later.</p>
        </div>

        {message && (
          <div className="mb-4 p-3 rounded-xl bg-green-bg/20 border border-green/30 text-green text-sm">
            {message}
          </div>
        )}

        {errors.submit && (
          <div className="mb-4 p-3 rounded-xl bg-red-bg/20 border border-red/30 text-red text-sm">
            {errors.submit}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full name"
            placeholder="e.g. Mtemi Naibei"
            icon={User}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={errors.name}
            disabled={loading}
          />

          <Input
            label="Email address"
            type="email"
            placeholder="you@example.com"
            icon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            disabled={loading}
          />

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 8 characters"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.pass}
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

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              disabled={loading}
              className="mt-0.5 w-4 h-4 rounded bg-input border-line text-green focus:ring-green disabled:opacity-50"
            />
            <span className="text-quiet">
              I agree to the{' '}
              <Link href="/terms" className="text-green hover:underline">Terms</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-green hover:underline">Privacy Policy</Link>.
            </span>
          </label>
          {errors.terms && <p className="text-xs text-red">{errors.terms}</p>}

          <Button type="submit" variant="primary" className="w-full" loading={loading} disabled={loading}>
            Continue
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
          Already have an account?{' '}
          <Link href="/login" className="text-green font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}