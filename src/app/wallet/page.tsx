'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSupabase, useUser, toast } from '@/app/providers'
import { ArrowUpRight, ArrowDownLeft, Plus, Wallet, Clock, Percent, TrendingUp, History, ChevronDown, ChevronUp, X, Smartphone, CheckCircle2, XCircle, Loader } from 'lucide-react'

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
  topup: <Wallet className="w-4 h-4 text-green" />,
}

const activityLabels: Record<string, string> = {
  earned: 'Tip received',
  spent: 'Tip sent',
  bounty: 'Bounty added',
  award: 'Award earned',
  topup: 'M-Pesa top-up',
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

  const [showTopup, setShowTopup] = useState(false)
  const [topupAmount, setTopupAmount] = useState('1000')
  const [topupPhone, setTopupPhone] = useState('')
  const [topupLoading, setTopupLoading] = useState(false)
  const [topupState, setTopupState] = useState<'idle' | 'processing' | 'done' | 'failed'>('idle')
  const [topupMessage, setTopupMessage] = useState('')
  const [activeCheckoutId, setActiveCheckoutId] = useState<string | null>(null)

  const grossTips = activities.filter(a => a.type === 'earned').reduce((s: number, a: TokenEntry) => s + a.amount, 0)
  const platformFee = Math.round(grossTips * 0.1)
  const netAmount = grossTips - platformFee

  useEffect(() => {
    if (!profile) return
    fetchWalletData()
  }, [profile])

  // Realtime: auto-refresh the wallet when a top-up (or any token movement) lands
  useEffect(() => {
    if (!profile) return
    const channel = supabase
      .channel('wallet-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tokens', filter: `user_id=eq.${profile.id}` }, () => {
        fetchWalletData()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'wallet_topups', filter: `user_id=eq.${profile.id}` }, () => {
        fetchWalletData()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, profile])

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
        setMpesaNumber(String(profile.phone))
        setTopupPhone(String(profile.phone))
      }
    } catch (err) {
      console.error('Error fetching wallet data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddFunds = () => {
    setTopupState('idle')
    setTopupMessage('')
    setTopupAmount('1000')
    setTopupPhone(String(profile?.phone || ''))
    setShowTopup(true)
  }

  const startTopup = async () => {
    const amount = Number(topupAmount)
    if (!topupAmount || isNaN(amount) || amount < 10 || amount > 150000) {
      toast('Enter an amount between KSh 10 and KSh 150,000')
      return
    }
    if (!/^(?:\+254|0)\d{9}$/.test(topupPhone.replace(/[\s-]/g, ''))) {
      toast('Enter a valid phone number (07xx or +254)')
      return
    }
    setTopupLoading(true)
    setTopupState('processing')
    setTopupMessage('Requesting an M-Pesa prompt on your phone...')
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'topup', amount, phone: topupPhone.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not start top-up')
      setActiveCheckoutId(data.checkout_request_id)
      setTopupMessage('Check your phone, enter your M-Pesa PIN to complete the top-up.')
    } catch (err: any) {
      setTopupState('failed')
      setTopupMessage(err.message || 'Top-up could not be started')
    } finally {
      setTopupLoading(false)
    }
  }

  // Poll the top-up status until the webhook marks it complete/failed
  useEffect(() => {
    if (!activeCheckoutId || !profile) return
    let cancelled = false
    const check = async () => {
      const { data } = await supabase
        .from('wallet_topups')
        .select('status, error, mpesa_reference')
        .eq('checkout_request_id', activeCheckoutId)
        .maybeSingle()
      if (cancelled) return
      if (data?.status === 'completed') {
        setTopupState('done')
        setTopupMessage(`Top-up of KSh ${topupAmount} added to your wallet.`)
        setActiveCheckoutId(null)
        fetchWalletData()
      } else if (data?.status === 'failed') {
        setTopupState('failed')
        setTopupMessage(data.error || 'The top-up failed. Try again.')
        setActiveCheckoutId(null)
      }
    }
    check()
    const timer = setInterval(check, 3000)
    const timeout = setTimeout(() => {
      if (!cancelled && topupState !== 'done' && topupState !== 'failed') {
        setTopupState('processing')
        setTopupMessage('Still waiting for M-Pesa... You can close this and check your balance shortly.')
      }
    }, 90000)
    return () => { cancelled = true; clearInterval(timer); clearTimeout(timeout) }
  }, [activeCheckoutId, profile])

  const closeTopup = () => {
    setShowTopup(false)
    setActiveCheckoutId(null)
    fetchWalletData()
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

      {/* M-Pesa Top-up Modal */}
      {showTopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-center-scroll" style={{ background: 'color-mix(in oklab, var(--night) 70%, transparent)' }}
          onClick={e => { if (e.target === e.currentTarget && topupState !== 'processing') closeTopup() }}>
          <div className="animate-rise" style={{
            background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 20,
            width: 'min(440px, 100%)', padding: 24, boxShadow: '0 25px 60px color-mix(in oklab, var(--night) 30%, transparent)',
            maxHeight: '90vh', overflowY: 'auto', margin: 'auto',
          }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-base" style={{ color: 'var(--ink)' }}>M-Pesa Top-up</h3>
              <button onClick={closeTopup} style={{ background: 'var(--raised)', color: 'var(--muted)', border: 0, cursor: 'pointer', width: 32, height: 32, borderRadius: '50%', display: 'grid', placeItems: 'center' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {topupState === 'done' ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--green)' }} />
                <p className="font-bold text-sm" style={{ color: 'var(--ink)' }}>Top-up successful</p>
                <p className="text-xs mt-1 mb-5" style={{ color: 'var(--muted)' }}>{topupMessage}</p>
                <button onClick={closeTopup} style={{ background: 'var(--gold)', color: 'var(--night)', border: 0, borderRadius: 11, padding: '11px 24px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Done</button>
              </div>
            ) : topupState === 'failed' ? (
              <div className="text-center py-8">
                <XCircle className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--red)' }} />
                <p className="font-bold text-sm" style={{ color: 'var(--ink)' }}>Top-up failed</p>
                <p className="text-xs mt-1 mb-5" style={{ color: 'var(--muted)' }}>{topupMessage}</p>
                <button onClick={() => { setTopupState('idle'); setTopupMessage(''); setActiveCheckoutId(null) }} style={{ background: 'var(--gold)', color: 'var(--night)', border: 0, borderRadius: 11, padding: '11px 24px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Try again</button>
              </div>
            ) : topupState === 'processing' ? (
              <div className="text-center py-8">
                <div className="mx-auto mb-3 w-12 h-12 rounded-full grid place-items-center" style={{ background: 'color-mix(in oklab, var(--green) 15%, var(--surface))' }}>
                  <Loader className="w-6 h-6 animate-spin" style={{ color: 'var(--green)' }} />
                </div>
                <p className="font-bold text-sm" style={{ color: 'var(--ink)' }}>Waiting for payment...</p>
                <p className="text-xs mt-1 mb-5" style={{ color: 'var(--muted)' }}>{topupMessage}</p>
                <div className="flex items-center justify-center gap-2 text-[10px]" style={{ color: 'var(--muted)' }}>
                  <Smartphone className="w-4 h-4" /> Enter your M-Pesa PIN on <strong>{topupPhone.replace(/(\d{4})(\d{3})(\d{4})/, '**** *** $3')}</strong>
                </div>
                <button onClick={() => { setShowTopup(false); setActiveCheckoutId(null) }} className="mt-5 text-[11px]" style={{ background: 'none', border: 0, color: 'var(--muted)', textDecoration: 'underline', cursor: 'pointer' }}>
                  Close — I'll check my balance later
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--muted)' }}>Amount (KSh)</label>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[100, 500, 1000, 5000].map(p => (
                      <button key={p} onClick={() => setTopupAmount(String(p))}
                        style={{
                          padding: '10px 0', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          border: `1px solid ${topupAmount === String(p) ? 'var(--gold)' : 'var(--line)'}`,
                          background: topupAmount === String(p) ? 'color-mix(in oklab, var(--gold) 10%, var(--surface))' : 'var(--raised)',
                          color: topupAmount === String(p) ? 'var(--gold)' : 'var(--muted)',
                        }}>
                        {p.toLocaleString()}
                      </button>
                    ))}
                  </div>
                  <input type="number" value={topupAmount} onChange={e => setTopupAmount(e.target.value)} min={10} max={150000}
                    style={{ width: '100%', background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: 11, padding: '11px 14px', fontSize: 14, fontWeight: 700, color: 'var(--ink)', outline: 'none' }} />
                </div>
                <div className="mt-4">
                  <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--muted)' }}>M-Pesa phone number</label>
                  <input value={topupPhone} onChange={e => setTopupPhone(e.target.value)} placeholder="07XX XXX XXX"
                    style={{ width: '100%', background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: 11, padding: '11px 14px', fontSize: 13, color: 'var(--ink)', outline: 'none' }} />
                </div>
                <button onClick={startTopup} disabled={topupLoading}
                  style={{ width: '100%', marginTop: 18, background: 'var(--gold)', color: 'var(--night)', border: 0, borderRadius: 11, padding: '13px', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: topupLoading ? 0.6 : 1 }}>
                  {topupLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                  {topupLoading ? 'Sending prompt...' : `Top up KSh ${Number(topupAmount) ? Number(topupAmount).toLocaleString() : ''}`}
                </button>
                <p className="text-[9px] text-center mt-3" style={{ color: 'var(--muted)' }}>An STK prompt is sent to your phone. Funds are credited instantly once you approve. A 10% platform fee applies to tips you earn, not to top-ups.</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
