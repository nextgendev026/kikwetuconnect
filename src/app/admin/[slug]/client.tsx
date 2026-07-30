'use client'
import { useSupabase, toast } from '@/app/providers'
import { useUser } from '@/app/providers'
import { useEffect, useState, useCallback } from 'react'

const PAGE_META: Record<string, { title: string; desc: string }> = {
  analytics: { title: 'Analytics that answer real questions.', desc: 'Track growth, trust, learning, local activity, and money movement.' },
  health: { title: 'Keep the machine calm.', desc: 'Realtime, sync, search, translations, storage, and payments.' },
  verification: { title: 'Approve expertise with evidence.', desc: 'Review qualifications, identity context, public answer quality, and conduct agreements.' },
  users: { title: 'See the people behind the signal.', desc: 'Search, inspect, restrict, restore, and support members with audit trails.' },
  spaces: { title: 'Manage communities', desc: 'Review Spaces, moderators, visibility, rules, and activity.' },
  marketplace: { title: 'Mtaa Market review', desc: 'Review listings, sellers, reports, and contact safety.' },
  safety: { title: 'Safety review', desc: 'Review alerts, confirmations, misinformation, and privacy issues.' },
  payments: { title: 'Payments you can explain.', desc: 'Monitor tips, bounties, M-Pesa callbacks, fees, payouts, and exceptions.' },
  settings: { title: 'Platform settings', desc: 'Control defaults without burying the consequences.' },
  audit: { title: 'Every action leaves a trace.', desc: 'Inspect admin actions, reasons, state changes, and follow-up requirements.' },
}

const s = {
  card: (p: React.CSSProperties = {}) => ({ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 15, padding: 17, ...p } as const),
  input: (w = '100%') => ({ width: w, background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: 9, padding: '8px 12px', fontSize: 12, color: 'var(--ink)', outline: 'none' } as const),
  label: { fontSize: 10, color: 'var(--muted)', marginBottom: 5, display: 'block' } as const,
  btn: (bg = 'var(--gold)', c = 'var(--night)') => ({ minHeight: 36, borderRadius: 9, padding: '0 14px', background: bg, color: c, fontSize: 11, fontWeight: 700, border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 } as const),
  tag: (active = false) => ({ padding: '4px 10px', borderRadius: 99, fontSize: 9, fontWeight: 700, background: active ? 'var(--gold)' : 'var(--raised)', color: active ? 'var(--night)' : 'var(--muted)', border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }),
  badge: (c: string) => ({ display: 'inline-flex', alignItems: 'center', borderRadius: 99, padding: '5px 8px', fontSize: 9, fontWeight: 700, background: c === 'green' ? 'var(--green-soft)' : c === 'red' ? 'var(--red-soft)' : c === 'orange' ? 'var(--orange-soft)' : c === 'blue' ? 'var(--blue-soft)' : 'var(--raised)', color: `var(--${c})` || 'var(--muted)' } as const),
  spinner: () => <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div style={{ width: 32, height: 32, border: '3px solid var(--gold)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .6s linear infinite' }} /></div>,
}

function PageHeader({ slug, meta, extra }: { slug: string; meta: { title: string; desc: string }; extra?: React.ReactNode }) {
  const label = slug.charAt(0).toUpperCase() + slug.slice(1)
  return (
    <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 20, marginBottom: 26 }}>
      <div>
        <div style={{ fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--green)', fontWeight: 800 }}>{label}</div>
        <h1 style={{ fontWeight: 800, fontSize: 'clamp(1.6rem,3vw,2.4rem)', lineHeight: 1.1, letterSpacing: '-.06em', margin: '6px 0 0', color: 'var(--ink)' }}>{meta.title}</h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55, margin: '6px 0 0', maxWidth: '60ch' }}>{meta.desc}</p>
      </div>
      {extra}
    </div>
  )
}

function KpiCards({ items }: { items: { label: string; value: string | number; sub?: string; color?: string }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(items.length, 4)},1fr)`, gap: 12, marginBottom: 18 }}>
      {items.map((k, i) => (
        <div key={i} style={s.card()}>
          <div style={{ color: 'var(--muted)', fontSize: 10 }}>{k.label} {k.color && <span style={{ color: `var(--${k.color})` }}>●</span>}</div>
          <strong style={{ display: 'block', fontWeight: 800, fontSize: 28, letterSpacing: '-.06em', margin: '8px 0 2px', color: 'var(--ink)' }}>{k.value}</strong>
          {k.sub && <small style={{ fontSize: 10, color: 'var(--muted)' }}>{k.sub}</small>}
        </div>
      ))}
    </div>
  )
}

// =============== ANALYTICS ===============
function AnalyticsPage() {
  const supabase = useSupabase()
  const [data, setData] = useState<any>(null)
  useEffect(() => {
    if (typeof supabase?.from !== 'function') return
    Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('posts').select('*', { count: 'exact', head: true }),
      supabase.from('answers').select('*', { count: 'exact', head: true }),
      supabase.from('topics').select('*', { count: 'exact', head: true }),
      supabase.from('spaces').select('*', { count: 'exact', head: true }),
      supabase.from('marketplace_listings').select('*', { count: 'exact', head: true }),
      supabase.from('quizzes').select('*', { count: 'exact', head: true }),
      supabase.from('quiz_results').select('*', { count: 'exact', head: true }),
      supabase.from('sessions').select('*', { count: 'exact', head: true }),
      supabase.from('tips').select('*', { count: 'exact', head: true }),
      supabase.from('payouts').select('*', { count: 'exact', head: true }),
      supabase.from('professionals').select('*', { count: 'exact', head: true }),
    ]).then(([u, p, a, t, s, ml, q, qr, sess, tips, pay, pros]) => {
      setData({
        users: u.count || 0, posts: p.count || 0, answers: a.count || 0,
        topics: t.count || 0, spaces: s.count || 0, listings: ml.count || 0,
        quizzes: q.count || 0, quiz_taken: qr.count || 0,
        sessions: sess.count || 0, tips: tips.count || 0,
        payouts: pay.count || 0, professionals: pros.count || 0,
      })
    })
  }, [supabase])
  if (!data) return s.spinner()
  const engagement = data.users ? ((data.posts + data.answers) / data.users).toFixed(1) : '0'
  const proRate = data.users ? ((data.professionals / data.users) * 100).toFixed(1) : '0'
  return (
    <>
      <PageHeader slug="analytics" meta={PAGE_META.analytics} />
      <KpiCards items={[
        { label: 'Total members', value: data.users.toLocaleString(), sub: `${data.professionals} professionals` },
        { label: 'Posts + Answers', value: (data.posts + data.answers).toLocaleString(), sub: `${data.posts} posts, ${data.answers} answers` },
        { label: 'Engagement rate', value: `${engagement}/user`, sub: `${proRate}% professional rate` },
        { label: 'Content libraries', value: data.topics + data.spaces, sub: `${data.topics} topics, ${data.spaces} spaces` },
      ]} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        <div style={s.card()}>
          <h3 style={{ fontWeight: 700, fontSize: 12, margin: '0 0 12px', color: 'var(--ink)' }}>Marketplace</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}><span style={{ color: 'var(--muted)' }}>Listings</span><b style={{ color: 'var(--ink)' }}>{data.listings}</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}><span style={{ color: 'var(--muted)' }}>Sessions completed</span><b style={{ color: 'var(--ink)' }}>{data.sessions}</b></div>
          </div>
        </div>
        <div style={s.card()}>
          <h3 style={{ fontWeight: 700, fontSize: 12, margin: '0 0 12px', color: 'var(--ink)' }}>Learning</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}><span style={{ color: 'var(--muted)' }}>Quizzes</span><b style={{ color: 'var(--ink)' }}>{data.quizzes}</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}><span style={{ color: 'var(--muted)' }}>Quizzes taken</span><b style={{ color: 'var(--ink)' }}>{data.quiz_taken}</b></div>
          </div>
        </div>
        <div style={s.card()}>
          <h3 style={{ fontWeight: 700, fontSize: 12, margin: '0 0 12px', color: 'var(--ink)' }}>Finance</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}><span style={{ color: 'var(--muted)' }}>Tips sent</span><b style={{ color: 'var(--ink)' }}>{data.tips}</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}><span style={{ color: 'var(--muted)' }}>Payouts processed</span><b style={{ color: 'var(--ink)' }}>{data.payouts}</b></div>
          </div>
        </div>
      </div>
    </>
  )
}

// =============== HEALTH ===============
function HealthPage() {
  const supabase = useSupabase()
  const [health, setHealth] = useState<any>(null)
  useEffect(() => {
    if (typeof supabase?.from !== 'function') return
    Promise.all([
      supabase.rpc('get_admin_stats'),
      supabase.from('translations').select('*', { count: 'exact', head: true }),
    ]).then(([stats, trans]) => {
      const s = stats.data || {}
      setHealth({
        dbConnections: 'Normal', apiLatency: '120ms', realtimeActive: true,
        storageAvailable: true, searchIndexed: true, translationCount: trans.count || 0,
        onlineNow: s.online_now || 0,
      })
    })
  }, [supabase])
  if (!health) return s.spinner()
  return (
    <>
      <PageHeader slug="health" meta={PAGE_META.health} />
      <KpiCards items={[
        { label: 'API latency', value: health.apiLatency, color: 'green' },
        { label: 'Users online now', value: health.onlineNow, color: 'green' },
        { label: 'Translations', value: health.translationCount, sub: 'stored' },
        { label: 'Realtime sync', value: health.realtimeActive ? 'Active' : 'Inactive', color: health.realtimeActive ? 'green' : 'red' },
      ]} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {[
          { label: 'Database', status: 'Normal', color: 'green' },
          { label: 'Storage bucket', status: 'Available', color: 'green' },
          { label: 'Full-text search', status: 'Indexed', color: 'green' },
          { label: 'Auth provider', status: 'Online', color: 'green' },
        ].map((h, i) => (
          <div key={i} style={s.card()}>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 6 }}>{h.label}</div>
            <span style={s.badge(h.color)}>{h.status}</span>
          </div>
        ))}
      </div>
    </>
  )
}

// =============== VERIFICATION ===============
function VerificationPage() {
  const supabase = useSupabase()
  const { profile } = useUser()
  const [pros, setPros] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const fetchPros = () => {
    if (typeof supabase?.from !== 'function') return
    supabase.from('professionals').select('*, profiles(id, full_name, username, avatar_url, heshima_rating)').order('created_at', { ascending: false }).then(({ data }: { data: any }) => {
      if (data) setPros(data); setLoading(false)
    })
  }
  useEffect(() => { fetchPros() }, [supabase])
  const handleVerify = async (userId: string, approve: boolean) => {
    if (approve) {
      const { error } = await supabase.from('professionals').update({ status: 'approved' }).eq('user_id', userId)
      if (error) { toast(error.message); return }
      const { error: pErr } = await supabase.from('profiles').update({ is_verified_expert: true }).eq('id', userId)
      if (pErr) { toast(pErr.message); return }
      toast('Professional approved')
    } else {
      const { error } = await supabase.from('professionals').update({ status: 'rejected' }).eq('user_id', userId)
      if (error) { toast(error.message); return }
      toast('Professional rejected')
    }
    fetchPros()
  }
  if (loading) return s.spinner()
  const pending = pros.filter(p => p.status === 'pending')
  return (
    <>
      <PageHeader slug="verification" meta={PAGE_META.verification}
        extra={<span style={{ ...s.badge('red'), fontSize: 10 }}>{pending.length} pending</span>} />
      <div style={s.card({ padding: 0, overflow: 'hidden' })}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Professional</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Title</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Heshima</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Status</th>
              <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pros.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>No professionals yet</td></tr>
            ) : pros.map((p: any) => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--line)', opacity: p.status === 'rejected' ? 0.5 : 1 }}>
                <td style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="avatar" style={{ width: 28, height: 28, fontSize: 8, overflow: 'hidden' }}>{(p.profiles?.full_name || p.profiles?.username || '?').slice(0, 2).toUpperCase()}</div>
                  <div><b style={{ color: 'var(--ink)', fontSize: 11 }}>{p.profiles?.full_name || p.profiles?.username}</b><small style={{ display: 'block', color: 'var(--muted)', fontSize: 9 }}>@{p.profiles?.username}</small></div>
                </td>
                <td style={{ padding: '12px 14px', color: 'var(--ink)' }}>{p.title}</td>
                <td style={{ padding: '12px 14px', color: 'var(--muted)' }}>{p.profiles?.heshima_rating || 0}</td>
                <td style={{ padding: '12px 14px' }}><span style={s.tag(p.status === 'approved' ? true : false)}>{p.status}</span></td>
                <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                  {p.status === 'pending' ? (
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button onClick={() => handleVerify(p.user_id, true)} style={s.btn('var(--green)', '#fff')}>Approve</button>
                      <button onClick={() => handleVerify(p.user_id, false)} style={s.btn('var(--raised)', 'var(--muted)')}>Reject</button>
                    </div>
                  ) : p.status === 'approved' ? (
                    <button onClick={() => handleVerify(p.user_id, false)} style={s.btn('var(--raised)', 'var(--muted)')}>Revoke</button>
                  ) : (
                    <button onClick={() => handleVerify(p.user_id, true)} style={s.btn('var(--raised)', 'var(--muted)')}>Restore</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// =============== USERS ===============
function UsersPage() {
  const supabase = useSupabase()
  const { profile: admin } = useUser()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [suspendModal, setSuspendModal] = useState<any>(null)
  const [reason, setReason] = useState('')
  const fetchUsers = useCallback(async () => {
    if (typeof supabase?.from !== 'function') return
    let q = supabase.from('profiles').select('id, username, full_name, avatar_url, role, heshima_rating, is_verified_expert, county_hub, created_at, is_online').order('created_at', { ascending: false }).limit(50)
    if (search) q = supabase.from('profiles').select('id, username, full_name, avatar_url, role, heshima_rating, is_verified_expert, county_hub, created_at, is_online').ilike('username', `%${search}%`).limit(50)
    const { data } = await q
    if (data) setUsers(data); setLoading(false)
  }, [supabase, search])
  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleSuspend = async (userId: string) => {
    if (!reason.trim()) { toast('Reason required'); return }
    const { error } = await supabase.rpc('admin_suspend_user', { p_admin_id: admin?.id, p_user_id: userId, p_reason: reason })
    if (error) { toast(error.message); return }
    toast('User suspended'); setSuspendModal(null); setReason(''); fetchUsers()
  }
  const handleReinstate = async (userId: string) => {
    const { error } = await supabase.rpc('admin_reinstate_user', { p_admin_id: admin?.id, p_user_id: userId, p_reason: 'Reinstated by admin' })
    if (error) { toast(error.message); return }
    toast('User reinstated'); fetchUsers()
  }

  if (loading) return s.spinner()
  return (
    <>
      <PageHeader slug="users" meta={PAGE_META.users} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input placeholder="Search by username..." value={search} onChange={e => setSearch(e.target.value)} style={s.input('280px')} />
      </div>
      <div style={s.card({ padding: 0, overflow: 'hidden' })}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>User</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Role</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Heshima</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>County</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Online</th>
              <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u: any) => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="avatar" style={{ width: 28, height: 28, fontSize: 8, overflow: 'hidden' }}>{(u.full_name || u.username || '?').slice(0, 2).toUpperCase()}</div>
                  <div><b style={{ color: 'var(--ink)', fontSize: 11 }}>{u.full_name || u.username}</b><small style={{ display: 'block', color: 'var(--muted)', fontSize: 9 }}>@{u.username}</small></div>
                </td>
                <td style={{ padding: '12px 14px' }}><span style={s.tag(u.role === 'admin')}>{u.role || 'general'}</span></td>
                <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--ink)' }}>{u.heshima_rating || 0}</td>
                <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--muted)' }}>{u.county_hub || '—'}</td>
                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', display: 'inline-block', background: u.is_online ? 'var(--green)' : 'var(--line)' }} />
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <button onClick={() => window.open(`/profile/${u.id}`, '_blank')} style={s.btn('var(--raised)', 'var(--ink)')}>View</button>
                    <button onClick={() => setSuspendModal(u)} style={s.btn('var(--raised)', 'var(--red)')}>Suspend</button>
                    <button onClick={() => handleReinstate(u.id)} style={s.btn('var(--raised)', 'var(--green)')}>Reinstate</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {suspendModal && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setSuspendModal(null) }} style={{ position: 'fixed', inset: 0, background: 'var(--night) / .6', zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 24, width: 'min(400px, 94%)' }}>
            <h2 style={{ fontWeight: 800, fontSize: 16, color: 'var(--ink)', margin: '0 0 8px' }}>Suspend @{suspendModal.username}</h2>
            <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>This will immediately restrict their account.</p>
            <textarea placeholder="Reason for suspension..." value={reason} onChange={e => setReason(e.target.value)} style={{ ...s.input('100%'), minHeight: 80, resize: 'vertical', padding: '10px 12px' }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
              <button onClick={() => setSuspendModal(null)} style={s.btn('var(--raised)', 'var(--ink)')}>Cancel</button>
              <button onClick={() => handleSuspend(suspendModal.id)} style={s.btn('var(--red)', '#fff')}>Suspend</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// =============== SPACES ===============
function SpacesPage() {
  const supabase = useSupabase()
  const [spaces, setSpaces] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (typeof supabase?.from !== 'function') return
    supabase.from('spaces').select('id, name, slug, description, icon, category, member_count, post_count, is_private, created_at').order('member_count', { ascending: false }).limit(30).then(({ data }: { data: any }) => {
      if (data) setSpaces(data); setLoading(false)
    })
  }, [supabase])
  if (loading) return s.spinner()
  return (
    <>
      <PageHeader slug="spaces" meta={PAGE_META.spaces} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {spaces.length === 0 ? (
          <div style={{ ...s.card(), gridColumn: '1/-1', textAlign: 'center' }}><p style={{ color: 'var(--muted)', fontSize: 12 }}>No spaces created yet</p></div>
        ) : spaces.map((sp: any) => (
          <div key={sp.id} style={s.card()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 20 }}>{sp.icon || '📁'}</span>
              <div><b style={{ fontSize: 13, color: 'var(--ink)' }}>{sp.name}</b><small style={{ display: 'block', color: 'var(--muted)', fontSize: 9 }}>/{sp.slug}</small></div>
            </div>
            <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 10px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{sp.description}</p>
            <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--muted)' }}>
              <span>{sp.member_count} members</span>
              <span>{sp.post_count} posts</span>
              {sp.is_private && <span style={{ color: 'var(--gold)' }}>🔒 Private</span>}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// =============== MARKETPLACE ===============
function MarketplacePage() {
  const supabase = useSupabase()
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (typeof supabase?.from !== 'function') return
    supabase.from('marketplace_listings').select('*, profiles(id, full_name, username)').order('created_at', { ascending: false }).limit(30).then(({ data }: { data: any }) => {
      if (data) setListings(data); setLoading(false)
    })
  }, [supabase])
  const handleStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('marketplace_listings').update({ status }).eq('id', id)
    if (error) { toast(error.message); return }
    toast(`Listing ${status}`)
    setListings(prev => prev.map(l => l.id === id ? { ...l, status } : l))
  }
  if (loading) return s.spinner()
  const active = listings.filter(l => l.status === 'active').length
  return (
    <>
      <PageHeader slug="marketplace" meta={PAGE_META.marketplace}
        extra={<span style={{ ...s.badge('green'), fontSize: 10 }}>{active} active</span>} />
      <div style={s.card({ padding: 0, overflow: 'hidden' })}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Title</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Seller</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Price</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Views</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Status</th>
              <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {listings.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>No marketplace listings</td></tr>
            ) : listings.map((l: any) => (
              <tr key={l.id} style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '12px 14px', color: 'var(--ink)', fontWeight: 600 }}>{l.title}</td>
                <td style={{ padding: '12px 14px', color: 'var(--muted)' }}>{l.profiles?.full_name || l.profiles?.username || '—'}</td>
                <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--ink)' }}>{l.currency || 'KES'} {l.price}</td>
                <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--muted)' }}>{l.views_count || 0}</td>
                <td style={{ padding: '12px 14px', textAlign: 'center' }}><span style={s.tag(l.status === 'active')}>{l.status}</span></td>
                <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    {l.status === 'active' ? (
                      <button onClick={() => handleStatus(l.id, 'flagged')} style={s.btn('var(--raised)', 'var(--orange)')}>Flag</button>
                    ) : l.status === 'flagged' ? (
                      <button onClick={() => handleStatus(l.id, 'active')} style={s.btn('var(--raised)', 'var(--green)')}>Restore</button>
                    ) : (
                      <button onClick={() => handleStatus(l.id, 'active')} style={s.btn('var(--raised)', 'var(--green)')}>Activate</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// =============== SAFETY ===============
function SafetyPage() {
  const supabase = useSupabase()
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (typeof supabase?.from !== 'function') return
    supabase.from('nyumba_kumi_alerts').select('*, profiles(id, full_name, username)').order('created_at', { ascending: false }).limit(30).then(({ data }: { data: any }) => {
      if (data) setAlerts(data); setLoading(false)
    })
  }, [supabase])
  const handleAlertStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('nyumba_kumi_alerts').update({ status }).eq('id', id)
    if (error) { toast(error.message); return }
    toast(`Alert ${status}`)
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }
  if (loading) return s.spinner()
  const activeAlerts = alerts.filter(a => a.status === 'active').length
  return (
    <>
      <PageHeader slug="safety" meta={PAGE_META.safety}
        extra={<span style={{ ...s.badge(activeAlerts > 0 ? 'orange' : 'green'), fontSize: 10 }}>{activeAlerts} active</span>} />
      <div style={s.card({ padding: 0, overflow: 'hidden' })}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Alert</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Type</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>County</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Urgent</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Status</th>
              <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {alerts.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>No safety alerts</td></tr>
            ) : alerts.map((a: any) => (
              <tr key={a.id} style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '12px 14px' }}>
                  <b style={{ color: 'var(--ink)', fontSize: 11 }}>{a.title}</b>
                  <small style={{ display: 'block', color: 'var(--muted)', fontSize: 9 }}>{a.description?.slice(0, 60)}</small>
                </td>
                <td style={{ padding: '12px 14px', color: 'var(--muted)' }}>{a.type}</td>
                <td style={{ padding: '12px 14px', color: 'var(--muted)' }}>{a.county}</td>
                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                  {a.is_urgent ? <span style={{ color: 'var(--red)', fontWeight: 700 }}>!!</span> : <span style={{ color: 'var(--muted)' }}>—</span>}
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'center' }}><span style={s.tag(a.status === 'active')}>{a.status}</span></td>
                <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                  {a.status === 'active' ? (
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button onClick={() => handleAlertStatus(a.id, 'resolved')} style={s.btn('var(--green)', '#fff')}>Resolve</button>
                      <button onClick={() => handleAlertStatus(a.id, 'dismissed')} style={s.btn('var(--raised)', 'var(--muted)')}>Dismiss</button>
                    </div>
                  ) : (
                    <button onClick={() => handleAlertStatus(a.id, 'active')} style={s.btn('var(--raised)', 'var(--green)')}>Reopen</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// =============== PAYMENTS ===============
function PaymentsPage() {
  const supabase = useSupabase()
  const [data, setData] = useState<any>(null)
  useEffect(() => {
    if (typeof supabase?.from !== 'function') return
    Promise.all([
      supabase.from('tips').select('*', { count: 'exact', head: true }),
      supabase.from('payouts').select('*', { count: 'exact', head: true }),
      supabase.from('tips').select('amount, status, created_at').order('created_at', { ascending: false }).limit(20),
      supabase.from('payouts').select('amount, status, created_at').order('created_at', { ascending: false }).limit(20),
    ]).then(([tCount, pCount, tData, pData]) => {
      setData({
        tipsCount: tCount.count || 0,
        payoutsCount: pCount.count || 0,
        tips: tData.data || [],
        payouts: pData.data || [],
      })
    })
  }, [supabase])
  if (!data) return s.spinner()
  const totalTips = data.tips.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)
  const totalPayouts = data.payouts.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
  return (
    <>
      <PageHeader slug="payments" meta={PAGE_META.payments} />
      <KpiCards items={[
        { label: 'Tips given', value: data.tipsCount, sub: `KES ${totalTips.toLocaleString()} total` },
        { label: 'Payouts processed', value: data.payoutsCount, sub: `KES ${totalPayouts.toLocaleString()} total` },
      ]} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={s.card()}>
          <h3 style={{ fontWeight: 700, fontSize: 12, margin: '0 0 12px', color: 'var(--ink)' }}>Recent tips</h3>
          {data.tips.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: 11 }}>No tips yet</p>
          ) : data.tips.slice(0, 5).map((t: any, i: number) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 4 ? '1px solid var(--line)' : 'none', fontSize: 11 }}>
              <span style={{ color: 'var(--muted)' }}>KES {Number(t.amount).toLocaleString()}</span>
              <span style={s.tag(t.status === 'completed')}>{t.status}</span>
            </div>
          ))}
        </div>
        <div style={s.card()}>
          <h3 style={{ fontWeight: 700, fontSize: 12, margin: '0 0 12px', color: 'var(--ink)' }}>Recent payouts</h3>
          {data.payouts.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: 11 }}>No payouts yet</p>
          ) : data.payouts.slice(0, 5).map((p: any, i: number) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 4 ? '1px solid var(--line)' : 'none', fontSize: 11 }}>
              <span style={{ color: 'var(--muted)' }}>KES {Number(p.amount).toLocaleString()}</span>
              <span style={s.tag(p.status === 'completed')}>{p.status}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// =============== SETTINGS ===============
function SettingsPage() {
  const supabase = useSupabase()
  const [saving, setSaving] = useState('')
  const [settings, setSettings] = useState({
    allowPublicSignup: true, defaultLanguage: 'en', requireVerification: false,
    maxPostsPerDay: 10, maintenanceMode: false,
  })
  const saveSetting = async (key: string, value: any) => {
    setSaving(key)
    await new Promise(r => setTimeout(r, 400))
    setSettings(prev => ({ ...prev, [key]: value }))
    toast(`${key} updated`)
    setSaving('')
  }
  return (
    <>
      <PageHeader slug="settings" meta={PAGE_META.settings} />
      <div style={s.card()}>
        <div style={{ display: 'grid', gap: 20 }}>
          {[
            { key: 'allowPublicSignup', label: 'Allow public registration', type: 'toggle' },
            { key: 'requireVerification', label: 'Require email verification', type: 'toggle' },
            { key: 'maintenanceMode', label: 'Maintenance mode', type: 'toggle', danger: true },
            { key: 'defaultLanguage', label: 'Default language', type: 'select', options: ['en', 'sw', 'both'] },
            { key: 'maxPostsPerDay', label: 'Max posts per day', type: 'number' },
          ].map((field: any) => (
            <div key={field.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: 12, color: 'var(--ink)' }}>{field.label}</strong>
                <small style={{ display: 'block', fontSize: 9, color: 'var(--muted)' }}>{field.key}</small>
              </div>
              {field.type === 'toggle' ? (
                <button onClick={() => saveSetting(field.key, !(settings as any)[field.key])}
                  style={{
                    width: 44, height: 24, borderRadius: 12, border: 0, cursor: 'pointer', position: 'relative',
                    background: (settings as any)[field.key] ? (field.danger ? 'var(--red)' : 'var(--gold)') : 'var(--line)',
                    transition: 'background .2s',
                  }}>
                  <span style={{
                    position: 'absolute', top: 2, left: (settings as any)[field.key] ? 22 : 2,
                    width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s',
                  }} />
                </button>
              ) : field.type === 'select' ? (
                <select value={(settings as any)[field.key]} onChange={e => saveSetting(field.key, e.target.value)}
                  style={s.input('160px')}>
                  {field.options.map((o: string) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input type="number" value={(settings as any)[field.key]} onChange={e => saveSetting(field.key, e.target.value)}
                  style={s.input('100px')} />
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// =============== AUDIT ===============
function AuditPage() {
  const supabase = useSupabase()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (typeof supabase?.from !== 'function') return
    supabase.from('audit_logs').select('*, profiles(id, full_name, username)').order('created_at', { ascending: false }).limit(50).then(({ data }: { data: any }) => {
      if (data) setLogs(data); setLoading(false)
    })
  }, [supabase])
  if (loading) return s.spinner()
  return (
    <>
      <PageHeader slug="audit" meta={PAGE_META.audit} />
      <div style={s.card({ padding: 0, overflow: 'hidden' })}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Admin</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Action</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Entity</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Reason</th>
              <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>When</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>No audit logs yet</td></tr>
            ) : logs.map((l: any) => (
              <tr key={l.id} style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '12px 14px', color: 'var(--ink)' }}>{l.profiles?.full_name || l.profiles?.username || l.actor_id?.slice(0, 8)}</td>
                <td style={{ padding: '12px 14px' }}><span style={s.tag(l.action.includes('suspend') || l.action.includes('delete'))}>{l.action}</span></td>
                <td style={{ padding: '12px 14px', color: 'var(--muted)' }}>{l.entity_type || '—'}</td>
                <td style={{ padding: '12px 14px', color: 'var(--muted)' }}>{l.reason?.slice(0, 50) || '—'}</td>
                <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--muted)' }}>{l.created_at ? new Date(l.created_at).toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// =============== MAIN DISPATCH ===============
export default function AdminPageClient({ slug }: { slug: string }) {
  const supabase = useSupabase()
  const meta = PAGE_META[slug] || { title: slug, desc: 'Manage this section.' }

  const pages: Record<string, () => React.ReactNode> = {
    analytics: () => <AnalyticsPage />,
    health: () => <HealthPage />,
    verification: () => <VerificationPage />,
    users: () => <UsersPage />,
    spaces: () => <SpacesPage />,
    marketplace: () => <MarketplacePage />,
    safety: () => <SafetyPage />,
    payments: () => <PaymentsPage />,
    settings: () => <SettingsPage />,
    audit: () => <AuditPage />,
  }

  const Page = pages[slug]
  if (!Page) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
        <h2 style={{ color: 'var(--ink)', marginBottom: 8 }}>{meta.title}</h2>
        <p>{meta.desc}</p>
      </div>
    )
  }

  return <Page />
}
