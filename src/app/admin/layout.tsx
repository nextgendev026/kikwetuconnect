import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Shield, Home, Users, BarChart3, Settings } from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'

const navItems = [
  { href: '/admin/moderation', label: 'Moderation', icon: Shield },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-bg">
      <AdminSidebar />
      <main className="lg:ml-64 min-h-screen">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}

async function AdminSidebar() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = user ? await supabase
    .from('profiles')
    .select('is_verified_expert, username')
    .eq('id', user.id)
    .single() : { data: null }

  if (!profile?.is_verified_expert) {
    return null
  }

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