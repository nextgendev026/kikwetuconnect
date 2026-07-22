'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, MessageSquare, Shield, TrendingUp, Activity, Settings } from 'lucide-react'
import { Card, CardTitle, CardDescription } from '@/components/ui/card'
import { useUser, useSupabase } from '@/providers/supabase-provider'

interface DashboardStats {
  totalUsers: number
  totalPosts: number
  totalReports: number
  activeUsers: number
}

export default function AdminDashboard() {
  const { profile } = useUser()
  const supabase = useSupabase()
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalPosts: 0,
    totalReports: 0,
    activeUsers: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Fetch user count
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })

      // Fetch post count
      const { count: postCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact' })

      // Fetch report count
      const { count: reportCount } = await supabase
        .from('moderation')
        .select('*', { count: 'exact' })
        .eq('status', 'pending')

      setStats({
        totalUsers: userCount || 0,
        totalPosts: postCount || 0,
        totalReports: reportCount || 0,
        activeUsers: Math.round((userCount || 0) * 0.65), // Estimated
      })
    } catch (err) {
      console.error('Error fetching stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-green border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!profile?.is_verified_expert) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto text-faint mb-4" />
          <h1 className="text-xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted">You must be a verified expert to access the admin dashboard.</p>
        </div>
      </div>
    )
  }

  const statItems = [
    {
      icon: Users,
      label: 'Total Users',
      value: stats.totalUsers,
      color: 'green',
    },
    {
      icon: MessageSquare,
      label: 'Total Posts',
      value: stats.totalPosts,
      color: 'gold',
    },
    {
      icon: Shield,
      label: 'Pending Reports',
      value: stats.totalReports,
      color: 'red',
      href: '/admin/moderation',
    },
    {
      icon: Activity,
      label: 'Active Users',
      value: stats.activeUsers,
      color: 'blue',
    },
  ]

  return (
    <>
      <section className="page-head">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="text-muted text-sm">Overview and management tools</p>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statItems.map((item, idx) => (
          <Link key={idx} href={item.href || '#'} className="block">
            <Card className="animate-slide-up cursor-pointer hover:bg-surface-2 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <CardDescription>{item.label}</CardDescription>
                  <p className="text-3xl font-bold mt-2">{item.value.toLocaleString()}</p>
                </div>
                <div className={`p-3 rounded-lg bg-${item.color}-bg`}>
                  <item.icon className="w-6 h-6 text-{item.color}" />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <section className="mb-8">
        <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/admin/moderation" className="block">
            <Card className="animate-slide-up hover:bg-surface-2 transition-all">
              <div className="flex items-start gap-4">
                <Shield className="w-8 h-8 text-green flex-shrink-0" />
                <div>
                  <CardTitle className="text-base">Moderation Queue</CardTitle>
                  <CardDescription className="mt-1">Review pending reports</CardDescription>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/admin/users" className="block">
            <Card className="animate-slide-up hover:bg-surface-2 transition-all">
              <div className="flex items-start gap-4">
                <Users className="w-8 h-8 text-blue flex-shrink-0" />
                <div>
                  <CardTitle className="text-base">User Management</CardTitle>
                  <CardDescription className="mt-1">Manage user accounts and permissions</CardDescription>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/admin/analytics" className="block">
            <Card className="animate-slide-up hover:bg-surface-2 transition-all">
              <div className="flex items-start gap-4">
                <TrendingUp className="w-8 h-8 text-gold flex-shrink-0" />
                <div>
                  <CardTitle className="text-base">Analytics</CardTitle>
                  <CardDescription className="mt-1">View platform statistics</CardDescription>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/admin/content" className="block">
            <Card className="animate-slide-up hover:bg-surface-2 transition-all">
              <div className="flex items-start gap-4">
                <MessageSquare className="w-8 h-8 text-gold flex-shrink-0" />
                <div>
                  <CardTitle className="text-base">Content Management</CardTitle>
                  <CardDescription className="mt-1">Review and manage content</CardDescription>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/admin/settings" className="block">
            <Card className="animate-slide-up hover:bg-surface-2 transition-all">
              <div className="flex items-start gap-4">
                <Settings className="w-8 h-8 text-green flex-shrink-0" />
                <div>
                  <CardTitle className="text-base">Settings</CardTitle>
                  <CardDescription className="mt-1">Configure platform settings</CardDescription>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/admin/reports" className="block">
            <Card className="animate-slide-up hover:bg-surface-2 transition-all">
              <div className="flex items-start gap-4">
                <Activity className="w-8 h-8 text-red flex-shrink-0" />
                <div>
                  <CardTitle className="text-base">Reports</CardTitle>
                  <CardDescription className="mt-1">View detailed reports and logs</CardDescription>
                </div>
              </div>
            </Card>
          </Link>
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <h2 className="text-lg font-bold mb-4">Recent Activity</h2>
        <Card className="animate-slide-up">
          <div className="space-y-4">
            <p className="text-muted text-sm">Real-time activity feed coming soon...</p>
          </div>
        </Card>
      </section>
    </>
  )
}
