'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSupabase, useUser, toast } from '@/app/providers'
import { AlertTriangle, AlertCircle, Droplets, Zap, Users, Shield, Share2, Bookmark, Flag, Plus, MapPin, Clock, Check, X, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react'

interface Alert {
  id: string
  alert_type: 'safety' | 'traffic' | 'utility' | 'patrol' | 'urgent'
  title: string
  description: string
  location: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  confirmations_count: number
  created_at: string
  user_id: string
  profiles: {
    id: string
    full_name: string
    username: string
    avatar_url: string | null
  } | null
}

const alertTypeConfig: Record<string, { icon: JSX.Element; label: string; color: string }> = {
  safety: { icon: <Shield className="w-4 h-4" />, label: 'Safety alert', color: 'text-earth border-earth/30 bg-earth/10' },
  traffic: { icon: <AlertCircle className="w-4 h-4" />, label: 'Traffic update', color: 'text-gold border-gold/30 bg-gold/10' },
  utility: { icon: <Zap className="w-4 h-4" />, label: 'Water/Power notice', color: 'text-blue border-blue/30 bg-blue/10' },
  patrol: { icon: <Users className="w-4 h-4" />, label: 'Community patrol', color: 'text-green border-green/30 bg-green/10' },
  urgent: { icon: <AlertTriangle className="w-4 h-4" />, label: 'Urgent', color: 'text-red border-red/30 bg-red/10' },
}

const severityColors: Record<string, string> = {
  low: 'bg-green/20 text-green',
  medium: 'bg-gold/20 text-gold',
  high: 'bg-earth/20 text-earth',
  critical: 'bg-red/20 text-red',
}

export default function NyumbaPage() {
  const supabase = useSupabase()
  const { profile, loading: userLoading } = useUser()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set())
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showTrusted, setShowTrusted] = useState(false)
  const [trustedNeighbours, setTrustedNeighbours] = useState<any[]>([])
  const [formData, setFormData] = useState({
    alert_type: 'safety',
    title: '',
    description: '',
    location: '',
    severity: 'medium',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchAlerts()
  }, [])

  useEffect(() => {
    if (!profile) return
    supabase
      .from('nyumba_kumi_confirmations')
      .select('alert_id')
      .eq('user_id', profile.id)
      .then(({ data }: { data: { alert_id: string }[] | null }) => {
        if (data) setConfirmedIds(new Set(data.map(c => c.alert_id)))
      })
    supabase
      .from('nyumba_kumi_saved')
      .select('alert_id')
      .eq('user_id', profile.id)
      .then(({ data }: { data: { alert_id: string }[] | null }) => {
        if (data) setSavedIds(new Set(data.map(s => s.alert_id)))
      })
    fetchTrustedNeighbours()
  }, [profile, supabase])

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('nyumba_kumi_alerts')
        .select(`
          *,
          profiles:user_id (
            id, full_name, username, avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setAlerts((data as Alert[]) || [])
    } catch (err) {
      console.error('Error fetching alerts:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTrustedNeighbours = async () => {
    if (!profile) return
    try {
      const { data } = await supabase
        .from('nyumba_kumi_trusted')
        .select(`
          trusted_id,
          profiles:trusted_id (
            id, full_name, username, avatar_url, county_hub
          )
        `)
        .eq('user_id', profile.id)
      if (data) setTrustedNeighbours(data.map((d: any) => d.profiles).filter(Boolean))
    } catch (err) {
      console.error('Error fetching trusted neighbours:', err)
    }
  }

  const handleConfirm = async (alertId: string) => {
    if (!profile) {
      toast('Sign in to confirm alerts')
      return
    }
    try {
      if (confirmedIds.has(alertId)) {
        await supabase
          .from('nyumba_kumi_confirmations')
          .delete()
          .eq('user_id', profile.id)
          .eq('alert_id', alertId)
        setConfirmedIds(prev => { const n = new Set(prev); n.delete(alertId); return n })
      } else {
        await supabase
          .from('nyumba_kumi_confirmations')
          .insert({ user_id: profile.id, alert_id: alertId } as any)
        setConfirmedIds(prev => { const n = new Set(prev); n.add(alertId); return n })
        toast('Alert confirmed ✓')
      }
      setAlerts(prev => prev.map(a =>
        a.id === alertId
          ? { ...a, confirmations_count: a.confirmations_count + (confirmedIds.has(alertId) ? -1 : 1) }
          : a
      ))
    } catch (err) {
      toast('Failed to confirm alert')
    }
  }

  const handleSave = async (alertId: string) => {
    if (!profile) {
      toast('Sign in to save alerts')
      return
    }
    try {
      if (savedIds.has(alertId)) {
        await supabase
          .from('nyumba_kumi_saved')
          .delete()
          .eq('user_id', profile.id)
          .eq('alert_id', alertId)
        setSavedIds(prev => { const n = new Set(prev); n.delete(alertId); return n })
        toast('Removed from saved')
      } else {
        await supabase
          .from('nyumba_kumi_saved')
          .insert({ user_id: profile.id, alert_id: alertId } as any)
        setSavedIds(prev => { const n = new Set(prev); n.add(alertId); return n })
        toast('Alert saved')
      }
    } catch (err) {
      toast('Failed to save alert')
    }
  }

  const shareWhatsApp = (alert: Alert) => {
    const text = `*${alert.title}*\n${alert.description}\n📍 ${alert.location}\n\nShared from Nyumba Kumi on KikwetuConnect`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const reportMisinformation = async (alertId: string) => {
    if (!profile) {
      toast('Sign in to report')
      return
    }
    try {
      await supabase.from('moderation').insert({
        target_type: 'nyumba_kumi_alert',
        target_id: alertId,
        reporter_id: profile.id,
        reason: 'Misinformation in Nyumba Kumi alert',
        status: 'pending',
      } as any)
      toast('Report submitted for review')
    } catch (err) {
      toast('Failed to submit report')
    }
  }

  const handleCreateAlert = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      toast('Title and description are required')
      return
    }
    if (!profile) {
      toast('Sign in to create alerts')
      return
    }
    setSubmitting(true)
    try {
      const { error } = await supabase.from('nyumba_kumi_alerts').insert({
        user_id: profile.id,
        alert_type: formData.alert_type,
        title: formData.title.trim(),
        description: formData.description.trim(),
        location: formData.location.trim() || profile.county_hub || 'Unknown',
        severity: formData.severity,
        confirmations_count: 1,
      } as any)
      if (error) throw error
      toast('Alert created! Stay safe.')
      setFormData({ alert_type: 'safety', title: '', description: '', location: '', severity: 'medium' })
      setShowCreateForm(false)
      fetchAlerts()
    } catch (err) {
      toast('Failed to create alert')
    } finally {
      setSubmitting(false)
    }
  }

  const formatRelativeTime = (d: string) => {
    const diff = Date.now() - new Date(d).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-green border-t-transparent rounded-full" />
      </div>
    )
  }

  const urgentAlerts = alerts.filter(a => a.alert_type === 'urgent' || a.severity === 'critical')

  return (
    <>
      <section className="page-head flex items-center justify-between">
        <div>
          <h1 className="page-title">Nyumba Kumi</h1>
          <p className="text-muted text-sm">Neighbourhood safety network</p>
        </div>
        <div className="flex gap-2">
          {profile && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="btn btn-primary btn-sm flex items-center gap-1"
            >
              {showCreateForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showCreateForm ? 'Cancel' : 'Alert'}
            </button>
          )}
        </div>
      </section>

      {/* Safety Notice Banner */}
      <section className="rounded-[14px] bg-red/10 border border-red/20 p-[16px] mb-6 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[11px] font-bold text-red mb-1">⚠ Important safety notice</p>
          <p className="text-[10px] text-red/80 leading-relaxed">
            Nyumba Kumi should never replace emergency services or encourage vigilantism. If you need immediate help, call the police (999/112) or ambulance (911). This platform is for community awareness only.
          </p>
        </div>
      </section>

      {/* Create Alert Form */}
      {showCreateForm && (
        <section className="card section mb-6 animate-rise">
          <h3 className="card-title text-sm mb-4">Create Safety Alert</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {Object.entries(alertTypeConfig).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setFormData(prev => ({ ...prev, alert_type: key }))}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-[10px] text-[11px] font-medium transition-colors ${
                  formData.alert_type === key
                    ? cfg.color
                    : 'bg-[oklch(21%_.03_151)] text-muted hover:text-cream'
                }`}
              >
                {cfg.icon} {cfg.label}
              </button>
            ))}
          </div>
          <div className="mb-3">
            <label className="text-[10px] font-semibold text-muted block mb-1.5">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="input text-sm"
              placeholder="What's happening?"
              maxLength={120}
            />
          </div>
          <div className="mb-3">
            <label className="text-[10px] font-semibold text-muted block mb-1.5">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="input text-sm resize-y min-h-[80px]"
              placeholder="Provide details for your neighbours..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-[10px] font-semibold text-muted block mb-1.5">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="input text-sm"
                placeholder="Area or landmark"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted block mb-1.5">Severity</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData(prev => ({ ...prev, severity: e.target.value }))}
                className="input text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleCreateAlert}
            disabled={submitting}
            className="btn btn-primary w-full justify-center"
          >
            {submitting ? 'Posting...' : 'Post Alert'}
          </button>
          <p className="text-[9px] text-muted mt-2 text-center">
            By posting you confirm this information is accurate and not misleading.
          </p>
        </section>
      )}

      {/* Urgent Alerts */}
      {urgentAlerts.length > 0 && (
        <section className="mb-6">
          <h3 className="text-[11px] font-bold text-red flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-red animate-pulse" /> Urgent alerts
          </h3>
          <div className="space-y-3">
            {urgentAlerts.map(alert => renderAlert(alert))}
          </div>
        </section>
      )}

      {/* All Alerts */}
      <section className="mb-6">
        <h3 className="text-[11px] font-bold text-muted mb-3">
          {urgentAlerts.length > 0 ? 'Other alerts' : 'Recent alerts'}
        </h3>
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card section p-[16px]">
                <div className="skeleton h-4 w-2/3 mb-3" />
                <div className="skeleton h-3 w-full mb-2" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="card section text-center py-12">
            <Shield className="w-10 h-10 text-[oklch(30%_.025_151)] mx-auto mb-3" />
            <p className="text-xs text-muted">No alerts in your area yet</p>
            {profile && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn btn-primary btn-sm mt-4"
              >
                <Plus className="w-4 h-4" /> Create first alert
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map(alert => renderAlert(alert))}
          </div>
        )}
      </section>

      {/* Trusted Neighbours */}
      <section className="card section mb-6">
        <button
          onClick={() => setShowTrusted(!showTrusted)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-green" />
            <h3 className="card-title text-sm">Trusted Neighbours</h3>
          </div>
          {showTrusted ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
        </button>
        {showTrusted && (
          <div className="mt-4 animate-rise">
            {!profile ? (
              <p className="text-xs text-muted text-center py-4">
                <Link href="/login" className="text-gold underline">Sign in</Link> to manage trusted neighbours
              </p>
            ) : trustedNeighbours.length === 0 ? (
              <div className="text-center py-6">
                <Users className="w-8 h-8 text-[oklch(30%_.025_151)] mx-auto mb-2" />
                <p className="text-xs text-muted mb-3">No trusted neighbours yet</p>
                <p className="text-[10px] text-[oklch(40%_.025_151)]">
                  Add neighbours you trust to receive their alerts more prominently.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {trustedNeighbours.map((n: any) => (
                  <div key={n.id} className="flex items-center gap-3 px-3 py-2 rounded-[10px] bg-[oklch(21%_.03_151)]">
                    <div className="w-8 h-8 rounded-full bg-earth grid place-items-center text-[10px] font-bold text-gold">
                      {(n.full_name || n.username || 'N')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[12px] font-medium">{n.full_name || n.username}</p>
                      {n.county_hub && <p className="text-[9px] text-muted">{n.county_hub}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Privacy Info */}
      <section className="card section mb-6">
        <div className="flex items-start gap-3">
          <Shield className="w-4 h-4 text-muted flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-[11px] font-semibold text-muted mb-1">Privacy controls</h3>
            <p className="text-[10px] text-[oklch(40%_.025_151)] leading-relaxed">
              Your location is shared as a general area only — not your exact address. You can control who sees your alerts in privacy settings. Confirmed alerts help the community but are not a replacement for official emergency reporting.
            </p>
          </div>
        </div>
      </section>

      <p className="text-[10px] text-center text-[oklch(30%_.025_151)] mb-8">
        Nyumba Kumi — Tujiliane. Tushirikiane. Tuwe salama.
      </p>
    </>
  )

  function renderAlert(alert: Alert) {
    const cfg = alertTypeConfig[alert.alert_type] || alertTypeConfig.safety
    const isUrgent = alert.alert_type === 'urgent' || alert.severity === 'critical'
    const author = alert.profiles

    return (
      <div
        key={alert.id}
        className={`card section p-[16px] animate-rise ${isUrgent ? 'border-red/30 bg-red/[0.03]' : ''}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-[7px] border ${cfg.color}`}>
              {cfg.icon} {cfg.label}
            </span>
            <span className={`text-[9px] font-medium px-2 py-0.5 rounded-full ${severityColors[alert.severity] || severityColors.medium}`}>
              {alert.severity}
            </span>
          </div>
          {isUrgent && (
            <span className="flex items-center gap-1 text-[9px] font-bold text-red animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-red" /> URGENT
            </span>
          )}
        </div>

        {/* Content */}
        <h3 className="text-[14px] font-bold mb-1">{alert.title}</h3>
        <p className="text-[12px] text-muted leading-relaxed mb-3">{alert.description}</p>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 text-[10px] text-[oklch(45%_.025_151)] mb-3">
          {alert.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {alert.location}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {formatRelativeTime(alert.created_at)}
          </span>
          <span className="flex items-center gap-1">
            <Check className="w-3 h-3" /> {alert.confirmations_count} confirmed
          </span>
          {author && (
            <span className="flex items-center gap-1">
              by {author.full_name || author.username}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-3 border-t border-[oklch(25%_.025_151)]">
          <button
            onClick={() => handleConfirm(alert.id)}
            className={`flex items-center gap-1 text-[10px] font-semibold px-3 py-1.5 rounded-[8px] transition-colors ${
              confirmedIds.has(alert.id)
                ? 'bg-green/20 text-green'
                : 'bg-[oklch(21%_.03_151)] text-muted hover:text-cream'
            }`}
          >
            <Check className="w-3 h-3" /> {confirmedIds.has(alert.id) ? 'Confirmed' : 'Confirm'}
          </button>
          <button
            onClick={() => shareWhatsApp(alert)}
            className="flex items-center gap-1 text-[10px] font-semibold px-3 py-1.5 rounded-[8px] bg-green/20 text-green hover:bg-green/30 transition-colors"
          >
            <MessageCircle className="w-3 h-3" /> Share
          </button>
          <button
            onClick={() => handleSave(alert.id)}
            className={`flex items-center gap-1 text-[10px] font-semibold px-3 py-1.5 rounded-[8px] transition-colors ${
              savedIds.has(alert.id)
                ? 'bg-earth/20 text-earth'
                : 'bg-[oklch(21%_.03_151)] text-muted hover:text-cream'
            }`}
          >
            <Bookmark className={`w-3 h-3 ${savedIds.has(alert.id) ? 'fill-current' : ''}`} />
            {savedIds.has(alert.id) ? 'Saved' : 'Save'}
          </button>
          <button
            onClick={() => reportMisinformation(alert.id)}
            className="flex items-center gap-1 text-[10px] font-semibold px-3 py-1.5 rounded-[8px] bg-[oklch(21%_.03_151)] text-red/60 hover:text-red hover:bg-red/10 transition-colors ml-auto"
          >
            <Flag className="w-3 h-3" /> Report
          </button>
        </div>
      </div>
    )
  }
}
