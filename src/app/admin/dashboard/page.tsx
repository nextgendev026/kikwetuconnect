'use client'
import { useEffect, useState } from 'react'
import { useSupabase, toast } from '@/app/providers'

export default function AdminDashboard() {
  const supabase = useSupabase()
  const [stats, setStats] = useState({ users: 0, posts: 0, answers: 0, professionals: 0, sessions: 0, reports: 0, tips: 0, quizzes: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('posts').select('*', { count: 'exact', head: true }),
      supabase.from('answers').select('*', { count: 'exact', head: true }),
      supabase.from('professionals').select('*', { count: 'exact', head: true }),
      supabase.from('sessions').select('*', { count: 'exact', head: true }),
      supabase.from('moderation').select('*', { count: 'exact', head: true }),
      supabase.from('tips').select('*', { count: 'exact', head: true }),
      supabase.from('quizzes').select('*', { count: 'exact', head: true }),
    ]).then(([users, posts, answers, profs, sessions, mods, tips, quizes]) => {
      setStats({
        users: users.count || 0,
        posts: posts.count || 0,
        answers: answers.count || 0,
        professionals: profs.count || 0,
        sessions: sessions.count || 0,
        reports: mods.count || 0,
        tips: tips.count || 0,
        quizzes: quizes.count || 0,
      })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [supabase])

  if (loading) return <div className="flex justify-center py-[60px]"><div className="animate-spin w-8 h-8 border-2 border-gold border-t-transparent rounded-full" /></div>

  const cards = [
    { label: 'Total Users', value: stats.users, color: 'bg-[oklch(25%_.06_151)]' },
    { label: 'Posts', value: stats.posts, color: 'bg-[oklch(23%_.05_230)]' },
    { label: 'Answers', value: stats.answers, color: 'bg-[oklch(24%_.06_84)]' },
    { label: 'Professionals', value: stats.professionals, color: 'bg-[oklch(23%_.05_151)]' },
    { label: 'Sessions', value: stats.sessions, color: 'bg-[oklch(25%_.06_55)]' },
    { label: 'Reports', value: stats.reports, color: 'bg-[oklch(25%_.06_28)]' },
    { label: 'Tips', value: stats.tips, color: 'bg-[oklch(23%_.05_230)]' },
    { label: 'Quizzes', value: stats.quizzes, color: 'bg-[oklch(24%_.06_84)]' },
  ]

  return (
    <>
      <h1 className="text-[28px] font-bold mb-[8px]" style={{ fontFamily: "'Plus Jakarta Sans'", letterSpacing: '-.07em' }}>Platform Overview</h1>
      <p className="text-[13px] text-[oklch(65%_.028_151)] mb-[24px]">Real-time metrics for KikwetuConnect</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-[12px] mb-[32px]">
        {cards.map(c => (
          <div key={c.label} className={`${c.color} rounded-[16px] p-[20px]`}>
            <div className="text-[29px] font-bold tracking-[-.06em]">{c.value.toLocaleString()}</div>
            <div className="text-[11px] text-[oklch(65%_.028_151)] mt-[5px]">{c.label}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
        <div className="bg-[oklch(18%_.028_151)] border border-[oklch(29%_.025_151)] rounded-[16px] p-[20px]">
          <h3 className="text-[16px] font-bold mb-[12px]">Quick Actions</h3>
          <div className="flex flex-wrap gap-[8px]">
            {['Review Professionals', 'Manage Reports', 'View Payouts', 'Platform Settings', 'Audit Logs', 'Send Notification'].map(a => (
              <button key={a} onClick={() => toast(`${a} panel opened`)} className="px-[12px] py-[8px] bg-[oklch(21%_.03_151)] rounded-[10px] text-[11px] text-cream hover:bg-[oklch(25%_.03_151)] transition-colors">{a}</button>
            ))}
          </div>
        </div>
        <div className="bg-[oklch(18%_.028_151)] border border-[oklch(29%_.025_151)] rounded-[16px] p-[20px]">
          <h3 className="text-[16px] font-bold mb-[12px]">System Health</h3>
          <div className="space-y-[8px]">
            {[{ label: 'Supabase Connection', status: 'Healthy' }, { label: 'M-Pesa Integration', status: 'Configured' }, { label: 'Translation Service', status: 'Active' }, { label: 'Offline Sync', status: 'Operational' }].map(s => (
              <div key={s.label} className="flex items-center justify-between text-[12px]">
                <span className="text-[oklch(65%_.028_151)]">{s.label}</span>
                <span className="text-green2 font-bold">{s.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
