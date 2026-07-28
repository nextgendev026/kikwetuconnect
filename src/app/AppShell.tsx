'use client'
import Link from 'next/link'
import { useUser, useSupabase } from './providers'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import CreateModal from '@/components/CreateModal'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useUser()
  const supabase = useSupabase()
  const router = useRouter()
  const path = usePathname()

  useEffect(() => {
    if (!loading && !profile) {
      router.push('/login')
    }
  }, [loading, profile, router])

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-night"><div className="animate-spin w-8 h-8 border-2 border-gold border-t-transparent rounded-full" /></div>
  if (!profile) return null

  const initials = (profile.full_name || profile.username || 'U').slice(0, 2).toUpperCase()
  const noLayout = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email'].includes(path) || path.startsWith('/auth')

  if (noLayout) return <>{children}</>

  return (
    <div className="min-h-screen bg-night text-cream">
      <header className="h-[68px] px-[16px] flex items-center justify-between sticky top-0 bg-[oklch(14%_.025_151_/.96)] backdrop-blur-[15px] z-5 border-b border-[oklch(28%_.025_151)]">
        <Link href="/feed" className="flex items-center gap-[10px] no-underline">
          <div className="w-[36px] h-[36px] rounded-[12px] bg-gold grid place-items-center font-extrabold text-night text-[18px] -rotate-[8deg]" style={{ fontFamily: "'Plus Jakarta Sans'" }}>K</div>
          <div><b className="text-cream" style={{ fontFamily: "'Plus Jakarta Sans'", letterSpacing: '-.05em' }}>KikwetuConnect</b><small className="block text-[9px] tracking-[.14em] uppercase text-[oklch(65%_.028_151)]">Tuko pamoja</small></div>
        </Link>
        <div className="flex items-center gap-[3px]">
          <Link href="/explore" className="w-[42px] h-[42px] grid place-items-center rounded-[12px] text-[oklch(65%_.028_151)] hover:bg-[oklch(21%_.03_151)] hover:text-cream text-[19px] no-underline">⌕</Link>
          <Link href="/notifications" className="w-[42px] h-[42px] grid place-items-center rounded-[12px] text-[oklch(65%_.028_151)] hover:bg-[oklch(21%_.03_151)] hover:text-cream text-[19px] no-underline">♡</Link>
          <Link href="/profile" className="w-[36px] h-[36px] rounded-full grid place-items-center bg-earth text-gold font-bold text-[10px] no-underline">{initials}</Link>
        </div>
      </header>
      <div className="max-w-[1120px] mx-auto flex" style={{ minHeight: 'calc(100vh - 68px)' }}>
        <Sidebar />
        <main className="flex-1 min-w-0 pb-[86px] md:pb-0">{children}</main>
        <aside className="hidden lg:block w-[260px] border-l border-[oklch(28%_.025_151)] p-[25px_15px]">
          <div className="bg-gold text-night rounded-[18px] p-[18px] mb-[15px]">
            <small className="text-[10px] opacity-70">Available balance</small>
            <strong className="block text-[29px] tracking-[-.07em] my-[7px_14px]" style={{ fontFamily: "'Plus Jakarta Sans'" }}>KSh 2,500</strong>
            <div className="flex items-center justify-between text-[10px] font-bold">
              <span>+ KSh 840 this month</span>
              <Link href="/wallet" className="bg-night text-gold rounded-[9px] px-[10px] py-[8px] text-[10px] no-underline">Open</Link>
            </div>
          </div>
          <div className="bg-night2 border border-[oklch(29%_.025_151)] rounded-[16px] p-[15px]">
            <strong className="text-[13px] text-cream">Trending near you</strong>
            <p className="text-[11px] text-[oklch(65%_.028_151)] mt-[8px] leading-[1.6]">
              #NairobiTechWeek<br />Farming in Kitale<br />#M-PesaForBusiness
            </p>
          </div>
        </aside>
      </div>
      <MobileNav />
      <CreateModal />
      {/* Live panel positioned on desktop */}
      <div className="hidden lg:block fixed right-[24px] top-[96px] w-[275px] bg-night2 border border-[oklch(29%_.025_151)] rounded-[16px] p-[14px] z-7 shadow-[0_12px_30px_oklch(15%_.03_151_/.13)]">
        <div className="flex justify-between items-center mb-[10px]">
          <b className="text-[12px]" style={{ fontFamily: "'Plus Jakarta Sans'" }}><span className="w-[8px] h-[8px] rounded-full bg-green inline-block mr-[5px]" style={{ boxShadow: '0 0 0 3px oklch(27% .055 151)' }}></span>Live right now</b>
          <span className="text-[10px] text-green">38 online</span>
        </div>
        {[
          { i: 'AK', c: 'g', n: 'Agnes Kiplagat', s: 'Answering in #KilimoSmart' },
          { i: 'JM', c: 'b', n: 'Joseph Mumo', s: 'Available for guidance' },
          { i: 'WN', c: '', n: 'Wanjiku Njeri', s: 'Active in Legal Rights' },
        ].map((u, idx) => (
          <div key={idx} className="flex items-center gap-[9px] py-[9px] border-b border-[oklch(29%_.025_151)] last:border-b-0">
            <div className={`w-[36px] h-[36px] rounded-full grid place-items-center flex-none text-[10px] font-extrabold ${u.c === 'g' ? 'bg-green text-night' : u.c === 'b' ? 'bg-[oklch(35%_.09_230)] text-cream' : 'bg-earth text-gold'}`}>{u.i}</div>
            <div className="flex-1 min-w-0">
              <strong className="text-[11px] block truncate">{u.n}</strong>
              <small className="text-[9px] text-[oklch(65%_.028_151)] block truncate">{u.s}</small>
            </div>
            <button className="bg-none text-gold text-[10px] font-bold flex-none">Chat</button>
          </div>
        ))}
      </div>
    </div>
  )
}
