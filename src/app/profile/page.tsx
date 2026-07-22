'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/form'
import { Edit3, Settings, Shield, Award, BarChart3, Users, MessageCircle, LogOut } from 'lucide-react'
import { useUser, useSupabase } from '@/providers/supabase-provider'
import Link from 'next/link'

const menuItems = [
  { icon: <Edit3 className="w-5 h-5" />, label: 'Edit Profile', href: '/profile/edit' },
  { icon: <Shield className="w-5 h-5" />, label: 'Expert Verification', href: '#' },
  { icon: <BarChart3 className="w-5 h-5" />, label: 'Analytics', href: '#' },
  { icon: <Award className="w-5 h-5" />, label: 'Badges & Achievements', href: '#' },
  { icon: <Users className="w-5 h-5" />, label: 'Followers', href: '#' },
  { icon: <MessageCircle className="w-5 h-5" />, label: 'Message Requests', href: '#' },
  { icon: <Settings className="w-5 h-5" />, label: 'Settings', href: '/profile/settings' },
]

export default function ProfilePage() {
  const { user, profile, loading } = useUser()
  const supabase = useSupabase()
  const router = useRouter()
  const [stats, setStats] = useState({
    answers: 0,
    questions: 0,
    upvotes: 0,
    tokens: 0,
  })

  useEffect(() => {
    if (!profile) return

    // Fetch user stats
    const fetchStats = async () => {
      const { data: answers } = await supabase
        .from('answers')
        .select('id')
        .eq('user_id', profile.id)

      const { data: questions } = await supabase
        .from('posts')
        .select('id')
        .eq('user_id', profile.id)
        .eq('post_type', 'inquiry')

      const { data: tokens } = await supabase
        .from('tokens')
        .select('amount')
        .eq('user_id', profile.id)

      setStats({
        answers: answers?.length || 0,
        questions: questions?.length || 0,
        upvotes: profile.heshima_rating || 0,
        tokens: tokens?.reduce((sum, t) => sum + t.amount, 0) || 0,
      })
    }

    fetchStats()
  }, [profile, supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-green border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-muted mb-4">Profile not found</p>
        <Link href="/login" className="btn btn-primary">
          Sign in
        </Link>
      </div>
    )
  }

  const initials = profile.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'KK'

  return (
    <>
      <section className="page-head">
        <h1 className="page-title">Profile</h1>
        <p className="text-muted text-sm">Your Kikwetu identity</p>
      </section>

      {/* Profile Header */}
      <section className="card section mb-6">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green to-gold flex items-center justify-center text-2xl font-bold text-bg">
            {initials}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{profile.full_name}</h2>
            <p className="text-sm text-quiet">@{profile.username}</p>
            {profile.county_hub && (
              <p className="text-xs text-muted mt-1">📍 {profile.county_hub}</p>
            )}
            {profile.is_verified_expert && (
              <div className="flex items-center gap-1 mt-2">
                <Shield className="w-4 h-4 text-green" />
                <span className="text-xs font-medium text-green">Verified Expert</span>
              </div>
            )}
          </div>
          <Link href="/profile/edit" className="btn btn-secondary btn-sm">
            <Edit3 className="w-4 h-4" />
            Edit
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-line">
          <div className="text-center">
            <div className="text-lg font-bold text-green">{stats.answers}</div>
            <div className="text-xs text-muted">Answers</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gold">{stats.tokens}</div>
            <div className="text-xs text-muted">Tokens</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue">{stats.questions}</div>
            <div className="text-xs text-muted">Questions</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green">{profile.heshima_rating}</div>
            <div className="text-xs text-muted">Heshima</div>
          </div>
        </div>
      </section>

      {/* Heshima Rating */}
      <section className="card section mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="card-title">Heshima Rating</h3>
          <div className="text-right">
            <div className="text-2xl font-bold text-green">{profile.heshima_rating}</div>
            <div className="text-xs text-faint">
              Top {Math.max(1, 100 - Math.floor(profile.heshima_rating / 10))}% contributor
            </div>
          </div>
        </div>
        
        {/* Heshima Meter */}
        <div className="w-full bg-surface rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green to-gold transition-all duration-300"
            style={{ width: `${Math.min((profile.heshima_rating / 1000) * 100, 100)}%` }}
          />
        </div>
        <p className="text-xs text-muted mt-2">
          Heshima is earned through helpful answers, community votes, and moderation participation.
        </p>
      </section>

      {/* Account Menu */}
      <section className="card section mb-6">
        <h3 className="card-title mb-4">Account</h3>
        <div className="space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg hover:bg-surface transition-colors"
            >
              <span className="text-muted">{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Sign Out */}
      <section className="card section">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg hover:bg-surface transition-colors text-red"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Sign out</span>
        </button>
      </section>
    </>
  )
}