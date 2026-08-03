'use client'
import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { useSupabase, useUser } from '@/app/providers'

interface Ad {
  id: string
  title: string
  image_url: string | null
  link_url: string
  placement: string
}

export default function FeedAd() {
  const [ad, setAd] = useState<Ad | null>(null)
  const supabase = useSupabase()
  const { user } = useUser()
  const trackedRef = useRef(false)

  useEffect(() => {
    supabase.from('ads').select('*').eq('is_active', true).eq('placement', 'feed')
      .gte('ends_at', new Date().toISOString()).lte('starts_at', new Date().toISOString())
      .order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => { if (data && data.length > 0) setAd(data[0] as Ad) })
  }, [supabase])

  const track = async (type: 'impression' | 'click') => {
    if (!ad) return
    try {
      const { error: insertErr } = await supabase.from('ad_impressions').insert({ ad_id: ad.id, user_id: user?.id || null, type })
      if (insertErr) return
      if (type === 'impression') {
        const current = ((ad as any).impressions || 0) + 1
        await supabase.from('ads').update({ impressions: current }).eq('id', ad.id)
      }
    } catch { /* tracking errors are non-critical */ }
  }

  useEffect(() => {
    if (ad && !trackedRef.current) { trackedRef.current = true; track('impression') }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ad])

  if (!ad) return null

  return (
    <a href={ad.link_url} target="_blank" rel="noopener noreferrer" onClick={() => track('click')}
      className="block rounded-2xl overflow-hidden mb-4 no-underline transition-transform hover:scale-[1.01]"
      style={{ border: '1px solid var(--line)', background: 'var(--surface)' }}>
      {ad.image_url && <Image src={ad.image_url} alt="" width={640} height={140} className="w-full h-[140px] object-cover" loading="lazy" />}
      <div className="p-3 flex items-center gap-2">
        <div className="flex-1">
          <strong className="text-sm block" style={{ color: 'var(--ink)' }}>{ad.title}</strong>
          <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--gold)' }}>Sponsored</span>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--muted)' }}>
          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      </div>
    </a>
  )
}
