'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSupabase, useUser, toast } from '@/app/providers'
import { ArrowUpRight, ArrowDownLeft, Plus, Wallet, Clock, Percent, TrendingUp, History, ChevronDown, ChevronUp } from 'lucide-react'

interface TokenEntry {
  id: string
  amount: number
  type: 'earned' | 'spent' | 'bounty' | 'award'
  reference: string | null
  created_at: string
}

interface PayoutEntry {
  id: string
  amount: number
  method: string
  status: 'pending' | 'completed' | 'failed'
  reference: string | null
  created_at: string
}

const activityIcons: Record<string, JSX.Element> = {
  earned: <ArrowDownLeft className="w-4 h-4 text-green" />,
  spent: <ArrowUpRight className="w-4 h-4 text-red" />,
  bounty: <Plus className="w-4 h-4 text-gold" />,
  award: <TrendingUp className="w-4 h-4 text-earth" />,
}

const activityLabels: Record<string, string> = {
  earned: 'Tip received',
  spent: 'Tip sent',
  bounty: 'Bounty added',
  award: 'Award earned',
}

export default function WalletPage() {
  const supabase = useSupabase()
  const { profile, loading: userLoading } = useUser()
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState(0)
  const [mpesaNumber, setMpesaNumber] = useState('')
  const [activities, setActivities] = useState<TokenEntry[]>([])
  const [payouts, setPayouts] = useState<PayoutEntry[]>([])
  const [professionalView, setProfessionalView] = useState(false)
  const [showPayouts, setShowPayouts] = useState(false)
  const [creatingPayout, setCreatingPayout] = useState(false)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [payoutMethod, setPayoutMethod] = useState('M-Pesa')

  const grossTips = activities.filter(a => a.type === 'earned').reduce((s: number, a: TokenEntry) => s + a.amount, 0)
  const platformFee = Math.round(grossTips * 0.1)
  const netAmount = grossTips - platformFee

  useEffect(() => {
    if (!profile) return
    fetchWalletData()
  }, [profile])

  const fetchWalletData = async () => {
    setLoading(true)
    try {
      const { data: tokens } = await supabase
        .from('tokens')
        .select('*')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (tokens) {
        setActivities(tokens as TokenEntry[])
        setBalance(tokens.reduce((s: number, t: TokenEntry) => s + t.amount, 0))
      }

      const { data: payoutData } = await supabase
        .from('payouts')
        .select('*')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (payoutData) {
        setPayouts(payoutData as PayoutEntry[])
      }

      if (profile?.phone) {
        setMpesaNumber(profile.phone)
      }
    } catch (err) {
      console.error('Error fetching wallet data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddFunds = () => {
    toast('📱 M-Pesa top-up: Send to Paybill 247247. Funds reflect instantly.')
  }

  const handlePayout = async () => {
    if (!payoutAmount || isNaN(Number(payoutAmount)) || Number(payoutAmount) < 100) {
      toast('Minimum payout is KSh 100')
      return
    }
    if (Number(payoutAmount) > balance) {
      toast('Insufficient balance')
      return
    }
    setCreatingPayout(true)
    try {
      const { error } = await supabase.from('payouts').insert({
        user_id: profile!.id,
        amount: Number(payoutAmount),
        method: payoutMethod,
        status: 'pending',
      } as any)
      if (error) throw error
      toast('Payout request submitted. Funds will be sent within 24 hours.')
      setPayoutAmount('')
      fetchWalletData()
    } catch (err) {
      toast('Failed to create payout request')
    } finally {
      setCreatingPayout(false)
    }
  }

  const formatDate = (d: string) => {
    const date = new Date(d)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    if (diff < 86400000) return 'Today'
    if (diff < 172800000) return 'Yesterday'
    return date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
  }

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-green border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-muted mb-4">Sign in to access your wallet</p>
        <Link href="/login" className="btn btn-primary">Sign in</Link>
      </div>
    )
  }

  return (
    <>
      <section className="page-head flex items-center justify-between">
        <div>
          <h1 className="page-title">Wallet</h1>
          <p className="text-muted text-sm">Tips, bounties & payouts</p>
        </div>
        <button
          onClick={() => setProfessionalView(!professionalView)}
          className="btn btn-secondary btn-sm flex items-center gap-2"
        >
          <TrendingUp className="w-4 h-4" />
          {professionalView ? 'Simple' : 'Pro'}
        </button>
      </section>

      {/* Balance Card */}
      <section className="rounded-[18px] bg-gold text-night p-[22px] mb-6 animate-rise">
        <div className="flex items-center justify-between mb-1">
          <small className="text-[10px] opacity-70 font-semibold">Available balance</small>
          <Wallet className="w-4 h-4 opacity-50" />
        </div>
        <strong className="text-[32px] tracking-[-.07em] font-extrabold">KSh {balance.toLocaleString()}</strong>
        {mpesaNumber && (
          <p className="text-[11px] opacity-60 mt-1 font-medium">
            Linked: {mpesaNumber.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')}
          </p>
        )}
        <div className="flex gap-3 mt-[16px]">
          <button onClick={handleAddFunds} className="flex-1 bg-night text-gold rounded-[11px] py-[11px] text-[11px] font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> Add funds
          </button>
          <button onClick={() => setShowPayouts(!showPayouts)} className="flex-1 bg-[oklch(100%_.05_84_/.2)] text-night rounded-[11px] py-[11px] text-[11px] font-bold flex items-center justify-center gap-2 hover:opacity-80 transition-opacity">
            <History className="w-4 h-4" /> Payout
          </button>
        </div>
      </section>

      {/* Professional View Toggle */}
      {professionalView && (
        <section className="card section mb-6 animate-rise">
          <h3 className="card-title text-sm mb-4">Professional Overview</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-[12px] bg-[oklch(21%_.03_151)]">
              <div className="text-lg font-bold text-cream">KSh {grossTips.toLocaleString()}</div>
              <div className="text-[10px] text-muted mt-1">Gross tips</div>
            </div>
            <div className="text-center p-4 rounded-[12px] bg-[oklch(21%_.03_151)]">
              <div className="text-lg font-bold text-red">-KSh {platformFee.toLocaleString()}</div>
              <div className="text-[10px] text-muted mt-1">Platform fee (10%)</div>
            </div>
            <div className="text-center p-4 rounded-[12px] bg-[oklch(21%_.03_151)]">
              <div className="text-lg font-bold text-green">KSh {netAmount.toLocaleString()}</div>
              <div className="text-[10px] text-muted mt-1">Net amount</div>
            </div>
          </div>
        </section>
      )}

      {/* Fee Breakdown */}
      <section className="card section mb-6">
        <h3 className="card-title text-sm mb-3">Fee Breakdown</h3>
        <div className="bg-[oklch(21%_.03_151)] rounded-[12px] p-[16px]">
          <p className="text-xs text-muted mb-3">Every payment shows the split:</p>
          <div className="flex items-center gap-3">
            <span className="bg-gold text-night text-[10px] font-bold px-[10px] py-[4px] rounded-[6px]">10% fee</span>
            <span className="text-[11px] text-muted">Platform fee on all tips earned</span>
          </div>
          <div className="mt-3 text-[11px] text-muted leading-relaxed">
            When someone tips you KSh 100, you receive KSh 90. The remaining KSh 10 supports platform operations, moderation, and community programs.
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="card section mb-6">
        <h3 className="card-title text-sm mb-4">Recent Activity</h3>
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-8 h-8 text-[oklch(30%_.025_151)] mx-auto mb-3" />
            <p className="text-xs text-muted">No activity yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {activities.map((act) => (
              <div key={act.id} className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] hover:bg-[oklch(21%_.03_151)] transition-colors">
                <div className="w-8 h-8 rounded-[10px] bg-[oklch(21%_.03_151)] grid place-items-center">
                  {activityIcons[act.type] || <Plus className="w-4 h-4 text-muted" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium truncate">{act.reference || activityLabels[act.type] || 'Transaction'}</p>
                  <p className="text-[10px] text-muted">{formatDate(act.created_at)}</p>
                </div>
                <span className={`text-[13px] font-bold ${act.amount > 0 ? 'text-green' : 'text-red'}`}>
                  {act.amount > 0 ? '+' : ''}KSh {act.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Payout History */}
      <section className="card section mb-6">
        <button
          onClick={() => setShowPayouts(!showPayouts)}
          className="w-full flex items-center justify-between"
        >
          <h3 className="card-title text-sm">Payout History</h3>
          {showPayouts ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
        </button>
        {showPayouts && (
          <div className="mt-4 animate-rise">
            {/* New Payout */}
            <div className="bg-[oklch(21%_.03_151)] rounded-[12px] p-[16px] mb-4">
              <h4 className="text-[11px] font-semibold text-muted mb-3">Request Payout</h4>
              <div className="flex gap-3">
                <input
                  type="number"
                  placeholder="Amount (KSh)"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="input flex-1 text-sm"
                  min="100"
                />
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value)}
                  className="input w-[120px] text-sm"
                >
                  <option>M-Pesa</option>
                  <option>Airtel Money</option>
                  <option>Bank</option>
                </select>
                <button
                  onClick={handlePayout}
                  disabled={creatingPayout}
                  className="btn btn-primary btn-sm whitespace-nowrap"
                >
                  {creatingPayout ? '...' : 'Request'}
                </button>
              </div>
            </div>

            {payouts.length === 0 ? (
              <p className="text-xs text-muted text-center py-4">No payout history</p>
            ) : (
              <div className="space-y-1">
                {payouts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2.5 rounded-[10px] hover:bg-[oklch(21%_.03_151)] transition-colors">
                    <div>
                      <p className="text-[12px] font-medium">{p.method}</p>
                      <p className="text-[10px] text-muted">{new Date(p.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-bold">KSh {p.amount.toLocaleString()}</p>
                      <span className={`text-[9px] font-medium px-2 py-0.5 rounded-full ${
                        p.status === 'completed' ? 'bg-green/20 text-green' :
                        p.status === 'pending' ? 'bg-gold/20 text-gold' :
                        'bg-red/20 text-red'
                      }`}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <p className="text-[10px] text-center text-[oklch(30%_.025_151)] mb-8">
        Payouts processed within 1-3 business days. Minimum payout: KSh 100.
      </p>
    </>
  )
}
