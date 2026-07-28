'use client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@/app/providers'
import { useEffect } from 'react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!loading && (!user || profile?.role !== 'admin')) router.push('/feed')
  }, [user, profile, loading, router])

  if (loading) return <div className="min-h-screen bg-night flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-gold border-t-transparent rounded-full" /></div>
  if (!user || profile?.role !== 'admin') return null

  return (
    <div className="min-h-screen bg-night text-cream">
      <header className="h-[68px] px-[16px] flex items-center justify-between border-b border-[oklch(28%_.025_151)] bg-[oklch(14%_.025_151)]">
        <Link href="/admin/dashboard" className="flex items-center gap-[10px]">
          <div className="w-[36px] h-[36px] rounded-[12px] bg-gold grid place-items-center font-extrabold text-night -rotate-[8deg]">K</div>
          <div><b className="text-cream">Admin</b><small className="block text-[9px] tracking-[.14em] uppercase text-gold">Dashboard</small></div>
        </Link>
        <nav className="flex gap-[15px] text-[12px]">
          <Link href="/admin/dashboard" className="text-[oklch(65%_.028_151)] hover:text-cream">Overview</Link>
          <Link href="/admin/moderation" className="text-[oklch(65%_.028_151)] hover:text-cream">Moderation</Link>
          <Link href="/feed" className="text-[oklch(65%_.028_151)] hover:text-cream">← Back to App</Link>
        </nav>
      </header>
      <div className="max-w-[1200px] mx-auto p-[24px]">{children}</div>
    </div>
  )
}
