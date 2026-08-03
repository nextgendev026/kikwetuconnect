'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSupabase, useUser, toast } from '@/app/providers'
import { ArrowLeft, Shield, Send, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'

const s = {
  card: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20, boxShadow: 'var(--card-shadow)' },
  input: { width: '100%', background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: 11, padding: '10px 14px', fontSize: 13, color: 'var(--ink)', outline: 'none' },
  btn: { padding: '10px 20px', borderRadius: 11, fontWeight: 700, fontSize: 13, border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 },
  primaryBtn: { background: 'var(--gold)', color: 'var(--night)' },
}

export default function ExpertVerificationPage() {
  const { profile, loading: userLoading } = useUser()
  const supabase = useSupabase()
  const router = useRouter()
  const [application, setApplication] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [qualifications, setQualifications] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (userLoading) return
    if (!profile) return router.push('/login')
    fetchApplication()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoading, profile])

  const fetchApplication = async () => {
    try {
      const { data } = await supabase.from('expert_applications')
        .select('*').eq('user_id', profile!.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      setApplication(data)
    } catch {} finally { setLoading(false) }
  }

  const handleSubmit = async () => {
    if (!qualifications.trim()) return toast('Tell us about your qualifications')
    setSubmitting(true)
    try {
      const { error } = await supabase.from('expert_applications').insert({
        user_id: profile!.id, qualifications: qualifications.trim(), status: 'pending',
      })
      if (error) throw error
      toast('Application submitted for review')
      setQualifications('')
      fetchApplication()
    } catch (e: any) { toast(e.message || 'Failed to submit') }
    finally { setSubmitting(false) }
  }

  if (loading || userLoading) return <div className="flex items-center justify-center min-h-[80vh]"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--green)' }} /></div>

  const isVerified = profile?.is_expert || profile?.is_verified_expert

  return (
    <div className="pb-8 animate-fade-in-up" style={{ maxWidth: 600 }}>
      <button onClick={() => router.push('/profile')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 11, fontSize: 12, background: 'var(--raised)', color: 'var(--ink)', border: '1px solid var(--line)', cursor: 'pointer', marginBottom: 16 }}>
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Profile
      </button>

      <div style={s.card} className="mb-5">
        <div className="flex items-center gap-3 mb-4">
          <div style={{ width: 40, height: 40, borderRadius: 12, background: isVerified ? 'var(--green)' : 'var(--raised)', display: 'grid', placeItems: 'center' }}>
            {isVerified ? <CheckCircle className="w-5 h-5 text-white" /> : <Shield className="w-5 h-5" style={{ color: 'var(--muted)' }} />}
          </div>
          <div><h1 className="font-bold text-sm" style={{ color: 'var(--ink)' }}>Expert Verification</h1><p className="text-xs" style={{ color: 'var(--muted)' }}>Get verified and appear in the experts directory</p></div>
        </div>

        {isVerified ? (
          <div style={s.card} className="text-center py-6">
            <CheckCircle className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--green)' }} />
            <p className="font-bold text-sm mb-1" style={{ color: 'var(--ink)' }}>You're a Verified Expert!</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Your profile is listed in the experts directory.</p>
          </div>
        ) : application ? (
          <div style={{ padding: 16, borderRadius: 12, background: application.status === 'pending' ? 'color-mix(in oklab, var(--gold) 10%, transparent)' : application.status === 'rejected' ? 'color-mix(in oklab, var(--red) 10%, transparent)' : 'color-mix(in oklab, var(--green) 10%, transparent)', border: '1px solid var(--line)' }}>
            <div className="flex items-center gap-2 mb-2">
              {application.status === 'pending' ? <Clock className="w-4 h-4" style={{ color: 'var(--gold)' }} /> : application.status === 'rejected' ? <XCircle className="w-4 h-4" style={{ color: 'var(--red)' }} /> : <CheckCircle className="w-4 h-4" style={{ color: 'var(--green)' }} />}
              <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Application {application.status}</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Submitted {new Date(application.created_at).toLocaleDateString()}</p>
            {application.review_notes && <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>Review notes: {application.review_notes}</p>}
          </div>
        ) : (
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>Qualifications & Expertise</label>
            <textarea value={qualifications} onChange={e => setQualifications(e.target.value)} rows={4}
              placeholder="Describe your qualifications, experience, and areas of expertise..."
              style={{ ...s.input, resize: 'none' }} className="!mb-4" />
            <button onClick={handleSubmit} disabled={submitting || !qualifications.trim()}
              style={{ ...s.btn, ...s.primaryBtn, opacity: (submitting || !qualifications.trim()) ? 0.5 : 1 }}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit Application
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
