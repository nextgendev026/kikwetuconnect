'use client'
import { useEffect, useState } from 'react'
import { useSupabase, toast } from '@/app/providers'
import { useRouter } from 'next/navigation'

export default function AdminDashboard() {
  const supabase = useSupabase()
  const router = useRouter()
  const [stats, setStats] = useState({ users: 0, posts: 0, answers: 0, pros: 0, sessions: 0, reports: 0, quizzes: 0, listings: 0, topics: 0 })
  const [modItems, setModItems] = useState<any[]>([])
  const [propsedQuizzes, setPropsedQuizzes] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const refreshCounts = () => {
      Promise.all([
        supabase.from('profiles').select('*', { count: 'estimated', head: true }),
        supabase.from('posts').select('*', { count: 'estimated', head: true }),
        supabase.from('topics').select('*', { count: 'estimated', head: true }),
        supabase.from('marketplace_listings').select('*', { count: 'estimated', head: true }),
        supabase.from('moderation_queue').select('*', { count: 'estimated', head: true }),
        supabase.from('quizzes').select('*', { count: 'estimated', head: true }),
        supabase.from('quiz_results').select('*', { count: 'estimated', head: true }),
        supabase.from('moderation_queue').select('id, target_type, reason, created_at, status').order('created_at', { ascending: false }).limit(5),
      ]).then(([users, posts, topics, listings, mods, quizes, results, modData]) => {
        if (cancelled) return
        setStats({
          users: users.count || 0, posts: posts.count || 0, answers: 0, pros: 0, sessions: 0,
          reports: mods.count || 0, quizzes: quizes.count || 0, listings: listings.count || 0, topics: topics.count || 0,
        })
        setPropsedQuizzes(results.count || 0)
        setModItems(modData.data || [])
        setLoading(false)
      }).catch(() => { if (!cancelled) setLoading(false) })
    }
    refreshCounts()

    let channel: ReturnType<typeof supabase.channel> | null = null
    if (typeof supabase?.channel === 'function') {
      channel = supabase.channel('admin-dash-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => refreshCounts())
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => refreshCounts())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'moderation_queue' }, () => refreshCounts())
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'marketplace_listings' }, () => refreshCounts())
        .subscribe()
    }
    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [supabase])

  if (loading) return <div className="flex justify-center py-[60px]"><div className="w-[32px] h-[32px] rounded-full animate-spin" style={{ border: '3px solid var(--gold)', borderTopColor: 'transparent' }} /></div>

  return (
    <div className="px-4 md:px-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="text-[10px] tracking-[.15em] uppercase font-extrabold text-green">Command center</div>
          <h1 className="font-extrabold text-[clamp(1.8rem,5vw,3rem)] leading-[1] tracking-[-.07em] mt-2" style={{ color: 'var(--ink)' }}>Good morning.</h1>
          <p className="text-[13px] mt-2.5 max-w-[60ch]" style={{ color: 'var(--muted)' }}>One calm view of what is moving, what needs attention, and where the circle needs care.</p>
        </div>
        <button onClick={() => toast('Create notice panel opened')}
          className="btn-primary self-start md:self-auto">Create notice</button>
      </div>

      {/* KPI cards - responsive grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total members', tag: 'registered', value: stats.users.toLocaleString(), sub: `${stats.topics} topics, ${stats.listings} listings`, tagColor: 'var(--green)' },
          { label: 'Open reports', tag: stats.reports > 0 ? 'urgent' : 'clear', value: stats.reports.toString(), sub: stats.reports > 0 ? `${Math.min(stats.reports, 5)} need action` : 'No pending reports', tagColor: stats.reports > 0 ? 'var(--red)' : 'var(--green)' },
          { label: 'Quizzes', tag: 'available', value: stats.quizzes.toString(), sub: `${propsedQuizzes} completed`, tagColor: 'var(--gold)' },
          { label: 'Total posts', tag: 'published', value: stats.posts.toLocaleString(), sub: 'across all spaces', tagColor: 'var(--green)' },
        ].map((k, i) => (
          <div key={i} className="rounded-[15px] p-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
            <div className="flex justify-between items-center text-[10px]" style={{ color: 'var(--muted)' }}>
              {k.label} <span style={{ color: k.tagColor }}>{k.tag}</span>
            </div>
            <strong className="block font-extrabold text-[clamp(1.5rem,4vw,1.75rem)] tracking-[-.06em] my-2" style={{ color: 'var(--ink)' }}>{k.value}</strong>
            <small className="text-[10px]" style={{ color: 'var(--muted)' }}>{k.sub}</small>
          </div>
        ))}
      </div>

      {/* Activity + Priority + Side */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-4">
        <div>
          {/* Activity pulse */}
          <div className="rounded-[16px] p-4 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-extrabold text-[14px] tracking-[-.03em] m-0" style={{ color: 'var(--ink)' }}>Activity pulse</h2>
              <button onClick={() => toast('Chart range updated')} className="text-[10px] border-0 cursor-pointer" style={{ background: 'none', color: 'var(--gold)' }}>Last 7 days ▾</button>
            </div>
            <div className="h-[180px] md:h-[225px] flex flex-col justify-end gap-2 border-b" style={{ borderColor: 'var(--line)' }}>
              <div className="flex items-end gap-2 px-1" style={{ background: 'repeating-linear-gradient(to bottom,transparent 0,transparent 43px,var(--line) 44px)' }}>
                {[48, 63, 56, 76, 69, 83, 92].map((h, i) => (
                  <div key={i} className="flex-1 min-w-[8px] rounded-t-[5px]" style={{ height: `${h}%`, background: i % 4 === 0 ? 'var(--gold)' : 'var(--green)', opacity: .84 }} />
                ))}
              </div>
              <div className="flex justify-between text-[9px] px-1 pb-1" style={{ color: 'var(--faint)' }}>
                <span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span><span>Mon</span>
              </div>
            </div>
          </div>

          {/* Priority queue */}
          <div className="rounded-[16px] p-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-extrabold text-[14px] tracking-[-.03em] m-0" style={{ color: 'var(--ink)' }}>Priority queue</h2>
              <button onClick={() => router.push('/admin/moderation')} className="text-[10px] border-0 cursor-pointer" style={{ background: 'none', color: 'var(--gold)' }}>Open queue →</button>
            </div>
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="text-[9px] uppercase tracking-[.08em]" style={{ color: 'var(--muted)' }}>
                    <th className="text-left py-3 px-2 border-b" style={{ borderColor: 'var(--line)' }}>Item</th>
                    <th className="text-left py-3 px-2 border-b hidden md:table-cell" style={{ borderColor: 'var(--line)' }}>Area</th>
                    <th className="text-left py-3 px-2 border-b hidden sm:table-cell" style={{ borderColor: 'var(--line)' }}>Age</th>
                    <th className="text-left py-3 px-2 border-b" style={{ borderColor: 'var(--line)' }}>Risk</th>
                    <th className="text-left py-3 px-2 border-b" style={{ borderColor: 'var(--line)' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {modItems.length > 0 ? modItems.slice(0, 3).map((item: any, i: number) => (
                    <tr key={item.id || i}>
                      <td className="py-3 px-2 border-b" style={{ borderColor: 'var(--line)' }}>
                        <b style={{ color: 'var(--ink)' }}>{item.target_type || 'Report'}</b>
                        <small className="block text-[9px] mt-1" style={{ color: 'var(--muted)' }}>{item.reason?.slice(0, 40) || 'Pending'}</small>
                      </td>
                      <td className="py-3 px-2 border-b hidden md:table-cell" style={{ color: 'var(--muted)', borderColor: 'var(--line)' }}>{item.status || 'Open'}</td>
                      <td className="py-3 px-2 border-b hidden sm:table-cell" style={{ color: 'var(--muted)', borderColor: 'var(--line)' }}>{item.created_at ? Math.round((Date.now() - new Date(item.created_at).getTime()) / 3600000) + 'h' : '—'}</td>
                      <td className="py-3 px-2 border-b" style={{ borderColor: 'var(--line)' }}>
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold" style={{ background: i === 0 ? 'oklch(68% .15 28 / .15)' : 'oklch(61% .13 151 / .15)', color: i === 0 ? 'var(--red)' : 'var(--green)' }}>
                          {i === 0 ? 'High' : 'Medium'}
                        </span>
                      </td>
                      <td className="py-3 px-2 border-b" style={{ borderColor: 'var(--line)' }}>
                        <button onClick={() => toast('Review panel opened')} className="h-[30px] px-[9px] rounded-[8px] text-[10px] cursor-pointer border" style={{ background: 'var(--raised)', color: 'var(--ink)', borderColor: 'var(--line)' }}>Review</button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="py-5 text-center text-[11px]" style={{ color: 'var(--muted)' }}>No pending reports</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* Trust health */}
          <div className="rounded-[16px] p-4 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-extrabold text-[14px] tracking-[-.03em] m-0" style={{ color: 'var(--ink)' }}>Trust health</h2>
              <button onClick={() => router.push('/admin/health')} className="text-[10px] border-0 cursor-pointer" style={{ background: 'none', color: 'var(--gold)' }}>Details</button>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-[100px] h-[100px] md:w-[122px] md:h-[122px] rounded-full grid place-items-center relative flex-shrink-0" style={{ background: 'conic-gradient(var(--green) 0 86%, var(--raised) 86% 100%)' }}>
                <div className="absolute inset-[10px] md:inset-[12px] rounded-full" style={{ background: 'var(--surface)' }} />
                <span className="relative z-10 font-extrabold text-[clamp(1.1rem,3vw,1.4rem)]" style={{ color: 'var(--ink)' }}>86%</span>
              </div>
              <div className="grid gap-2.5 w-full sm:flex-1">
                {[
                  { dot: 'var(--green)', label: 'Reports resolved', value: '86%' },
                  { dot: 'var(--gold)', label: 'Translation coverage', value: '74%' },
                  { dot: 'var(--red)', label: 'Escalations', value: '14%' },
                ].map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px]">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.dot }} />
                    {m.label} <span className="ml-auto" style={{ color: 'var(--muted)' }}>{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Platform overview */}
          <div className="rounded-[16px] p-4 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
            <div className="flex justify-between items-center mb-2.5">
              <h2 className="font-extrabold text-[14px] tracking-[-.03em] m-0" style={{ color: 'var(--ink)' }}>Platform overview</h2>
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold" style={{ background: 'oklch(61% .13 151 / .15)', color: 'var(--green)' }}>● live</span>
            </div>
            {[
              { label: 'Total members', value: stats.users.toLocaleString() },
              { label: 'Total posts', value: stats.posts.toLocaleString() },
              { label: 'Open reports', value: stats.reports.toString() },
              { label: 'Quizzes taken', value: propsedQuizzes.toString() },
            ].map((m, i) => (
              <div key={i} className="flex justify-between py-2.5 text-[11px]" style={{ borderBottom: i < 3 ? '1px solid var(--line)' : 'none' }}>
                <span style={{ color: 'var(--muted)' }}>{m.label}</span>
                <b style={{ color: 'var(--ink)' }}>{m.value}</b>
              </div>
            ))}
          </div>

          {/* System summary */}
          <div className="rounded-[16px] p-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
            <div className="flex justify-between items-center mb-2.5">
              <h2 className="font-extrabold text-[14px] tracking-[-.03em] m-0" style={{ color: 'var(--ink)' }}>System summary</h2>
              <button onClick={() => router.push('/admin/analytics')} className="text-[10px] border-0 cursor-pointer" style={{ background: 'none', color: 'var(--gold)' }}>Full report →</button>
            </div>
            <div className="grid gap-3.5">
              {[
                { label: 'Quiz questions available', detail: `${stats.quizzes} quizzes, ${propsedQuizzes} taken`, color: 'var(--gold)' },
                { label: 'Topics created', detail: `${stats.topics} active topics`, color: 'var(--green)' },
                { label: 'Market listings', detail: `${stats.listings} listings on platform`, color: 'var(--blue)' },
              ].map((a, i) => (
                <div key={i} className="flex gap-2.5">
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: a.color, boxShadow: `0 0 0 4px color-mix(in srgb, ${a.color} 20%, transparent)` }} />
                  <div>
                    <strong className="text-[11px]" style={{ color: 'var(--ink)' }}>{a.label}</strong>
                    <small className="block text-[9px] mt-1" style={{ color: 'var(--muted)' }}>{a.detail}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
