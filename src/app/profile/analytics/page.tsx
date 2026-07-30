'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase, useUser } from '@/app/providers'
import { ArrowLeft, TrendingUp, ThumbsUp, MessageSquare, Eye, Award, Loader2 } from 'lucide-react'

const s = {
  card: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20, boxShadow: 'var(--card-shadow)' },
}

export default function AnalyticsPage() {
  const { profile, loading: userLoading } = useUser()
  const supabase = useSupabase()
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userLoading) return
    if (!profile) return router.push('/login')
    fetchStats()
  }, [userLoading, profile])

  const fetchStats = async () => {
    try {
      const [posts, answers, upvotes, saved, heshimaEarnings] = await Promise.all([
        supabase.from('posts').select('id, post_type, upvotes_count, answers_count, created_at').eq('user_id', profile!.id).order('created_at', { ascending: false }),
        supabase.from('answers').select('id, upvotes_count').eq('user_id', profile!.id),
        supabase.from('votes').select('id, vote_type, target_type').eq('user_id', profile!.id),
        supabase.from('saves').select('id').eq('user_id', profile!.id),
        supabase.from('heshima_earnings').select('amount, created_at').eq('user_id', profile!.id).order('created_at', { ascending: false }),
      ])
      setStats({
        totalPosts: posts.data?.length || 0,
        totalAnswers: answers.data?.length || 0,
        totalUpvotesGiven: upvotes.data?.filter((v: any) => v.vote_type === 1).length || 0,
        totalSaved: saved.data?.length || 0,
        postUpvotes: posts.data?.reduce((s: number, p: any) => s + (p.upvotes_count || 0), 0) || 0,
        answerUpvotes: answers.data?.reduce((s: number, a: any) => s + (a.upvotes_count || 0), 0) || 0,
        totalHeshima: heshimaEarnings.data?.reduce((s: number, e: any) => s + (e.amount > 0 ? e.amount : 0), 0) || 0,
      })
    } catch {} finally { setLoading(false) }
  }

  if (loading || userLoading) return <div className="flex items-center justify-center min-h-[80vh]"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--green)' }} /></div>

  const metrics = [
    { icon: TrendingUp, label: 'Posts Created', value: stats?.totalPosts || 0, color: 'var(--green)' },
    { icon: MessageSquare, label: 'Answers Written', value: stats?.totalAnswers || 0, color: 'var(--blue)' },
    { icon: ThumbsUp, label: 'Upvotes Received', value: (stats?.postUpvotes || 0) + (stats?.answerUpvotes || 0), color: 'var(--gold)' },
    { icon: Eye, label: 'Upvotes Given', value: stats?.totalUpvotesGiven || 0, color: 'var(--purple)' },
    { icon: Award, label: 'Heshima Earned', value: stats?.totalHeshima || 0, color: 'var(--green)' },
    { icon: TrendingUp, label: 'Saved by Others', value: stats?.totalSaved || 0, color: 'var(--gold)' },
  ]

  return (
    <div className="pb-8 animate-fade-in-up" style={{ maxWidth: 600 }}>
      <button onClick={() => router.push('/profile')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 11, fontSize: 12, background: 'var(--raised)', color: 'var(--ink)', border: '1px solid var(--line)', cursor: 'pointer', marginBottom: 16 }}>
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Profile
      </button>

      <h1 className="page-title flex items-center gap-3 mb-5">
        <TrendingUp className="w-6 h-6" style={{ color: 'var(--green)' }} />
        Analytics
      </h1>

      <div className="grid grid-cols-2 gap-3">
        {metrics.map(m => {
          const Icon = m.icon
          return (
            <div key={m.label} style={s.card} className="text-center">
              <Icon className="w-5 h-5 mx-auto mb-2" style={{ color: m.color }} />
              <p className="text-xl font-bold" style={{ color: 'var(--ink)' }}>{m.value.toLocaleString()}</p>
              <p className="text-[10px] font-medium mt-1" style={{ color: 'var(--muted)' }}>{m.label}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
