'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useSupabase, useUser, toast } from '@/app/providers'
import { AlertTriangle, AlertCircle, Droplets, Zap, Users, Shield, Share2, Bookmark, Flag, Plus, MapPin, Clock, Check, X, ChevronDown, ChevronUp, MessageCircle, Home, Bell, Eye, EyeOff, ThumbsUp, UserPlus, UserCheck, LogIn, Gavel, Search, RefreshCw, Languages } from 'lucide-react'

interface Alert {
  id: string; alert_type: 'safety' | 'traffic' | 'utility' | 'patrol' | 'urgent'; title: string; description: string; location: string; severity: 'low' | 'medium' | 'high' | 'critical'; confirmations_count: number; created_at: string; user_id: string
  profiles: { id: string; full_name: string; username: string; avatar_url: string | null } | null
}

interface Group {
  id: string; name: string; slug: string; description: string; county: string; member_count: number; is_public: boolean; created_by: string
}

interface ModerationItem {
  id: string; target_type: string; target_id: string; reason: string; status: string; created_at: string; profiles?: { full_name: string; username: string }
}

const ALERT_CONFIG: Record<string, { icon: any; label: string; color: string; gradient: string }> = {
  safety: { icon: Shield, label: 'Safety alert', color: 'var(--earth)', gradient: 'linear-gradient(135deg, #e17055, #d63031)' },
  traffic: { icon: AlertCircle, label: 'Traffic update', color: 'var(--gold)', gradient: 'linear-gradient(135deg, #f39c12, #e67e22)' },
  utility: { icon: Zap, label: 'Water/Power notice', color: 'var(--blue)', gradient: 'linear-gradient(135deg, #3498db, #2980b9)' },
  patrol: { icon: Users, label: 'Community patrol', color: 'var(--green)', gradient: 'linear-gradient(135deg, #27ae60, #2ecc71)' },
  urgent: { icon: AlertTriangle, label: 'Urgent', color: 'var(--red)', gradient: 'linear-gradient(135deg, #e74c3c, #c0392b)' },
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'var(--red)',
  high: 'var(--earth)',
  medium: 'var(--gold)',
  low: 'var(--green)',
}

const s = {
  card: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20, boxShadow: 'var(--card-shadow)' },
  input: { width: '100%', background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: 11, padding: '10px 14px', fontSize: 13, color: 'var(--ink)', outline: 'none' },
  btn: { padding: '10px 20px', borderRadius: 11, fontWeight: 700, fontSize: 12, border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all .2s var(--ease)' },
  primaryBtn: { background: 'var(--gold)', color: 'var(--night)' },
  secondaryBtn: { background: 'var(--raised)', color: 'var(--ink)', border: '1px solid var(--line)' },
  smallBtn: { padding: '6px 12px', borderRadius: 9, fontSize: 10, fontWeight: 600, border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, transition: 'all .2s var(--ease)' },
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
  const [formData, setFormData] = useState({ alert_type: 'safety', title: '', description: '', location: '', severity: 'medium' })
  const [submitting, setSubmitting] = useState(false)
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null)
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [loadingTrans, setLoadingTrans] = useState<string | null>(null)

  // Group membership state
  const [groups, setGroups] = useState<Group[]>([])
  const [myGroupIds, setMyGroupIds] = useState<Set<string>>(new Set())
  const [showGroups, setShowGroups] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [groupForm, setGroupForm] = useState({ name: '', description: '', county: '' })
  const [creatingGroup, setCreatingGroup] = useState(false)

  // Admin moderation state
  const [showModeration, setShowModeration] = useState(false)
  const [modQueue, setModQueue] = useState<ModerationItem[]>([])
  const [modLoading, setModLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => { fetchAlerts() }, [])

  useEffect(() => {
    if (!profile) return
    supabase.from('nyumba_kumi_confirmations').select('alert_id').eq('user_id', profile.id).then(({ data }: { data: { alert_id: string }[] | null }) => { if (data) setConfirmedIds(new Set(data.map(c => c.alert_id))) })
    supabase.from('nyumba_kumi_saved').select('alert_id').eq('user_id', profile.id).then(({ data }: { data: { alert_id: string }[] | null }) => { if (data) setSavedIds(new Set(data.map(s => s.alert_id))) })
    fetchTrustedNeighbours()
    checkRateLimit()
    fetchMyGroups()
    if (profile?.role === 'admin') setIsAdmin(true)
  }, [profile, supabase])

  // Real-time subscription for new alerts
  useEffect(() => {
    if (!profile) return
    const channel = supabase
      .channel('nyumba-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'nyumba_kumi_alerts' }, (payload: any) => {
        const newAlert = payload.new as any
        supabase.from('nyumba_kumi_alerts').select(`*, profiles:user_id (id, full_name, username, avatar_url)`).eq('id', newAlert.id).single().then((result: any) => { const data = result.data
          if (data) setAlerts(prev => {
            if (prev.some(a => a.id === data.id)) return prev
            return [data as Alert, ...prev]
          })
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, profile])

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const { data } = await supabase.from('nyumba_kumi_alerts').select(`*, profiles:user_id (id, full_name, username, avatar_url)`).order('created_at', { ascending: false }).limit(50)
      setAlerts((data as Alert[]) || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const fetchTrustedNeighbours = async () => {
    if (!profile) return
    try {
      const { data } = await supabase.from('nyumba_kumi_trusted').select(`trusted_id, profiles:trusted_id (id, full_name, username, avatar_url, county_hub)`).eq('user_id', profile.id)
      if (data) setTrustedNeighbours(data.map((d: any) => d.profiles).filter(Boolean))
    } catch { /* silently fail */ }
  }

  const checkRateLimit = async () => {
    if (!profile) return
    try {
      const { data } = await supabase.rpc('check_alert_rate_limit', { p_user_id: profile.id })
      if (data) {
        const remaining = data.allowed ? Math.max(0, 3 - (data.recent_count || 0)) : 0
        setRateLimitRemaining(remaining)
      }
    } catch { /* fail silently */ }
  }

  const fetchMyGroups = async () => {
    if (!profile) return
    try {
      const { data: allGroups } = await supabase.from('nyumba_kumi_groups').select('*').order('name')
      if (allGroups) setGroups(allGroups as Group[])
      const { data: myMemberships } = await supabase.from('nyumba_kumi_group_members').select('group_id').eq('user_id', profile.id)
      if (myMemberships) setMyGroupIds(new Set(myMemberships.map((m: any) => m.group_id)))
    } catch { /* fail silently */ }
  }

  const handleConfirm = async (alertId: string) => {
    if (!profile) { toast('Sign in to confirm alerts'); return }
    try {
      if (confirmedIds.has(alertId)) {
        await supabase.from('nyumba_kumi_confirmations').delete().eq('user_id', profile.id).eq('alert_id', alertId)
        setConfirmedIds(prev => { const n = new Set(prev); n.delete(alertId); return n })
      } else {
        await supabase.from('nyumba_kumi_confirmations').insert({ user_id: profile.id, alert_id: alertId } as any)
        setConfirmedIds(prev => { const n = new Set(prev); n.add(alertId); return n })
        toast('Alert confirmed ✓')
      }
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, confirmations_count: a.confirmations_count + (confirmedIds.has(alertId) ? -1 : 1) } : a))
    } catch { toast('Failed to confirm alert') }
  }

  const handleSave = async (alertId: string) => {
    if (!profile) { toast('Sign in to save alerts'); return }
    try {
      if (savedIds.has(alertId)) {
        await supabase.from('nyumba_kumi_saved').delete().eq('user_id', profile.id).eq('alert_id', alertId)
        setSavedIds(prev => { const n = new Set(prev); n.delete(alertId); return n }); toast('Removed from saved')
      } else {
        await supabase.from('nyumba_kumi_saved').insert({ user_id: profile.id, alert_id: alertId } as any)
        setSavedIds(prev => { const n = new Set(prev); n.add(alertId); return n }); toast('Alert saved')
      }
    } catch { toast('Failed to save alert') }
  }

  const shareWhatsApp = (alert: Alert) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`*${alert.title}*\n${alert.description}\n📍 ${alert.location}\n\nShared from Nyumba Kumi on KikwetuConnect`)}`, '_blank')
  }

  const reportMisinformation = async (alertId: string) => {
    if (!profile) { toast('Sign in to report'); return }
    try {
      await supabase.rpc('report_alert_audited', { p_alert_id: alertId, p_reason: 'Misinformation in Nyumba Kumi alert' })
      toast('Report submitted for review')
    } catch { toast('Failed to submit report') }
  }

  const handleCreateAlert = async () => {
    if (!formData.title.trim() || !formData.description.trim()) { toast('Title and description are required'); return }
    if (formData.title.trim().length < 5) { toast('Title must be at least 5 characters'); return }
    if (formData.description.trim().length < 10) { toast('Description must be at least 10 characters'); return }
    if (!profile) { toast('Sign in to create alerts'); return }

    setSubmitting(true)
    const location = formData.location.trim() || profile.county_hub || 'Unknown'

    try {
      // Use RPC for rate-limited, logged alert creation
      const { data, error } = await supabase.rpc('create_nyumba_alert', {
        p_user_id: profile.id,
        p_alert_type: formData.alert_type,
        p_title: formData.title.trim(),
        p_description: formData.description.trim(),
        p_location: location,
        p_severity: formData.severity,
      })

      if (error) throw error
      if (data?.error) { toast(data.error); setSubmitting(false); return }

      const notifCount = data?.notifications_sent || 0
      toast(`Alert created! Notified ${notifCount} neighbour${notifCount !== 1 ? 's' : ''}. Stay safe.`)
      setFormData({ alert_type: 'safety', title: '', description: '', location: '', severity: 'medium' })
      setShowCreateForm(false)
      checkRateLimit()
      fetchAlerts()
    } catch (err: any) {
      toast(err?.message || 'Failed to create alert')
    }
    finally { setSubmitting(false) }
  }

  const handleJoinGroup = async (groupId: string) => {
    if (!profile) { toast('Sign in to join groups'); return }
    try {
      await supabase.from('nyumba_kumi_group_members').insert({ group_id: groupId, user_id: profile.id } as any)
      setMyGroupIds(prev => { const n = new Set(prev); n.add(groupId); return n })
      setGroups(prev => prev.map(g => g.id === groupId ? { ...g, member_count: g.member_count + 1 } : g))
      toast('Joined neighbourhood group!')
    } catch { toast('Failed to join group') }
  }

  const handleLeaveGroup = async (groupId: string) => {
    if (!profile) return
    try {
      await supabase.from('nyumba_kumi_group_members').delete().eq('group_id', groupId).eq('user_id', profile.id)
      setMyGroupIds(prev => { const n = new Set(prev); n.delete(groupId); return n })
      setGroups(prev => prev.map(g => g.id === groupId ? { ...g, member_count: Math.max(0, g.member_count - 1) } : g))
      toast('Left group')
    } catch { toast('Failed to leave group') }
  }

  const handleCreateGroup = async () => {
    if (!groupForm.name.trim()) { toast('Group name is required'); return }
    if (!profile) return
    setCreatingGroup(true)
    try {
      const slug = groupForm.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'group'
      const { data, error } = await supabase.rpc('create_nyumba_group_audited', {
        p_name: groupForm.name.trim(),
        p_slug: slug,
        p_description: groupForm.description.trim(),
        p_county: groupForm.county || null,
      })
      if (error) throw error
      setGroups(prev => [{ ...data, name: groupForm.name.trim(), description: groupForm.description.trim(), created_by: profile.id, member_count: 1 } as any, ...prev])
      setMyGroupIds(prev => { const n = new Set(prev); n.add(data.id); return n })
      setGroupForm({ name: '', description: '', county: '' })
      setShowCreateGroup(false)
      toast('Neighbourhood group created!')
    } catch { toast('Failed to create group') }
    finally { setCreatingGroup(false) }
  }

  // Moderation handlers
  const fetchModQueue = async () => {
    if (!isAdmin) return
    setModLoading(true)
    try {
      const { data } = await supabase.from('moderation_queue').select(`*, profiles:reporter_id (full_name, username)`).eq('target_type', 'nyumba_kumi_alert').order('created_at', { ascending: false }).limit(20)
      if (data) setModQueue(data as ModerationItem[])
    } catch { /* fail */ }
    finally { setModLoading(false) }
  }

  const handleModerate = async (itemId: string, newStatus: string) => {
    if (!profile) return
    try {
      await supabase.rpc('moderate_alert_audited', { p_item_id: itemId, p_status: newStatus })
      setModQueue(prev => prev.map(m => m.id === itemId ? { ...m, status: newStatus } : m))
      toast(`Alert ${newStatus}`)
    } catch { toast('Failed to update') }
  }

  const handleTranslate = async (alertId: string) => {
    if (!profile) { toast('Sign in to translate'); return }
    if (translations[alertId]) {
      setTranslations(prev => { const n = { ...prev }; delete n[alertId]; return n })
      return
    }
    setLoadingTrans(alertId)
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: alertId, source_type: 'nyumba_kumi_alerts', language: 'sw' }),
      })
      const j = await res.json()
      if (j.translated_text) {
        setTranslations(prev => ({ ...prev, [alertId]: j.translated_text }))
      } else {
        toast('Translation failed')
      }
    } catch { toast('Translation error') }
    finally { setLoadingTrans(null) }
  }

  const handleHideAlert = async (alertId: string) => {
    if (!profile) return
    try {
      await supabase.rpc('hide_alert_audited', { p_alert_id: alertId })
      setAlerts(prev => prev.filter(a => a.id !== alertId))
      toast('Alert removed from feed')
    } catch { toast('Failed to remove alert') }
  }

  const formatRelativeTime = (d: string) => {
    const diff = Date.now() - new Date(d).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  if (userLoading) return <div className="flex items-center justify-center min-h-[80vh]"><div className="animate-spin w-8 h-8 border-2" style={{ borderColor: 'var(--green)', borderTopColor: 'transparent', borderRadius: '50%' }} /></div>

  const urgentAlerts = alerts.filter(a => a.alert_type === 'urgent' || a.severity === 'critical')

  const renderAlert = (alert: Alert) => {
    const cfg = ALERT_CONFIG[alert.alert_type] || ALERT_CONFIG.safety
    const Icon = cfg.icon
    const isUrgent = alert.alert_type === 'urgent' || alert.severity === 'critical'
    const author = alert.profiles
    const isConfirmed = confirmedIds.has(alert.id)
    const isSaved = savedIds.has(alert.id)

    return (
      <div key={alert.id} style={{ ...s.card, borderColor: isUrgent ? 'color-mix(in oklab, var(--red) 30%, transparent)' : 'var(--line)', overflow: 'hidden' }} className="feature-card">
        {/* Severity bar */}
        <div style={{ height: 3, background: SEVERITY_COLORS[alert.severity] || 'var(--line)', margin: '-20px -20px 16px -20px', opacity: 0.7 }} />
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-[7px]"
              style={{ background: `color-mix(in oklab, ${cfg.color} 15%, var(--surface))`, color: cfg.color, border: '1px solid', borderColor: `color-mix(in oklab, ${cfg.color} 30%, transparent)` }}>
              <Icon className="w-3 h-3" /> {cfg.label}
            </span>
            <span className="text-[9px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: `color-mix(in oklab, ${SEVERITY_COLORS[alert.severity]} 20%, var(--surface))`, color: SEVERITY_COLORS[alert.severity] }}>
              {alert.severity}
            </span>
          </div>
          {isUrgent && <span className="flex items-center gap-1 text-[9px] font-bold" style={{ color: 'var(--red)' }}><span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--red)' }} /> URGENT</span>}
        </div>
        <h3 className="text-[14px] font-bold mb-1" style={{ color: 'var(--ink)' }}>{alert.title}</h3>
        <p className="text-[12px] leading-relaxed mb-3" style={{ color: 'var(--muted)' }}>
          {translations[alert.id] || alert.description}
          {translations[alert.id] && <span className="text-[9px] ml-1 opacity-60">(SW)</span>}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-[10px] mb-3" style={{ color: 'var(--muted)' }}>
          {alert.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {alert.location}</span>}
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatRelativeTime(alert.created_at)}</span>
          <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {alert.confirmations_count} confirmed</span>
          {author && <span className="flex items-center gap-1">by {author.full_name || author.username}</span>}
        </div>
        <div className="flex flex-wrap gap-2 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
          <button onClick={() => handleConfirm(alert.id)}
            style={{ background: isConfirmed ? 'color-mix(in oklab, var(--green) 20%, transparent)' : 'var(--raised)', color: isConfirmed ? 'var(--green)' : 'var(--muted)' }}
            className="flex items-center gap-1 text-[10px] font-semibold px-3 py-1.5 rounded-[8px] transition-colors">
            <Check className="w-3 h-3" /> {isConfirmed ? 'Confirmed' : 'Confirm'}
          </button>
          <button onClick={() => shareWhatsApp(alert)}
            style={{ background: 'color-mix(in oklab, var(--green) 20%, transparent)', color: 'var(--green)' }}
            className="flex items-center gap-1 text-[10px] font-semibold px-3 py-1.5 rounded-[8px]">
            <MessageCircle className="w-3 h-3" /> Share
          </button>
          <button onClick={() => handleTranslate(alert.id)}
            style={{ background: translations[alert.id] ? 'color-mix(in oklab, var(--blue) 20%, transparent)' : 'var(--raised)', color: translations[alert.id] ? 'var(--blue)' : 'var(--muted)' }}
            className="flex items-center gap-1 text-[10px] font-semibold px-3 py-1.5 rounded-[8px] transition-colors">
            {loadingTrans === alert.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
            {loadingTrans === alert.id ? 'Tafsiri...' : translations[alert.id] ? 'Asili' : 'Tafsiri'}
          </button>
          <button onClick={() => handleSave(alert.id)}
            style={{ background: isSaved ? 'color-mix(in oklab, var(--earth) 20%, transparent)' : 'var(--raised)', color: isSaved ? 'var(--earth)' : 'var(--muted)' }}
            className="flex items-center gap-1 text-[10px] font-semibold px-3 py-1.5 rounded-[8px] transition-colors">
            <Bookmark className={`w-3 h-3 ${isSaved ? 'fill-current' : ''}`} /> {isSaved ? 'Saved' : 'Save'}
          </button>
          <button onClick={() => reportMisinformation(alert.id)}
            className="flex items-center gap-1 text-[10px] font-semibold px-3 py-1.5 rounded-[8px] transition-colors ml-auto"
            style={{ background: 'var(--raised)', color: 'color-mix(in oklab, var(--red) 60%, var(--muted))' }}>
            <Flag className="w-3 h-3" /> Report
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-8 animate-fade-in-up">
      <section className="page-head flex items-center justify-between" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="page-title flex items-center gap-3" style={{ margin: 0 }}>
            <Shield className="w-7 h-7" style={{ color: 'var(--green)' }} />
            Nyumba Kumi
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Neighbourhood safety network — Tujiliane. Tushirikiane. Tuwe salama.</p>
        </div>
        {profile && (
          <div className="flex items-center gap-2">
            {rateLimitRemaining !== null && rateLimitRemaining <= 1 && (
              <span className="text-[9px] font-semibold px-2 py-1 rounded-full" style={{
                background: rateLimitRemaining === 0 ? 'color-mix(in oklab, var(--red) 20%, transparent)' : 'color-mix(in oklab, var(--gold) 20%, transparent)',
                color: rateLimitRemaining === 0 ? 'var(--red)' : 'var(--gold)',
              }}>
                {rateLimitRemaining}/3 left
              </span>
            )}
            <button onClick={() => setShowCreateForm(!showCreateForm)} style={{ ...s.btn, ...s.primaryBtn }}>
              {showCreateForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showCreateForm ? 'Cancel' : 'Alert'}
            </button>
          </div>
        )}
      </section>

      {/* Stats bar */}
      <div className="flex gap-3 mb-5">
        <div style={{ ...s.card, flex: 1, padding: 14, textAlign: 'center' }}>
          <Shield className="w-5 h-5 mx-auto mb-1" style={{ color: 'var(--green)' }} />
          <p className="text-lg font-bold" style={{ color: 'var(--ink)' }}>{alerts.length}</p>
          <p className="text-[10px]" style={{ color: 'var(--muted)' }}>Total alerts</p>
        </div>
        <div style={{ ...s.card, flex: 1, padding: 14, textAlign: 'center' }}>
          <Bell className="w-5 h-5 mx-auto mb-1" style={{ color: 'var(--earth)' }} />
          <p className="text-lg font-bold" style={{ color: 'var(--ink)' }}>{urgentAlerts.length}</p>
          <p className="text-[10px]" style={{ color: 'var(--muted)' }}>Urgent</p>
        </div>
        <div style={{ ...s.card, flex: 1, padding: 14, textAlign: 'center' }}>
          <Users className="w-5 h-5 mx-auto mb-1" style={{ color: 'var(--gold)' }} />
          <p className="text-lg font-bold" style={{ color: 'var(--ink)' }}>{trustedNeighbours.length}</p>
          <p className="text-[10px]" style={{ color: 'var(--muted)' }}>Trusted</p>
        </div>
      </div>

      {/* Safety Notice */}
      <section className="rounded-[14px] p-4 mb-5 flex items-start gap-3" style={{ background: 'color-mix(in oklab, var(--earth) 10%, transparent)', border: '1px solid color-mix(in oklab, var(--earth) 20%, transparent)' }}>
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--earth)' }} />
        <div>
          <p className="text-[11px] font-bold mb-1" style={{ color: 'var(--earth)' }}>Safety notice</p>
          <p className="text-[10px] leading-relaxed" style={{ color: 'color-mix(in oklab, var(--earth) 80%, var(--muted))' }}>Nyumba Kumi should never replace emergency services. If you need immediate help, call 999/112. This platform is for community awareness only.</p>
        </div>
      </section>

      {/* Create Alert Form */}
      {showCreateForm && (
        <section style={s.card} className="mb-5 animate-rise">
          <h3 className="font-bold text-sm mb-4" style={{ color: 'var(--ink)' }}>Create Safety Alert</h3>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {Object.entries(ALERT_CONFIG).map(([key, cfg]) => {
              const Icon = cfg.icon
              return (
                <button key={key} onClick={() => setFormData(prev => ({ ...prev, alert_type: key }))}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] text-[11px] font-medium transition-colors"
                  style={formData.alert_type === key ? { background: `color-mix(in oklab, ${cfg.color} 15%, var(--surface))`, color: cfg.color, border: `1px solid color-mix(in oklab, ${cfg.color} 30%, transparent)` } : { background: 'var(--raised)', color: 'var(--muted)', border: '1px solid var(--line)' }}>
                  <Icon className="w-4 h-4" /> {cfg.label}
                </button>
              )
            })}
          </div>
          <div className="mb-3">
            <label className="text-[10px] font-semibold block mb-1.5" style={{ color: 'var(--muted)' }}>Title</label>
            <input type="text" value={formData.title} onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))} style={s.input} placeholder="What's happening?" maxLength={120} />
          </div>
          <div className="mb-3">
            <label className="text-[10px] font-semibold block mb-1.5" style={{ color: 'var(--muted)' }}>Description</label>
            <textarea value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} style={{ ...s.input, resize: 'vertical', minHeight: 80 }} placeholder="Provide details for your neighbours..." rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-[10px] font-semibold block mb-1.5" style={{ color: 'var(--muted)' }}>Location</label>
              <input type="text" value={formData.location} onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))} style={s.input} placeholder="Area or landmark" />
            </div>
            <div>
              <label className="text-[10px] font-semibold block mb-1.5" style={{ color: 'var(--muted)' }}>Severity</label>
              <select value={formData.severity} onChange={e => setFormData(prev => ({ ...prev, severity: e.target.value }))} style={s.input}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <button onClick={handleCreateAlert} disabled={submitting} style={{ ...s.btn, ...s.primaryBtn, width: '100%', justifyContent: 'center' }}>
            {submitting ? 'Posting...' : 'Post Alert'}
          </button>
          <p className="text-[9px] mt-2 text-center" style={{ color: 'var(--muted)' }}>By posting you confirm this information is accurate and not misleading.</p>
        </section>
      )}

      {/* Urgent Alerts */}
      {urgentAlerts.length > 0 && (
        <section className="mb-5">
          <h3 className="text-[11px] font-bold flex items-center gap-2 mb-3" style={{ color: 'var(--red)' }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--red)' }} /> Urgent — {urgentAlerts.length} alert{urgentAlerts.length > 1 ? 's' : ''}
          </h3>
          <div className="space-y-3">{urgentAlerts.map(renderAlert)}</div>
        </section>
      )}

      {/* All Alerts */}
      <section className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] font-bold" style={{ color: 'var(--muted)' }}>{urgentAlerts.length > 0 ? 'Other alerts' : 'All alerts'}</h3>
          <span className="text-[10px]" style={{ color: 'var(--faint)' }}>{alerts.length - urgentAlerts.length} alerts</span>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} style={s.card}><div className="skeleton h-4 w-2/3 mb-3" style={{ background: 'var(--raised)', borderRadius: 8 }} /><div className="skeleton h-3 w-full mb-2" style={{ background: 'var(--raised)', borderRadius: 8 }} /><div className="skeleton h-3 w-1/2" style={{ background: 'var(--raised)', borderRadius: 8 }} /></div>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div style={s.card} className="text-center py-12">
            <Shield className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--muted)', opacity: 0.3 }} />
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>No alerts in your area</p>
            <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>Be the first to report something useful</p>
            {profile && <button onClick={() => setShowCreateForm(true)} style={{ ...s.btn, ...s.primaryBtn }}><Plus className="w-4 h-4" /> Create first alert</button>}
          </div>
        ) : (
          <div className="space-y-3">{alerts.map(renderAlert)}</div>
        )}
      </section>

      {/* Trusted Neighbours */}
      <section style={s.card} className="mb-5">
        <button onClick={() => setShowTrusted(!showTrusted)} className="w-full flex items-center justify-between" style={{ background: 'none', border: 0, cursor: 'pointer' }}>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" style={{ color: 'var(--green)' }} />
            <h3 className="font-bold text-sm" style={{ color: 'var(--ink)' }}>Trusted Neighbours</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'color-mix(in oklab, var(--green) 20%, var(--surface))', color: 'var(--green)' }}>{trustedNeighbours.length}</span>
          </div>
          {showTrusted ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--muted)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'var(--muted)' }} />}
        </button>
        {showTrusted && (
          <div className="mt-4 animate-rise">
            {!profile ? (
              <p className="text-xs text-center py-4" style={{ color: 'var(--muted)' }}><Link href="/login" style={{ color: 'var(--gold)' }}>Sign in</Link> to manage trusted neighbours</p>
            ) : trustedNeighbours.length === 0 ? (
              <div className="text-center py-6">
                <Users className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--muted)', opacity: 0.3 }} />
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>No trusted neighbours yet</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>Add neighbours you trust to receive their alerts more prominently.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {trustedNeighbours.map((n: any) => (
                  <div key={n.id} className="flex items-center gap-3 px-3 py-2 rounded-[10px]" style={{ background: 'var(--raised)' }}>
                    <div className="w-8 h-8 rounded-full grid place-items-center text-[10px] font-bold" style={{ background: 'var(--earth)', color: 'var(--gold)' }}>
                      {(n.full_name || n.username || 'N')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[12px] font-medium" style={{ color: 'var(--ink)' }}>{n.full_name || n.username}</p>
                      {n.county_hub && <p className="text-[9px]" style={{ color: 'var(--muted)' }}>{n.county_hub}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Neighbourhood Groups */}
      <section style={s.card} className="mb-5">
        <button onClick={() => setShowGroups(!showGroups)} className="w-full flex items-center justify-between" style={{ background: 'none', border: 0, cursor: 'pointer' }}>
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" style={{ color: 'var(--blue)' }} />
            <h3 className="font-bold text-sm" style={{ color: 'var(--ink)' }}>Neighbourhood Groups</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'color-mix(in oklab, var(--blue) 20%, var(--surface))', color: 'var(--blue)' }}>{groups.length}</span>
          </div>
          {showGroups ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--muted)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'var(--muted)' }} />}
        </button>
        {showGroups && (
          <div className="mt-4 animate-rise space-y-3">
            {!profile ? (
              <p className="text-xs text-center py-4" style={{ color: 'var(--muted)' }}><Link href="/login" style={{ color: 'var(--gold)' }}>Sign in</Link> to join neighbourhood groups</p>
            ) : (
              <>
                {!showCreateGroup && (
                  <button onClick={() => setShowCreateGroup(true)} style={{ ...s.smallBtn, ...s.primaryBtn }} className="mb-2">
                    <Plus className="w-3 h-3" /> Create Group
                  </button>
                )}
                {showCreateGroup && (
                  <div style={{ background: 'var(--raised)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
                    <div className="mb-2">
                      <input type="text" value={groupForm.name} onChange={e => setGroupForm(prev => ({ ...prev, name: e.target.value }))} style={s.input} placeholder="Group name (e.g. Lang'ata Residents)" />
                    </div>
                    <div className="mb-2">
                      <textarea value={groupForm.description} onChange={e => setGroupForm(prev => ({ ...prev, description: e.target.value }))} style={{ ...s.input, resize: 'vertical', minHeight: 50 }} placeholder="Description" rows={2} />
                    </div>
                    <div className="mb-2">
                      <input type="text" value={groupForm.county} onChange={e => setGroupForm(prev => ({ ...prev, county: e.target.value }))} style={s.input} placeholder="County (optional)" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleCreateGroup} disabled={creatingGroup} style={{ ...s.smallBtn, background: 'var(--gold)', color: 'var(--night)' }}>
                        {creatingGroup ? 'Creating...' : 'Create'}
                      </button>
                      <button onClick={() => setShowCreateGroup(false)} style={{ ...s.smallBtn, ...s.secondaryBtn }}>Cancel</button>
                    </div>
                  </div>
                )}
                {groups.length === 0 ? (
                  <div className="text-center py-6">
                    <Users className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--muted)', opacity: 0.3 }} />
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>No groups yet</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>Create or join a neighbourhood group to receive alerts.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {groups.map(g => {
                      const isMember = myGroupIds.has(g.id)
                      return (
                        <div key={g.id} className="flex items-center justify-between px-3 py-2.5 rounded-[10px]" style={{ background: 'var(--raised)' }}>
                          <div className="flex-1 min-w-0 mr-2">
                            <p className="text-[12px] font-medium" style={{ color: 'var(--ink)' }}>{g.name}</p>
                            <p className="text-[9px]" style={{ color: 'var(--muted)' }}>
                              {g.member_count} member{g.member_count !== 1 ? 's' : ''}
                              {g.county && <> · {g.county}</>}
                            </p>
                          </div>
                          {isMember ? (
                            <button onClick={() => handleLeaveGroup(g.id)} style={{ ...s.smallBtn, background: 'color-mix(in oklab, var(--red) 15%, transparent)', color: 'var(--red)' }}>Leave</button>
                          ) : (
                            <button onClick={() => handleJoinGroup(g.id)} style={{ ...s.smallBtn, ...s.primaryBtn }}><UserPlus className="w-3 h-3" /> Join</button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>

      {/* Admin Moderation Queue */}
      {isAdmin && (
        <section className="mb-5" style={{ ...s.card, borderColor: 'color-mix(in oklab, var(--red) 30%, transparent)' }}>
          <button onClick={() => { setShowModeration(!showModeration); if (!showModeration) fetchModQueue() }} className="w-full flex items-center justify-between" style={{ background: 'none', border: 0, cursor: 'pointer' }}>
            <div className="flex items-center gap-2">
              <Gavel className="w-4 h-4" style={{ color: 'var(--red)' }} />
              <h3 className="font-bold text-sm" style={{ color: 'var(--ink)' }}>Moderation Queue</h3>
              {modQueue.filter(m => m.status === 'pending').length > 0 && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--red)', color: '#fff' }}>
                  {modQueue.filter(m => m.status === 'pending').length}
                </span>
              )}
            </div>
            {showModeration ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--muted)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'var(--muted)' }} />}
          </button>
          {showModeration && (
            <div className="mt-4 animate-rise">
              {modLoading ? (
                <div className="text-center py-6"><RefreshCw className="w-5 h-5 animate-spin mx-auto" style={{ color: 'var(--muted)' }} /></div>
              ) : modQueue.length === 0 ? (
                <div className="text-center py-6">
                  <Shield className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--muted)', opacity: 0.3 }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Queue is clear</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>No reported alerts pending review.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {modQueue.map(item => (
                    <div key={item.id} className="px-3 py-2.5 rounded-[10px]" style={{ background: 'var(--raised)' }}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium" style={{ color: 'var(--ink)' }}>{item.reason}</p>
                          <p className="text-[9px]" style={{ color: 'var(--muted)' }}>
                            {item.status} · {new Date(item.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{
                          background: item.status === 'pending' ? 'color-mix(in oklab, var(--gold) 20%, transparent)' : item.status === 'reviewed' ? 'color-mix(in oklab, var(--blue) 20%, transparent)' : 'color-mix(in oklab, var(--green) 20%, transparent)',
                          color: item.status === 'pending' ? 'var(--gold)' : item.status === 'reviewed' ? 'var(--blue)' : 'var(--green)',
                        }}>{item.status}</span>
                      </div>
                      {item.status === 'pending' && (
                        <div className="flex gap-1.5 mt-2">
                          <button onClick={() => handleModerate(item.id, 'dismissed')} style={{ ...s.smallBtn, background: 'color-mix(in oklab, var(--green) 15%, transparent)', color: 'var(--green)' }}>Dismiss</button>
                          <button onClick={() => handleModerate(item.id, 'action_taken')} style={{ ...s.smallBtn, background: 'color-mix(in oklab, var(--gold) 15%, transparent)', color: 'var(--gold)' }}>Flag</button>
                          <button onClick={() => handleHideAlert(item.target_id)} style={{ ...s.smallBtn, background: 'color-mix(in oklab, var(--red) 15%, transparent)', color: 'var(--red)' }} className="ml-auto">Remove</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Privacy Info */}
      <section style={s.card} className="mb-5">
        <div className="flex items-start gap-3">
          <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--muted)' }} />
          <div>
            <h3 className="text-[11px] font-semibold mb-1" style={{ color: 'var(--muted)' }}>Privacy controls</h3>
            <p className="text-[10px] leading-relaxed" style={{ color: 'var(--muted)' }}>Your location is shared as a general area only — not your exact address. Confirmed alerts help the community but are not a replacement for official emergency reporting.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
