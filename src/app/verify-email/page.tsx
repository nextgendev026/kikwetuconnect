'use client'

import Link from 'next/link'
import { Mail, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/form'

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-green-bg/50 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold mb-3">Check your email</h1>
          <p className="text-muted">We sent a verification link to your email address. Click it to confirm your account and get started.</p>
        </div>

        <div className="bg-surface rounded-2xl p-6 mb-6 border border-line">
          <Mail className="w-6 h-6 mx-auto mb-3 text-green" />
          <p className="text-sm font-medium mb-1">Didn't receive it?</p>
          <p className="text-xs text-quiet mb-4">Check your spam folder or request a new link.</p>
          <Button variant="secondary" className="w-full">
            Resend verification email
          </Button>
        </div>

        <Link href="/login" className="text-green hover:underline font-medium">
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
