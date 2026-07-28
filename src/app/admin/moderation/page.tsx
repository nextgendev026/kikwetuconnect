'use client'
import { useEffect, useState } from 'react'
import { useSupabase, toast } from '@/app/providers'

export default function ModerationPage() {
  const supabase = useSupabase()
  const [reports, setReports] = useState<any[]>([])
  const [filter, setFilter] = useState('pending')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReports()
  }, [filter])

  const loadReports = async () => {
    setLoading(true)
    const { data } = await supabase.from('moderation').select('*, profiles:reporter_id (full_name, username)').eq('status', filter).order('created_at', { ascending: false })
    if (data) setReports(data)
    setLoading(false)
  }

  const handleAction = async (id: string, action: string) => {
    await supabase.from('moderation').update({ status: action === 'resolve' ? 'resolved' : 'dismissed', resolved_at: new Date().toISOString() } as any).eq('id', id)
    toast(`Report ${action === 'resolve' ? 'resolved' : 'dismissed'}`)
    loadReports()
  }

  return (
    <>
      <h1 className="text-[28px] font-bold mb-[8px]" style={{ fontFamily: "'Plus Jakarta Sans'", letterSpacing: '-.07em' }}>Moderation Queue</h1>
      <p className="text-[13px] text-[oklch(65%_.028_151)] mb-[24px]">Review flagged content and community reports</p>
      <div className="flex gap-[10px] mb-[20px] overflow-auto">
        {['pending', 'reviewed', 'resolved', 'dismissed'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-[14px] py-[8px] rounded-[99px] text-[11px] font-bold capitalize ${filter === s ? 'bg-gold text-night' : 'bg-[oklch(21%_.03_151)] text-[oklch(65%_.028_151)]'}`}>{s}</button>
        ))}
      </div>
      {loading ? <div className="flex justify-center py-[40px]"><div className="animate-spin w-8 h-8 border-2 border-gold border-t-transparent rounded-full" /></div> : reports.length === 0 ? (
        <div className="text-center py-[40px] text-[oklch(65%_.028_151)]">No {filter} reports</div>
      ) : (
        <div className="space-y-[10px]">
          {reports.map(r => (
            <div key={r.id} className="bg-[oklch(18%_.028_151)] border border-[oklch(29%_.025_151)] rounded-[16px] p-[16px]">
              <div className="flex items-start justify-between gap-[10px]">
                <div>
                  <div className="flex items-center gap-[8px] mb-[6px]">
                    <span className="px-[8px] py-[3px] rounded-[99px] bg-[oklch(25%_.06_28)] text-red text-[10px] font-bold capitalize">{r.target_type}</span>
                    <span className="text-[11px] text-[oklch(65%_.028_151)]">Reported by @{r.profiles?.username || 'unknown'}</span>
                  </div>
                  <p className="text-[13px] mb-[4px]">{r.reason}</p>
                  {r.evidence && <p className="text-[11px] text-[oklch(65%_.028_151)]">Evidence: {r.evidence}</p>}
                </div>
                {r.status === 'pending' && (
                  <div className="flex gap-[6px] flex-shrink-0">
                    <button onClick={() => handleAction(r.id, 'resolve')} className="px-[10px] py-[6px] rounded-[8px] bg-green text-night text-[10px] font-bold">Resolve</button>
                    <button onClick={() => handleAction(r.id, 'dismiss')} className="px-[10px] py-[6px] rounded-[8px] bg-[oklch(25%_.03_151)] text-[oklch(65%_.028_151)] text-[10px] font-bold">Dismiss</button>
                  </div>
                )}
              </div>
              <div className="text-[10px] text-[oklch(65%_.028_151)] mt-[8px]">{new Date(r.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
