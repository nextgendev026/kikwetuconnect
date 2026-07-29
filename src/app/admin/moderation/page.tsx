'use client'
import { useEffect, useState } from 'react'
import { useSupabase, toast } from '@/app/providers'
import { useUser } from '@/app/providers'

export default function AdminModeration() {
  const supabase = useSupabase()
  const { profile } = useUser()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState('')

  const fetchItems = () => {
    supabase.from('moderation_queue')
      .select('id, target_type, target_id, reason, status, created_at, reporter_id')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }: { data: any }) => {
        setItems(data || [])
        setLoading(false)
      })
  }

  useEffect(() => { fetchItems() }, [supabase])

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(i => i.id)))
  }

  const act = async (id: string, status: string) => {
    const { error } = await supabase.rpc('admin_moderate_item', {
      p_admin_id: profile?.id,
      p_item_id: id,
      p_status: status,
      p_notes: notes || null,
    })
    if (error) { toast(error.message); return }
    toast(`Item ${status}`)
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
    setNotes('')
    fetchItems()
  }

  const bulkAct = async (status: string) => {
    const ids = Array.from(selected)
    if (ids.length === 0) { toast('Select items first'); return }
    const { error } = await supabase.rpc('admin_bulk_moderate', {
      p_admin_id: profile?.id,
      p_item_ids: ids,
      p_status: status,
      p_notes: notes || null,
    })
    if (error) { toast(error.message); return }
    toast(`${ids.length} items ${status}`)
    setSelected(new Set())
    setNotes('')
    fetchItems()
  }

  const filtered = items.filter(item =>
    !search || item.target_type?.toLowerCase().includes(search.toLowerCase()) || item.reason?.toLowerCase().includes(search.toLowerCase())
  )

  const statusBadge = (s: string) => {
    const colors: Record<string, { bg: string, c: string }> = {
      pending: { bg: 'var(--orange-soft)', c: 'var(--orange)' },
      reviewed: { bg: 'var(--blue-soft)', c: 'var(--blue)' },
      dismissed: { bg: 'var(--green-soft)', c: 'var(--green)' },
      action_taken: { bg: 'var(--red-soft)', c: 'var(--red)' },
    }
    const style = colors[s] || { bg: 'var(--line)', c: 'var(--muted)' }
    return <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 99, padding: '5px 8px', fontSize: 9, fontWeight: 700, background: style.bg, color: style.c }}>{s || 'pending'}</span>
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 20, marginBottom: 26 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--green)', fontWeight: 800 }}>Moderation</div>
          <h1 style={{ fontWeight: 800, fontSize: 'clamp(2rem,4vw,3rem)', lineHeight: 1, letterSpacing: '-.07em', margin: '8px 0 0', color: 'var(--ink)' }}>Protect the circle, fairly.</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55, margin: '10px 0 0', maxWidth: '60ch' }}>Review reports, misinformation, scams, unsafe content, and appeals.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <input placeholder="Search queue..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 180, height: 40, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: '0 11px', fontSize: 11, color: 'var(--ink)' }} />
      </div>

      {selected.size > 0 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, padding: 12, background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: 12 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{selected.size} selected</span>
          <input placeholder="Notes (optional)..." value={notes} onChange={e => setNotes(e.target.value)}
            style={{ flex: 1, height: 36, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, padding: '0 10px', fontSize: 11, color: 'var(--ink)' }} />
          <button onClick={() => bulkAct('dismissed')} style={{ height: 36, padding: '0 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 10, cursor: 'pointer', color: 'var(--green)' }}>Dismiss</button>
          <button onClick={() => bulkAct('action_taken')} style={{ height: 36, padding: '0 12px', borderRadius: 8, border: 0, background: 'var(--red)', color: '#fff', fontSize: 10, cursor: 'pointer' }}>Take action</button>
          <button onClick={() => bulkAct('reviewed')} style={{ height: 36, padding: '0 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 10, cursor: 'pointer', color: 'var(--ink)' }}>Mark reviewed</button>
        </div>
      )}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 17 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                <th style={{ width: 32, padding: '12px 8px', borderBottom: '1px solid var(--line)' }}>
                  <input type="checkbox" onChange={toggleAll} checked={selected.size === filtered.length && filtered.length > 0} style={{ accentColor: 'var(--gold)' }} />
                </th>
                <th style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Entity</th>
                <th style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Reason</th>
                <th style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Reporter</th>
                <th style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Created</th>
                <th style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Status</th>
                <th style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>No items found</td></tr>
              ) : filtered.map((item: any) => (
                <tr key={item.id} style={{ opacity: item.status !== 'pending' ? 0.5 : 1 }}>
                  <td style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)' }}>
                    <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} style={{ accentColor: 'var(--gold)' }} />
                  </td>
                  <td style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)' }}>
                    <b style={{ color: 'var(--ink)' }}>{item.target_type || '—'}</b>
                    <small style={{ display: 'block', color: 'var(--muted)', fontSize: 9, marginTop: 3 }}>ID: {item.target_id?.slice(0, 8)}</small>
                  </td>
                  <td style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)', color: 'var(--ink)', maxWidth: 200 }}>
                    <span style={{ fontSize: 10 }}>{item.reason || '—'}</span>
                  </td>
                  <td style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)', color: 'var(--muted)' }}>{item.reporter_id?.slice(0, 8) || '—'}</td>
                  <td style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() + ' ' + new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)' }}>
                    {statusBadge(item.status)}
                  </td>
                  <td style={{ padding: '12px 8px', borderBottom: '1px solid var(--line)' }}>
                    {item.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => act(item.id, 'dismissed')} style={{ height: 28, padding: '0 8px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--raised)', fontSize: 9, cursor: 'pointer', color: 'var(--green)' }}>Dismiss</button>
                        <button onClick={() => act(item.id, 'action_taken')} style={{ height: 28, padding: '0 8px', borderRadius: 6, border: 0, background: 'var(--red)', color: '#fff', fontSize: 9, cursor: 'pointer' }}>Action</button>
                        <button onClick={() => act(item.id, 'reviewed')} style={{ height: 28, padding: '0 8px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--raised)', fontSize: 9, cursor: 'pointer', color: 'var(--ink)' }}>Review</button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 9, color: 'var(--muted)' }}>—</span>
                    )}
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
