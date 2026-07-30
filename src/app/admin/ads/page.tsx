'use client'
import { useEffect, useState } from 'react'
import { useSupabase, toast } from '@/app/providers'

interface Ad {
  id: string; title: string; image_url: string | null; link_url: string
  placement: string; is_active: boolean; impressions: number; clicks: number
  starts_at: string; ends_at: string | null; created_at: string
}

const PLACEMENTS = ['sidebar', 'feed', 'banner', 'spaces']

export default function AdminAds() {
  const supabase = useSupabase()
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Ad | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', link_url: '', image_url: '', placement: 'sidebar', is_active: true })

  useEffect(() => {
    supabase.from('ads').select('*').order('created_at', { ascending: false }).then(({ data }: { data: Ad[] | null }) => {
      if (data) setAds(data); setLoading(false)
    })
  }, [supabase])

  const resetForm = () => { setForm({ title: '', link_url: '', image_url: '', placement: 'sidebar', is_active: true }); setEditing(null) }

  const handleSave = async () => {
    if (!form.title.trim() || !form.link_url.trim()) { toast('Title and URL required'); return }
    const payload = { title: form.title, link_url: form.link_url, image_url: form.image_url || null, placement: form.placement, is_active: form.is_active }
    if (editing) {
      const { error } = await supabase.from('ads').update(payload).eq('id', editing.id)
      if (error) { toast(error.message); return }
      toast('Ad updated')
    } else {
      const { error } = await supabase.from('ads').insert(payload)
      if (error) { toast(error.message); return }
      toast('Ad created')
    }
    resetForm(); setShowForm(false)
    const { data }: { data: Ad[] | null } = await supabase.from('ads').select('*').order('created_at', { ascending: false })
    if (data) setAds(data)
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('ads').delete().eq('id', id)
    if (error) { toast(error.message); return }
    toast('Ad deleted'); setAds(prev => prev.filter(a => a.id !== id))
  }

  const handleToggle = async (ad: Ad) => {
    const { error } = await supabase.from('ads').update({ is_active: !ad.is_active }).eq('id', ad.id)
    if (error) { toast(error.message); return }
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, is_active: !a.is_active } : a))
    toast(ad.is_active ? 'Ad deactivated' : 'Ad activated')
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div style={{ width: 32, height: 32, border: '3px solid var(--gold)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .6s linear infinite' }} /></div>

  const s = {
    card: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 16 },
    input: (w = '100%') => ({ width: w, background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: 9, padding: '8px 12px', fontSize: 12, color: 'var(--ink)', outline: 'none' } as const),
    label: { fontSize: 10, color: 'var(--muted)', marginBottom: 5, display: 'block' } as const,
    btn: (bg = 'var(--gold)', c = 'var(--night)') => ({ minHeight: 36, borderRadius: 9, padding: '0 14px', background: bg, color: c, fontSize: 11, fontWeight: 700, border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 } as const),
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 800 }}>Advertising</div>
          <h1 style={{ fontWeight: 800, fontSize: 'clamp(1.6rem,3vw,2.4rem)', lineHeight: 1, letterSpacing: '-.06em', margin: '6px 0 0', color: 'var(--ink)' }}>Ads manager</h1>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '6px 0 0' }}>{ads.length} ad{ads.length !== 1 ? 's' : ''} &middot; {ads.filter(a => a.is_active).length} active</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }} style={s.btn()}>+ New ad</button>
      </div>

      {showForm && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false) }} style={{ position: 'fixed', inset: 0, background: 'var(--night) / .6', zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 24, width: 'min(460px, 94%)', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontWeight: 800, fontSize: 18, color: 'var(--ink)', margin: 0 }}>{editing ? 'Edit ad' : 'New ad'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 0, color: 'var(--muted)', fontSize: 22, cursor: 'pointer' }}>&times;</button>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={s.label}>Title *</label>
                <input style={s.input()} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. M-Kopa Solar" />
              </div>
              <div>
                <label style={s.label}>Link URL *</label>
                <input style={s.input()} value={form.link_url} onChange={e => setForm(p => ({ ...p, link_url: e.target.value }))} placeholder="https://example.com" />
              </div>
              <div>
                <label style={s.label}>Image URL</label>
                <input style={s.input()} value={form.image_url} onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))} placeholder="https://example.com/ad.png" />
              </div>
              <div>
                <label style={s.label}>Placement</label>
                <select style={s.input()} value={form.placement} onChange={e => setForm(p => ({ ...p, placement: e.target.value }))}>
                  {PLACEMENTS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="active" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} />
                <label htmlFor="active" style={{ fontSize: 11, color: 'var(--ink)' }}>Active</label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
              <button onClick={() => setShowForm(false)} style={s.btn('var(--raised)', 'var(--ink)')}>Cancel</button>
              <button onClick={handleSave} style={s.btn()}>{editing ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Title</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Placement</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Impressions</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Clicks</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Status</th>
              <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {ads.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No ads yet. Create your first one.</td></tr>
            ) : ads.map(ad => (
              <tr key={ad.id} style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '12px 14px', color: 'var(--ink)', fontWeight: 600 }}>{ad.title}</td>
                <td style={{ padding: '12px 14px', color: 'var(--muted)' }}><span style={{ background: 'var(--raised)', padding: '3px 8px', borderRadius: 6, fontSize: 9 }}>{ad.placement}</span></td>
                <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--muted)' }}>{ad.impressions}</td>
                <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--muted)' }}>{ad.clicks}</td>
                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                  <button onClick={() => handleToggle(ad)} style={{
                    padding: '4px 10px', borderRadius: 99, fontSize: 9, fontWeight: 700, border: 0, cursor: 'pointer',
                    background: ad.is_active ? 'var(--green-soft)' : 'var(--raised)',
                    color: ad.is_active ? 'var(--green)' : 'var(--muted)',
                  }}>{ad.is_active ? 'Active' : 'Inactive'}</button>
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <button onClick={() => { setEditing(ad); setForm({ title: ad.title, link_url: ad.link_url, image_url: ad.image_url || '', placement: ad.placement, is_active: ad.is_active }); setShowForm(true) }}
                      style={{ height: 30, padding: '0 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--raised)', cursor: 'pointer', color: 'var(--ink)', fontSize: 10 }}>Edit</button>
                    <button onClick={() => handleDelete(ad.id)}
                      style={{ height: 30, padding: '0 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--raised)', cursor: 'pointer', color: 'var(--red)', fontSize: 10 }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
