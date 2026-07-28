'use client'
import { useEffect, useState } from 'react'
import { useSupabase, toast } from '@/app/providers'

export default function AdminModeration() {
  const supabase = useSupabase()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('review')
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.from('moderation')
      .select('id, target_type, target_id, reason, status, created_at, reporter_id')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }: { data: any }) => {
        setItems(data || [])
        setLoading(false)
      })
  }, [supabase])

  const filtered = items.filter(item =>
    !search || item.target_type?.toLowerCase().includes(search.toLowerCase()) || item.reason?.toLowerCase().includes(search.toLowerCase())
  )

  const statusStyle = (s: string) => {
    if (s === 'high' || s === 'High') return { background: 'var(--red-soft)', color: 'var(--red)' }
    if (s === 'medium' || s === 'Medium') return { background: 'oklch(90% .07 84)', color: 'oklch(47% .12 84)' }
    return { background: 'var(--green-soft)', color: 'var(--green)' }
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 20, marginBottom: 26 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--green)', fontWeight: 800 }}>Moderation</div>
          <h1 style={{ fontWeight: 800, fontSize: 'clamp(2rem,4vw,3rem)', lineHeight: 1, letterSpacing: '-.07em', margin: '8px 0 0', color: 'var(--ink)' }}>Protect the circle, fairly.</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55, margin: '10px 0 0', maxWidth: '60ch' }}>Review reports, misinformation, scams, hate speech, unsafe content, and appeals.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 15, flexWrap: 'wrap' }}>
        {['review', 'assigned', 'resolved', 'escalated'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              border: '1px solid var(--line)', background: tab === t ? 'var(--gold)' : 'var(--raised)',
              borderColor: tab === t ? 'var(--gold)' : 'var(--line)', borderRadius: 99, padding: '8px 10px',
              color: tab === t ? 'var(--night)' : 'var(--muted)', fontSize: 10, fontWeight: tab === t ? 700 : 400,
              cursor: 'pointer'
            }}>
            {t === 'review' ? 'Needs review' : t === 'assigned' ? 'Assigned to me' : t === 'resolved' ? 'Resolved' : 'Escalated'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <input placeholder="Search queue..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 180, height: 40, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: '0 11px', fontSize: 11, color: 'var(--ink)' }} />
        <select style={{ height: 40, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: '0 11px', fontSize: 11, color: 'var(--ink)' }}>
          <option>All priority</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
        <button onClick={() => toast('Report export queued')} style={{ minHeight: 40, borderRadius: 10, padding: '0 14px', background: 'var(--raised)', border: '1px solid var(--line)', color: 'var(--ink)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Export</button>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 17 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                <th style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Entity</th>
                <th style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Submitted by</th>
                <th style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Created</th>
                <th style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Priority</th>
                <th style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Assignee</th>
                <th style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>No items found</td></tr>
              ) : filtered.map((item: any) => (
                <tr key={item.id}>
                  <td style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)' }}>
                    <b style={{ color: 'var(--ink)' }}>{item.target_type || '—'}</b>
                    <small style={{ display: 'block', color: 'var(--muted)', fontSize: 9, marginTop: 3 }}>{item.reason?.slice(0, 50) || '—'}</small>
                  </td>
                  <td style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)', color: 'var(--muted)' }}>{item.reporter_id?.slice(0, 8) || '—'}</td>
                  <td style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)', color: 'var(--muted)' }}>
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() + ' ' + new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)' }}>
                    <span style={{ ...statusStyle(item.status), display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 99, padding: '5px 8px', fontSize: 9, fontWeight: 700 }}>
                      {item.status || 'Open'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)', color: 'var(--muted)' }}>—</td>
                  <td style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)' }}>
                    <button onClick={() => toast('Review panel opened for ' + item.id)} style={{ height: 30, padding: '0 9px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--raised)', fontSize: 10, cursor: 'pointer', color: 'var(--ink)' }}>Open</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
