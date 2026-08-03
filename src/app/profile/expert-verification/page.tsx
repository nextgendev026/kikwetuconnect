'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSupabase, useUser, toast } from '@/app/providers'
import { ArrowLeft, Shield, Send, Clock, CheckCircle, XCircle, Loader2, Briefcase } from 'lucide-react'

const s = {
  card: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20, boxShadow: 'var(--card-shadow)' },
  input: { width: '100%', background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: 11, padding: '10px 14px', fontSize: 13, color: 'var(--ink)', outline: 'none' },
  select: { width: '100%', background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: 11, padding: '10px 14px', fontSize: 13, color: 'var(--ink)', outline: 'none' },
  btn: { padding: '10px 20px', borderRadius: 11, fontWeight: 700, fontSize: 13, border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 },
  primaryBtn: { background: 'var(--gold)', color: 'var(--night)' },
}

interface Application {
  id: string
  category_id: string | null
  title: string
  qualifications: string
  experience: string
  certification_urls: string[] | null
  status: string
  admin_notes: string | null
  created_at: string
  categories?: { name: string; icon: string } | null
}

interface ExpertCategory { id: string; name: string; description: string; icon: string }

export default function ExpertVerificationPage() {
  const { profile, loading: userLoading } = useUser()
  const supabase = useSupabase()
  const router = useRouter()
  const [application, setApplication] = useState<Application | null>(null)
  const [categories, setCategories] = useState<ExpertCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryId, setCategoryId] = useState('')
  const [title, setTitle] = useState('')
  const [qualifications, setQualifications] = useState('')
  const [experience, setExperience] = useState('')
  const [certs, setCerts] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (userLoading) return
    if (!profile) return router.push('/login')
    fetchApplication()
    fetchCategories()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoading, profile])

  const fetchApplication = async () => {
    try {
      const { data } = await supabase.from('expert_applications')
        .select('*, categories:category_id (name, icon)')
        .eq('user_id', profile!.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      setApplication(data as unknown as Application | null)
    } catch {} finally { setLoading(false) }
  }

  const fetchCategories = async () => {
    const { data } = await supabase.from('expertise_categories').select('*').order('name')
    if (data) setCategories(data as ExpertCategory[])
  }

  const handleSubmit = async () => {
    if (!categoryId) return toast('Select an expertise category')
    if (!title.trim()) return toast('Enter your expert title')
    if (!qualifications.trim()) return toast('Tell us about your qualifications')
    if (!experience.trim()) return toast('Describe your experience')
    setSubmitting(true)
    try {
      const { error } = await supabase.from('expert_applications').insert({
        user_id: profile!.id,
        category_id: categoryId,
        title: title.trim(),
        qualifications: qualifications.trim(),
        experience: experience.trim(),
        certification_urls: certs.trim() ? [certs.trim()] : null,
        status: 'pending',
      })
      if (error) throw error
      toast('Application submitted for review')
      setCategoryId(''); setTitle(''); setQualifications(''); setExperience(''); setCerts('')
      fetchApplication()
    } catch (e: any) { toast(e.message || 'Failed to submit') }
    finally { setSubmitting(false) }
  }

  if (loading || userLoading) return <div className="flex items-center justify-center min-h-[80vh]"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--green)' }} /></div>

  const isVerified = profile?.is_expert || profile?.is_verified_expert
  const status = application?.status

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
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--green)' }} />
            <p className="font-bold text-sm mb-1" style={{ color: 'var(--ink)' }}>You're a Verified Expert!</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Your profile is listed in the experts directory.</p>
            <Link href="/experts" className="inline-flex items-center gap-2 text-xs font-semibold mt-3" style={{ color: 'var(--green)' }}>
              <Briefcase className="w-4 h-4" /> View experts directory
            </Link>
          </div>
        ) : application ? (
          <div style={{ padding: 16, borderRadius: 12, background: status === 'pending' ? 'color-mix(in oklab, var(--gold) 10%, transparent)' : status === 'declined' ? 'color-mix(in oklab, var(--red) 10%, transparent)' : 'color-mix(in oklab, var(--green) 10%, transparent)', border: '1px solid var(--line)' }}>
            <div className="flex items-center gap-2 mb-2">
              {status === 'pending' ? <Clock className="w-4 h-4" style={{ color: 'var(--gold)' }} /> : status === 'declined' ? <XCircle className="w-4 h-4" style={{ color: 'var(--red)' }} /> : <CheckCircle className="w-4 h-4" style={{ color: 'var(--green)' }} />}
              <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                Application {status === 'pending' ? 'Pending Review' : status === 'declined' ? 'Declined' : 'Approved'}
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Submitted {new Date(application.created_at).toLocaleDateString()}</p>
            {application.title && <p className="text-xs mt-1" style={{ color: 'var(--ink)' }}>Title: {application.title}</p>}
            {application.categories?.name && <p className="text-xs" style={{ color: 'var(--muted)' }}>{application.categories.icon} {application.categories.name}</p>}
            {application.admin_notes && <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>Review notes: {application.admin_notes}</p>}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>Expertise Category</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} style={s.select}>
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>Expert Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} style={s.input} placeholder="e.g. Senior Agronomist, Software Engineer" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>Qualifications</label>
              <textarea value={qualifications} onChange={e => setQualifications(e.target.value)} rows={3}
                placeholder="Degrees, certifications, training..." style={{ ...s.input, resize: 'none' }} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>Experience</label>
              <textarea value={experience} onChange={e => setExperience(e.target.value)} rows={3}
                placeholder="Years of experience, notable work, clients..." style={{ ...s.input, resize: 'none' }} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>Certification URL (optional)</label>
              <input value={certs} onChange={e => setCerts(e.target.value)} style={s.input} placeholder="https://..." />
            </div>
            <button onClick={handleSubmit} disabled={submitting}
              style={{ ...s.btn, ...s.primaryBtn, opacity: submitting ? 0.5 : 1 }}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit Application
            </button>
            <p className="text-[10px]" style={{ color: 'var(--muted)' }}>Applications are reviewed by admins. Approved experts get a verified badge and appear in the experts directory. You can also earn the badge automatically through consistent usage.</p>
          </div>
        )}
      </div>
    </div>
  )
}
