'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSupabase, useUser, useTheme, toast } from '@/app/providers'
import { useTranslation } from 'react-i18next'
import {
  User, Globe, Moon, Sun, Eye, Bell, Clock, AlertTriangle, Shield, MapPin,
  Users, Ban, Wallet, Download, AlertCircle, LogOut, HelpCircle
} from 'lucide-react'

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'sw', label: 'Kiswahili', native: 'Kiswahili' },
  { code: 'sheng', label: 'Sheng', native: 'Sheng' },
]

const NOTIF_TYPES = [
  { key: 'upvote', label: 'Upvotes' },
  { key: 'answer', label: 'Answers' },
  { key: 'reply', label: 'Replies' },
  { key: 'mention', label: 'Mentions' },
  { key: 'follow', label: 'New Followers' },
  { key: 'session_request', label: 'Session Requests' },
  { key: 'tip', label: 'Tips' },
  { key: 'payout', label: 'Payouts' },
  { key: 'badge', label: 'Badges' },
  { key: 'alert', label: 'Alerts' },
  { key: 'system', label: 'System' },
]

const s = {
  card: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 20, boxShadow: 'var(--card-shadow)' },
  input: { width: '100%', background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: 11, padding: '10px 14px', fontSize: 13, color: 'var(--ink)', outline: 'none' },
  btn: { padding: '10px 20px', borderRadius: 11, fontWeight: 700, fontSize: 12, border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all .2s var(--ease)' },
  primaryBtn: { background: 'var(--gold)', color: 'var(--night)' },
  secondaryBtn: { background: 'var(--raised)', color: 'var(--ink)', border: '1px solid var(--line)' },
  smallBtn: { padding: '6px 14px', borderRadius: 9, fontSize: 11, fontWeight: 600, border: 0, cursor: 'pointer', transition: 'all .2s var(--ease)' },
  tag: { padding: '8px 16px', borderRadius: 9, fontSize: 12, fontWeight: 600, border: '1px solid var(--line)', background: 'var(--raised)', color: 'var(--muted)', cursor: 'pointer', transition: 'all .2s var(--ease)' },
  tagActive: { background: 'var(--green)', color: 'var(--surface)', borderColor: 'var(--green)' },
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      className="w-11 h-6 rounded-full transition-colors relative flex-shrink-0 cursor-pointer"
      style={{ background: checked ? 'var(--green)' : 'var(--line)' }}>
      <div className="w-4 h-4 rounded-full absolute top-1 transition-transform"
        style={{ background: 'var(--surface)', transform: checked ? 'translateX(24px)' : 'translateX(4px)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </button>
  )
}

export default function SettingsPage() {
  const { user, profile, loading: userLoading, refreshProfile } = useUser()
  const supabase = useSupabase()
  const { theme, toggleTheme } = useTheme()
  const { i18n } = useTranslation()
  const [saving, setSaving] = useState(false)
  const [loadPrefs, setLoadPrefs] = useState(true)

  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [county, setCounty] = useState('')
  const [area, setArea] = useState('')
  const [phone, setPhone] = useState('')
  const [notifPref, setNotifPref] = useState('important')
  const [visibility, setVisibility] = useState('public')
  const [bio, setBio] = useState('')
  const [language, setLanguage] = useState('en')
  const [translationHelper, setTranslationHelper] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [dataSaver, setDataSaver] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({})
  const [sessionReminders, setSessionReminders] = useState(true)
  const [nyumbaKumiAlerts, setNyumbaKumiAlerts] = useState(true)
  const [discoverable, setDiscoverable] = useState(true)
  const [approxLocation, setApproxLocation] = useState(true)
  const [msgPrivacy, setMsgPrivacy] = useState<'everyone' | 'followers' | 'none'>('everyone')
  const [mpesaNumber, setMpesaNumber] = useState('')
  const [offlineSync, setOfflineSync] = useState(false)
  const [showDeactivate, setShowDeactivate] = useState(false)

  const STORAGE_KEY = 'kw_settings'

  useEffect(() => {
    if (!profile) return
    setFullName(String(profile.full_name || ''))
    setUsername(String(profile.username || ''))
    setCounty(String(profile.county_hub || ''))
    setArea(String(profile.area || ''))
    setPhone(String(profile.phone || ''))
    setNotifPref(String(profile.notif_pref || 'important'))
    setVisibility(String(profile.visibility || 'public'))
    setBio(String(profile.bio || ''))
    setLanguage(String(profile.preferred_language || 'en'))
    loadLocalPrefs()
  }, [profile])

  const loadLocalPrefs = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const p = JSON.parse(raw)
        setTranslationHelper(p.translationHelper ?? false)
        setReducedMotion(p.reducedMotion ?? false)
        setDataSaver(p.dataSaver ?? false)
        setNotifPrefs(p.notifPrefs ?? {})
        setSessionReminders(p.sessionReminders ?? true)
        setNyumbaKumiAlerts(p.nyumbaKumiAlerts ?? true)
        setDiscoverable(p.discoverable ?? true)
        setApproxLocation(p.approxLocation ?? true)
        setMsgPrivacy(p.msgPrivacy || 'everyone')
        setMpesaNumber(p.mpesaNumber || '')
        setOfflineSync(p.offlineSync ?? false)
      }
    } catch {} finally {
      setLoadPrefs(false)
    }
  }

  const persistPrefs = (patch: Record<string, any>) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const current = raw ? JSON.parse(raw) : {}
      const merged = { ...current, ...patch }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    } catch {}
  }

  const handleLanguageChange = async (code: string) => {
    setLanguage(code)
    i18n.changeLanguage(code)
    if (user) {
      await supabase.from('profiles').update({ preferred_language: code }).eq('id', user.id)
    }
    persistPrefs({ language: code })
    toast(`Language set to ${LANGUAGES.find(l => l.code === code)?.label || code}`)
  }

  const saveProfile = async () => {
    if (!user) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, username, county_hub: county, area: area || null, phone: phone || null, bio, preferred_language: language, notif_pref: notifPref, visibility })
        .eq('id', user.id)
      if (error) throw error
      await refreshProfile()
      toast('Profile saved')
    } catch (err: any) {
      toast(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleSignOutAll = async () => {
    await supabase.auth.signOut({ scope: 'global' })
    localStorage.clear()
    window.location.href = '/login'
  }

  const handleDeactivate = async () => {
    if (!user) return
    await supabase.from('profiles').update({ is_deactivated: true }).eq('id', user.id)
    await supabase.auth.signOut()
    localStorage.clear()
    window.location.href = '/'
  }

  if (userLoading || loadPrefs) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: 'var(--green)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="mb-4 text-sm" style={{ color: 'var(--muted)' }}>Sign in to manage settings</p>
        <Link href="/login" className="btn btn-primary">Sign in</Link>
      </div>
    )
  }

  return (
    <div className="pb-8 animate-fade-in-up" style={{ maxWidth: 640 }}>
      <section className="page-head">
        <div>
          <h1 className="page-title" style={{ color: 'var(--ink)' }}>Settings</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Manage your account and preferences</p>
        </div>
      </section>

      {/* Profile */}
      <section style={s.card} className="mb-5">
        <h2 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--ink)' }}>
          <User className="w-4 h-4" style={{ color: 'var(--green)' }} /> Profile
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Full Name</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} style={s.input} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} style={s.input} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>County</label>
            <input value={county} onChange={e => setCounty(e.target.value)} style={s.input} placeholder="e.g. Nairobi, Uasin Gishu" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Town or area</label>
            <input value={area} onChange={e => setArea(e.target.value)} style={s.input} placeholder="e.g. Westlands, Eldoret" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Phone number</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} style={s.input} placeholder="07XX XXX XXX" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Bio</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} style={{ ...s.input, resize: 'none', minHeight: 80 }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Notifications</label>
              <select value={notifPref} onChange={e => setNotifPref(e.target.value)} style={s.input}>
                <option value="important">Important updates only</option>
                <option value="replies">Replies and mentions</option>
                <option value="all">Everything useful</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Profile visibility</label>
              <select value={visibility} onChange={e => setVisibility(e.target.value)} style={s.input}>
                <option value="public">Public to members</option>
                <option value="followers">Only people I follow</option>
              </select>
            </div>
          </div>
          <button onClick={saveProfile} disabled={saving} style={{ ...s.btn, ...s.primaryBtn }}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </section>

      {/* Language */}
      <section style={s.card} className="mb-5">
        <h2 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--ink)' }}>
          <Globe className="w-4 h-4" style={{ color: 'var(--gold)' }} /> Language
        </h2>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map(l => (
              <button key={l.code}
                onClick={() => handleLanguageChange(l.code)}
                style={{ ...s.tag, ...(language === l.code ? s.tagActive : {}) }}>
                {l.native}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between py-2 px-3 rounded-xl" style={{ background: 'var(--raised)' }}>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Translation Helper</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Auto-translate posts to your language</p>
            </div>
            <Toggle checked={translationHelper} onChange={v => { setTranslationHelper(v); persistPrefs({ translationHelper: v }) }} />
          </div>
        </div>
      </section>

      {/* Display */}
      <section style={s.card} className="mb-5">
        <h2 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--ink)' }}>
          <Eye className="w-4 h-4" style={{ color: 'var(--blue)' }} /> Display
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2 px-3 rounded-xl" style={{ background: 'var(--raised)' }}>
            <div className="flex items-center gap-2">
              {theme === 'dark' ? <Moon className="w-4 h-4" style={{ color: 'var(--muted)' }} /> : <Sun className="w-4 h-4" style={{ color: 'var(--gold)' }} />}
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Dark Mode</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>Toggle dark/light theme</p>
              </div>
            </div>
            <Toggle checked={theme === 'dark'} onChange={toggleTheme} />
          </div>
          <div className="flex items-center justify-between py-2 px-3 rounded-xl" style={{ background: 'var(--raised)' }}>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Reduced Motion</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Minimize animations</p>
            </div>
            <Toggle checked={reducedMotion} onChange={v => { setReducedMotion(v); persistPrefs({ reducedMotion: v }) }} />
          </div>
          <div className="flex items-center justify-between py-2 px-3 rounded-xl" style={{ background: 'var(--raised)' }}>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Data Saver</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Reduce image quality and auto-play</p>
            </div>
            <Toggle checked={dataSaver} onChange={v => { setDataSaver(v); persistPrefs({ dataSaver: v }) }} />
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section style={s.card} className="mb-5">
        <h2 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--ink)' }}>
          <Bell className="w-4 h-4" style={{ color: 'var(--gold)' }} /> Notifications
        </h2>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {NOTIF_TYPES.map(nt => (
              <div key={nt.key} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'var(--raised)' }}>
                <span className="text-sm" style={{ color: 'var(--ink)' }}>{nt.label}</span>
                <Toggle checked={notifPrefs[nt.key] !== false}
                  onChange={v => { const u = { ...notifPrefs, [nt.key]: v }; setNotifPrefs(u); persistPrefs({ notifPrefs: u }) }} />
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12, marginTop: 12 }}>
            <div className="flex items-center justify-between py-2 px-3 rounded-lg mb-2" style={{ background: 'var(--raised)' }}>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Session Reminders</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>Reminders before scheduled sessions</p>
                </div>
              </div>
              <Toggle checked={sessionReminders} onChange={v => { setSessionReminders(v); persistPrefs({ sessionReminders: v }) }} />
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: 'var(--raised)' }}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" style={{ color: 'var(--earth)' }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Nyumba Kumi Alerts</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>Community safety alerts</p>
                </div>
              </div>
              <Toggle checked={nyumbaKumiAlerts} onChange={v => { setNyumbaKumiAlerts(v); persistPrefs({ nyumbaKumiAlerts: v }) }} />
            </div>
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section style={s.card} className="mb-5">
        <h2 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--ink)' }}>
          <Shield className="w-4 h-4" style={{ color: 'var(--green)' }} /> Privacy
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: 'var(--raised)' }}>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: 'var(--muted)' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Discoverability</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>Allow others to find you</p>
              </div>
            </div>
            <Toggle checked={discoverable} onChange={v => { setDiscoverable(v); persistPrefs({ discoverable: v }) }} />
          </div>
          <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: 'var(--raised)' }}>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" style={{ color: 'var(--muted)' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Approximate Location</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>Show your county on profile</p>
              </div>
            </div>
            <Toggle checked={approxLocation} onChange={v => { setApproxLocation(v); persistPrefs({ approxLocation: v }) }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>Message Privacy</label>
            <div className="flex gap-2">
              {(['everyone', 'followers', 'none'] as const).map(opt => (
                <button key={opt} onClick={() => { setMsgPrivacy(opt); persistPrefs({ msgPrivacy: opt }) }}
                  style={{ ...s.smallBtn, ...(msgPrivacy === opt ? { background: 'var(--green)', color: 'var(--surface)' } : { background: 'var(--raised)', color: 'var(--muted)', border: '1px solid var(--line)' }) }}>
                  {opt === 'everyone' ? 'Everyone' : opt === 'followers' ? 'Followers Only' : 'No One'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* M-Pesa */}
      <section style={s.card} className="mb-5">
        <h2 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--ink)' }}>
          <Wallet className="w-4 h-4" style={{ color: 'var(--green)' }} /> M-Pesa
        </h2>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Linked M-Pesa Number</label>
          <div className="flex gap-2">
            <input value={mpesaNumber} onChange={e => setMpesaNumber(e.target.value)} style={s.input} className="flex-1" placeholder="07XX XXX XXX" />
            <button onClick={() => { persistPrefs({ mpesaNumber }); toast('M-Pesa number saved') }} style={{ ...s.smallBtn, ...s.primaryBtn }}>Save</button>
          </div>
        </div>
      </section>

      {/* Offline */}
      <section style={s.card} className="mb-5">
        <h2 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--ink)' }}>
          <Download className="w-4 h-4" style={{ color: 'var(--blue)' }} /> Offline
        </h2>
        <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: 'var(--raised)' }}>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Offline Sync</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Keep recent posts available offline</p>
          </div>
          <Toggle checked={offlineSync} onChange={v => { setOfflineSync(v); persistPrefs({ offlineSync: v }) }} />
        </div>
      </section>

      {/* Account */}
      <section style={{ ...s.card, borderColor: 'color-mix(in oklab, var(--red) 30%, transparent)' }} className="mb-5">
        <h2 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--red)' }}>
          <AlertCircle className="w-4 h-4" /> Account
        </h2>
        <div className="space-y-3">
          {!showDeactivate ? (
            <button onClick={() => setShowDeactivate(true)} className="text-sm" style={{ color: 'var(--red)', textDecoration: 'underline', background: 'none', border: 0, cursor: 'pointer' }}>
              Deactivate Account
            </button>
          ) : (
            <div className="p-3 rounded-lg" style={{ background: 'color-mix(in oklab, var(--red) 15%, var(--surface))', border: '1px solid color-mix(in oklab, var(--red) 30%, transparent)' }}>
              <p className="text-sm mb-2" style={{ color: 'var(--red)' }}>This can be reversed by contacting support.</p>
              <div className="flex gap-2">
                <button onClick={handleDeactivate} style={{ ...s.smallBtn, background: 'var(--red)', color: '#fff' }}>Confirm</button>
                <button onClick={() => setShowDeactivate(false)} style={{ ...s.smallBtn, background: 'var(--raised)', color: 'var(--ink)', border: '1px solid var(--line)' }}>Cancel</button>
              </div>
            </div>
          )}
          <button onClick={handleSignOutAll} className="flex items-center gap-2 text-sm transition-colors" style={{ color: 'var(--muted)', background: 'none', border: 0, cursor: 'pointer' }}>
            <LogOut className="w-4 h-4" /> Sign out of all devices
          </button>
          <Link href="/support" className="flex items-center gap-2 text-sm transition-colors" style={{ color: 'var(--muted)', textDecoration: 'none' }}>
            <HelpCircle className="w-4 h-4" /> Contact Support
          </Link>
        </div>
      </section>
    </div>
  )
}
