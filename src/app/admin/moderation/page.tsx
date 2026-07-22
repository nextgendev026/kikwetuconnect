import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Shield, Home, Users, BarChart3, Settings } from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'
import { ModerationCard } from '@/components/ui/moderation-card'

const navItems = [
  { href: '/admin/moderation', label: 'Moderation', icon: Shield },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export default async function AdminModerationPage() {
  const supabase = createServerComponentClient({ cookies })
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_verified_expert')
    .eq('id', user.id)
    .single()

  if (!profile?.is_verified_expert) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto text-faint mb-4" />
          <h1 className="text-xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted">You must be a verified expert to access moderation tools.</p>
        </div>
      </div>
    )
  }

  const { data: reports } = await supabase
    .from('moderation')
    .select(`
      *,
      reporter:profiles!moderation_reporter_id_fkey (id, username, full_name, avatar_url),
      reviewer:profiles!moderation_reviewer_id_fkey (id, username, full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="min-h-screen bg-bg">
      <AdminSidebar />
      <main className="lg:ml-64 min-h-screen">
        <div className="p-6 lg:p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold">Moderation Queue</h1>
              <p className="text-muted">Review and manage reported content</p>
            </div>
            <div className="flex gap-2">
              <select className="input w-auto px-3" defaultValue="pending">
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {reports?.map((report) => (
              <ModerationCard key={report.id} report={report as any} />
            ))}
            
            {!reports || reports.length === 0 && (
              <div className="card text-center py-12">
                <Shield className="w-12 h-12 mx-auto text-faint mb-4" />
                <h3 className="text-lg font-semibold mb-2">No reports in queue</h3>
                <p className="text-muted">All caught up! No pending moderation items.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function AdminSidebar() {
  return (
    <aside className="fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-line-soft transform transition-transform duration-300 lg:translate-x-0">
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-line-soft">
          <Link href="/admin/moderation" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-green" />
            <span className="font-bold text-lg">Admin Panel</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                'text-muted hover:text-text hover:bg-surface'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-line-soft">
          <Link href="/feed" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted hover:text-text hover:bg-surface transition-colors">
            <Home className="w-5 h-5" />
            Back to App
          </Link>
        </div>
      </div>
    </aside>
  )
}