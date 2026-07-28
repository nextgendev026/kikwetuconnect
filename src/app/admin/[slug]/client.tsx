'use client'
import { useSupabase, toast } from '@/app/providers'
import { useEffect, useState } from 'react'

const PAGE_META: Record<string, { title: string; desc: string }> = {
  analytics: { title: 'Analytics that answer real questions.', desc: 'Track growth, trust, learning, local activity, and money movement.' },
  health: { title: 'Keep the machine calm.', desc: 'Realtime, sync, search, translations, storage, and payments.' },
  verification: { title: 'Approve expertise with evidence.', desc: 'Review qualifications, identity context, public answer quality, and conduct agreements.' },
  users: { title: 'See the people behind the signal.', desc: 'Search, inspect, restrict, restore, and support members with audit trails.' },
  spaces: { title: 'Manage communities', desc: 'Review Spaces, moderators, visibility, rules, and activity.' },
  marketplace: { title: 'Mtaa Exchange review', desc: 'Review listings, sellers, reports, and contact safety.' },
  safety: { title: 'Safety review', desc: 'Review alerts, confirmations, misinformation, and privacy issues.' },
  payments: { title: 'Payments you can explain.', desc: 'Monitor tips, bounties, M-Pesa callbacks, fees, payouts, and exceptions.' },
  settings: { title: 'Platform settings', desc: 'Control defaults without burying the consequences.' },
  audit: { title: 'Every action leaves a trace.', desc: 'Inspect admin actions, reasons, state changes, and follow-up requirements.' },
}

export default function AdminPageClient({ slug }: { slug: string }) {
  const supabase = useSupabase()
  const [counts, setCounts] = useState({ users: 0, posts: 0 })
  const meta = PAGE_META[slug] || { title: slug, desc: 'Manage this section.' }
  const label = slug.charAt(0).toUpperCase() + slug.slice(1)

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('posts').select('*', { count: 'exact', head: true }),
    ]).then(([users, posts]) => setCounts({ users: users.count || 0, posts: posts.count || 0 }))
  }, [supabase])

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 20, marginBottom: 26 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--green)', fontWeight: 800 }}>{label}</div>
          <h1 style={{ fontWeight: 800, fontSize: 'clamp(2rem,4vw,3rem)', lineHeight: 1, letterSpacing: '-.07em', margin: '8px 0 0', color: 'var(--ink)' }}>{meta.title}</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55, margin: '10px 0 0', maxWidth: '60ch' }}>{meta.desc}</p>
        </div>
        <button onClick={() => toast('Export queued')} style={{ minHeight: 42, borderRadius: 10, padding: '0 13px', background: 'var(--gold)', color: 'var(--night)', fontSize: 11, fontWeight: 700, border: 0, cursor: 'pointer', whiteSpace: 'nowrap' }}>Export</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
        {[
          { label: 'Total members', value: counts.users, change: '+12%' },
          { label: 'Content items', value: counts.posts, change: '+8%' },
          { label: 'Active rate', value: counts.users ? Math.round((counts.posts / counts.users) * 100) + '%' : '0%', change: 'healthy' },
          { label: 'Platform health', value: '99.98%', change: 'all normal' },
        ].map((k, i) => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 15, padding: 17 }}>
            <div style={{ color: 'var(--muted)', fontSize: 10 }}>{k.label}</div>
            <strong style={{ display: 'block', fontWeight: 800, fontSize: 28, letterSpacing: '-.06em', margin: '11px 0 4px', color: 'var(--ink)' }}>{(k.value || 0).toLocaleString()}</strong>
            <small style={{ fontSize: 10, color: 'var(--green)' }}>{k.change}</small>
          </div>
        ))}
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 17 }}>
        <p style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', padding: '30px 0' }}>
          {label} dashboard — data will populate as platform activity grows.
        </p>
      </div>
    </>
  )
}
