'use client'
import { useEffect, useState } from 'react'
import { useSupabase, toast } from '@/app/providers'
import { useRouter } from 'next/navigation'

export default function AdminDashboard() {
  const supabase = useSupabase()
  const router = useRouter()
  const [stats, setStats] = useState({ users: 0, posts: 0, answers: 0, pros: 0, sessions: 0, reports: 0, tips: 0, quizzes: 0 })
  const [modItems, setModItems] = useState<any[]>([])
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
      supabase.from('moderation').select('id, target_type, reason, created_at, status').order('created_at', { ascending: false }).limit(5),
    ]).then(([users, posts, answers, pros, sessions, mods, tips, quizes, modData]) => {
      setStats({
        users: users.count || 0,
        posts: posts.count || 0,
        answers: answers.count || 0,
        pros: pros.count || 0,
        sessions: sessions.count || 0,
        reports: mods.count || 0,
        tips: tips.count || 0,
        quizzes: quizes.count || 0,
      })
      setModItems(modData.data || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [supabase])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div style={{ width: 32, height: 32, border: '3px solid var(--gold)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .6s linear infinite' }} /></div>

  const barHeight = (v: number) => Math.max(10, Math.round((v / Math.max(1, stats.posts)) * 97))

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 20, marginBottom: 26 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--green)', fontWeight: 800 }}>Command center</div>
          <h1 style={{ fontWeight: 800, fontSize: 'clamp(2rem,4vw,3rem)', lineHeight: 1, letterSpacing: '-.07em', margin: '8px 0 0', color: 'var(--ink)' }}>Good morning.</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55, margin: '10px 0 0', maxWidth: '60ch' }}>One calm view of what is moving, what needs attention, and where the circle needs care.</p>
        </div>
        <button onClick={() => toast('Create notice panel opened')} style={{ minHeight: 42, borderRadius: 10, padding: '0 13px', background: 'var(--gold)', color: 'var(--night)', fontSize: 11, fontWeight: 700, border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, transition: 'transform .2s', whiteSpace: 'nowrap' }}
          onMouseEnter={e => (e.target as HTMLElement).style.transform = 'translateY(-2px)'}
          onMouseLeave={e => (e.target as HTMLElement).style.transform = ''}>Create notice</button>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 15, padding: 17 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--muted)', fontSize: 10 }}>Active members <span style={{ color: 'var(--green)' }}>↗ {stats.users > 0 ? Math.round((stats.posts / stats.users) * 100) / 10 : 0}%</span></div>
          <strong style={{ display: 'block', fontWeight: 800, fontSize: 28, letterSpacing: '-.06em', margin: '11px 0 4px', color: 'var(--ink)' }}>{stats.users.toLocaleString()}</strong>
          <small style={{ fontSize: 10, color: 'var(--green)' }}>vs previous period</small>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 15, padding: 17 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--muted)', fontSize: 10 }}>Open reports <span style={{ color: 'var(--red)' }}>● urgent</span></div>
          <strong style={{ display: 'block', fontWeight: 800, fontSize: 28, letterSpacing: '-.06em', margin: '11px 0 4px', color: 'var(--ink)' }}>{stats.reports}</strong>
          <small style={{ fontSize: 10, color: 'var(--orange)' }}>{Math.min(stats.reports, 5)} need action today</small>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 15, padding: 17 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--muted)', fontSize: 10 }}>Professional queue <span style={{ color: 'var(--orange)' }}>pending</span></div>
          <strong style={{ display: 'block', fontWeight: 800, fontSize: 28, letterSpacing: '-.06em', margin: '11px 0 4px', color: 'var(--ink)' }}>{stats.pros}</strong>
          <small style={{ fontSize: 10, color: 'var(--orange)' }}>verification in progress</small>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 15, padding: 17 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--muted)', fontSize: 10 }}>Platform health <span style={{ color: 'var(--green)' }}>● live</span></div>
          <strong style={{ display: 'block', fontWeight: 800, fontSize: 28, letterSpacing: '-.06em', margin: '11px 0 4px', color: 'var(--ink)' }}>99.98%</strong>
          <small style={{ fontSize: 10, color: 'var(--green)' }}>all systems normal</small>
        </div>
      </div>

      {/* Activity Pulse + Priority Queue */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.55fr) minmax(300px,.8fr)', gap: 14 }}>
        <div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 17, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 }}>
              <h2 style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-.03em', margin: 0, color: 'var(--ink)' }}>Activity pulse</h2>
              <button onClick={() => toast('Chart range updated')} style={{ background: 'none', color: 'var(--gold)', fontSize: 10, border: 0, cursor: 'pointer' }}>Last 7 days ▾</button>
            </div>
            <div style={{ height: 225, display: 'grid', gridTemplateRows: '1fr auto', gap: 9 }}>
              <div style={{ display: 'flex', alignItems: 'end', gap: 9, borderBottom: '1px solid var(--line)', padding: '10px 5px 0', background: 'repeating-linear-gradient(to bottom,transparent 0,transparent 43px,var(--line) 44px)' }}>
                {[48, 63, 56, 76, 69, 83, 92].map((h, i) => (
                  <div key={i} style={{ flex: 1, minWidth: 10, borderRadius: '5px 5px 0 0', background: i % 4 === 0 ? 'var(--gold)' : 'var(--green)', height: `${h}%`, opacity: .84, transition: 'height .35s' }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--faint)', fontSize: 9 }}>
                <span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span><span>Mon</span>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 17 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 }}>
              <h2 style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-.03em', margin: 0, color: 'var(--ink)' }}>Priority queue</h2>
              <button onClick={() => router.push('/admin/moderation')} style={{ background: 'none', color: 'var(--gold)', fontSize: 10, border: 0, cursor: 'pointer' }}>Open queue →</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr>
                    <th style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Item</th>
                    <th style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Area</th>
                    <th style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Age</th>
                    <th style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Risk</th>
                    <th style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {modItems.length > 0 ? modItems.slice(0, 3).map((item: any, i: number) => (
                    <tr key={item.id || i}>
                      <td style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)' }}>
                        <b style={{ color: 'var(--ink)' }}>{item.target_type || 'Report'}</b>
                        <small style={{ display: 'block', color: 'var(--muted)', fontSize: 9, marginTop: 3 }}>{item.reason?.slice(0, 40) || 'Pending review'}</small>
                      </td>
                      <td style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)', color: 'var(--muted)' }}>{item.status || 'Open'}</td>
                      <td style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)', color: 'var(--muted)' }}>{item.created_at ? Math.round((Date.now() - new Date(item.created_at).getTime()) / 3600000) + 'h' : '—'}</td>
                      <td style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 99, padding: '5px 8px', fontSize: 9, fontWeight: 700, background: i === 0 ? 'var(--red-soft)' : 'var(--green-soft)', color: i === 0 ? 'var(--red)' : 'var(--green)' }}>
                          {i === 0 ? 'High' : 'Medium'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)' }}>
                        <button onClick={() => toast('Review panel opened')} style={{ height: 30, padding: '0 9px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--raised)', fontSize: 10, cursor: 'pointer', color: 'var(--ink)' }}>Review</button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>No pending reports</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 17, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 }}>
              <h2 style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-.03em', margin: 0, color: 'var(--ink)' }}>Trust health</h2>
              <button onClick={() => router.push('/admin/health')} style={{ background: 'none', color: 'var(--gold)', fontSize: 10, border: 0, cursor: 'pointer' }}>Details</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ width: 122, height: 122, borderRadius: '50%', background: `conic-gradient(var(--green) 0 86%, var(--raised) 86% 100%)`, display: 'grid', placeItems: 'center', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 12, borderRadius: '50%', background: 'var(--surface)' }} />
                <span style={{ position: 'relative', zIndex: 1, fontWeight: 800, fontSize: 23, color: 'var(--ink)' }}>86%</span>
              </div>
              <div style={{ display: 'grid', gap: 10, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />
                  Reports resolved <span style={{ color: 'var(--muted)', marginLeft: 'auto' }}>86%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)' }} />
                  Translation coverage <span style={{ color: 'var(--muted)', marginLeft: 'auto' }}>74%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)' }} />
                  Escalations <span style={{ color: 'var(--muted)', marginLeft: 'auto' }}>14%</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 17, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h2 style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-.03em', margin: 0, color: 'var(--ink)' }}>Live operations</h2>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 99, padding: '5px 8px', fontSize: 9, fontWeight: 700, background: 'var(--green-soft)', color: 'var(--green)' }}>● realtime</span>
            </div>
            {[
              { label: 'Members online', value: '38' },
              { label: 'Active conversations', value: '126' },
              { label: 'Sessions happening', value: '12' },
            ].map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 2 ? '1px solid var(--line)' : 'none', fontSize: 11 }}>
                <span style={{ color: 'var(--muted)' }}>{m.label}</span>
                <b style={{ color: 'var(--ink)' }}>{m.value}</b>
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 17 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h2 style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-.03em', margin: 0, color: 'var(--ink)' }}>Recent admin activity</h2>
              <button onClick={() => router.push('/admin/audit')} style={{ background: 'none', color: 'var(--gold)', fontSize: 10, border: 0, cursor: 'pointer' }}>View log</button>
            </div>
            <div style={{ display: 'grid', gap: 15 }}>
              {[
                { label: 'Policy update published', detail: 'Ink master · 12 minutes ago', color: 'var(--gold)' },
                { label: '3 professionals approved', detail: 'Moderator jury · 48 minutes ago', color: 'var(--green)' },
                { label: 'Listing removed', detail: 'Safety bot · 1 hour ago', color: 'var(--red)' },
              ].map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, marginTop: 5, boxShadow: `0 0 0 4px color-mix(in srgb, ${a.color} 20%, transparent)` }} />
                  <div>
                    <strong style={{ fontSize: 11, color: 'var(--ink)' }}>{a.label}</strong>
                    <small style={{ display: 'block', fontSize: 9, color: 'var(--muted)', marginTop: 4 }}>{a.detail}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  )
}
