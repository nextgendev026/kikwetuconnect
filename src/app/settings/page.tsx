'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSupabase, useUser, toast } from '@/app/providers'
import {
  User, Globe, Moon, Sun, Eye, Bell, Clock, AlertTriangle, Shield, MapPin,
  Users, Ban, Wallet, Download, AlertCircle, LogOut, HelpCircle
} from 'lucide-react'

const languages = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'sw', label: 'Kiswahili', native: 'Kiswahili' },
  { code: 'sheng', label: 'Sheng', native: 'Sheng' },
]

const notifTypes = [
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

export default function SettingsPage() {
  const { user, profile, loading: userLoading, refreshProfile } = useUser()
  const supabase = useSupabase()
  const [saving, setSaving] = useState(false)
  const [loadPrefs, setLoadPrefs] = useState(true)

  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [county, setCounty] = useState('')
  const [bio, setBio] = useState('')
  const [language, setLanguage] = useState('en')
  const [translationHelper, setTranslationHelper] = useState(false)
  const [darkMode, setDarkMode] = useState(true)
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
    setFullName(profile.full_name || '')
    setUsername(profile.username || '')
    setCounty(profile.county_hub || '')
    setBio(profile.bio || '')
    setLanguage(profile.preferred_language || 'en')
    loadLocalPrefs()
  }, [profile])

  const loadLocalPrefs = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const p = JSON.parse(raw)
        setTranslationHelper(p.translationHelper ?? false)
        setDarkMode(p.darkMode ?? true)
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

  const saveProfile = async () => {
    if (!user) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          username,
          county_hub: county,
          bio,
          preferred_language: language,
        })
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
    window.location.href = '/'
  }

  const handleDeactivate = async () => {
    if (!user) return
    await supabase.from('profiles').update({ role: 'deactivated' }).eq('id', user.id)
    await supabase.auth.signOut()
    localStorage.clear()
    window.location.href = '/'
  }

  if (userLoading || loadPrefs) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-green border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-muted mb-4">Sign in to manage settings</p>
        <Link href="/login" className="btn btn-primary">Sign in</Link>
      </div>
    )
  }

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 cursor-pointer ${
        checked ? 'bg-green' : 'bg-[oklch(29%_.025_151)]'
      }`}
    >
      <div className={`w-4 h-4 rounded-full bg-cream absolute top-1 transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`} />
    </button>
  )

  return (
    <>
      <section className="page-head">
        <h1 className="page-title">Settings</h1>
        <p className="text-muted text-sm">Manage your account and preferences</p>
      </section>

      {/* Profile */}
      <section className="card section mb-6">
        <h2 className="font-bold text-sm mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-green" /> Profile
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Full Name</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} className="input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} className="input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">County</label>
            <input value={county} onChange={e => setCounty(e.target.value)} className="input w-full" placeholder="e.g. Nairobi, Uasin Gishu" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Bio</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} className="input w-full resize-y min-h-[80px]" rows={3} />
          </div>
          <button onClick={saveProfile} disabled={saving} className="btn btn-primary">
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </section>

      {/* Language */}
      <section className="card section mb-6">
        <h2 className="font-bold text-sm mb-4 flex items-center gap-2">
          <Globe className="w-4 h-4 text-gold" /> Language
        </h2>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {languages.map(l => (
              <button
                key={l.code}
                onClick={() => { setLanguage(l.code); refreshProfile() }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  language === l.code ? 'bg-green text-night' : 'bg-night2 text-muted border border-[oklch(29%_.025_151)] hover:text-cream'
                }`}
              >
                {l.native}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Translation Helper</p>
              <p className="text-xs text-muted">Auto-translate posts to your language</p>
            </div>
            <Toggle checked={translationHelper} onChange={v => { setTranslationHelper(v); persistPrefs({ translationHelper: v }) }} />
          </div>
        </div>
      </section>

      {/* Display */}
      <section className="card section mb-6">
        <h2 className="font-bold text-sm mb-4 flex items-center gap-2">
          <Eye className="w-4 h-4 text-blue" /> Display
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {darkMode ? <Moon className="w-4 h-4 text-muted" /> : <Sun className="w-4 h-4 text-gold" />}
              <div>
                <p className="text-sm">Dark Mode</p>
                <p className="text-xs text-muted">Toggle dark/light theme</p>
              </div>
            </div>
            <Toggle checked={darkMode} onChange={v => { setDarkMode(v); persistPrefs({ darkMode: v }) }} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Reduced Motion</p>
              <p className="text-xs text-muted">Minimize animations</p>
            </div>
            <Toggle checked={reducedMotion} onChange={v => { setReducedMotion(v); persistPrefs({ reducedMotion: v }) }} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Data Saver</p>
              <p className="text-xs text-muted">Reduce image quality and auto-play</p>
            </div>
            <Toggle checked={dataSaver} onChange={v => { setDataSaver(v); persistPrefs({ dataSaver: v }) }} />
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="card section mb-6">
        <h2 className="font-bold text-sm mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4 text-gold" /> Notifications
        </h2>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {notifTypes.map(nt => (
              <div key={nt.key} className="flex items-center justify-between px-3 py-2 rounded-lg bg-night2">
                <span className="text-sm">{nt.label}</span>
                <Toggle
                  checked={notifPrefs[nt.key] !== false}
                  onChange={v => {
                    const updated = { ...notifPrefs, [nt.key]: v }
                    setNotifPrefs(updated)
                    persistPrefs({ notifPrefs: updated })
                  }}
                />
              </div>
            ))}
          </div>
          <div className="border-t border-[oklch(29%_.025_151)] pt-3 mt-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted" />
                <div>
                  <p className="text-sm">Session Reminders</p>
                  <p className="text-xs text-muted">Reminders before scheduled sessions</p>
                </div>
              </div>
              <Toggle checked={sessionReminders} onChange={v => { setSessionReminders(v); persistPrefs({ sessionReminders: v }) }} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-earth" />
                <div>
                  <p className="text-sm">Nyumba Kumi Alerts</p>
                  <p className="text-xs text-muted">Community safety alerts</p>
                </div>
              </div>
              <Toggle checked={nyumbaKumiAlerts} onChange={v => { setNyumbaKumiAlerts(v); persistPrefs({ nyumbaKumiAlerts: v }) }} />
            </div>
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="card section mb-6">
        <h2 className="font-bold text-sm mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-green" /> Privacy
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted" />
              <div>
                <p className="text-sm">Discoverability</p>
                <p className="text-xs text-muted">Allow others to find you</p>
              </div>
            </div>
            <Toggle checked={discoverable} onChange={v => { setDiscoverable(v); persistPrefs({ discoverable: v }) }} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted" />
              <div>
                <p className="text-sm">Approximate Location</p>
                <p className="text-xs text-muted">Show your county on profile</p>
              </div>
            </div>
            <Toggle checked={approxLocation} onChange={v => { setApproxLocation(v); persistPrefs({ approxLocation: v }) }} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-2">Message Privacy</label>
            <div className="flex gap-2">
              {(['everyone', 'followers', 'none'] as const).map(opt => (
                <button
                  key={opt}
                  onClick={() => { setMsgPrivacy(opt); persistPrefs({ msgPrivacy: opt }) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                    msgPrivacy === opt ? 'bg-green text-night' : 'bg-night2 text-muted border border-[oklch(29%_.025_151)]'
                  }`}
                >
                  {opt === 'everyone' ? 'Everyone' : opt === 'followers' ? 'Followers Only' : 'No One'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* M-Pesa */}
      <section className="card section mb-6">
        <h2 className="font-bold text-sm mb-4 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-green" /> M-Pesa
        </h2>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Linked M-Pesa Number</label>
          <div className="flex gap-2">
            <input value={mpesaNumber} onChange={e => setMpesaNumber(e.target.value)} className="input flex-1" placeholder="07XX XXX XXX" />
            <button onClick={() => { persistPrefs({ mpesaNumber }); toast('M-Pesa number saved') }} className="btn btn-primary btn-sm">Save</button>
          </div>
        </div>
      </section>

      {/* Offline */}
      <section className="card section mb-6">
        <h2 className="font-bold text-sm mb-4 flex items-center gap-2">
          <Download className="w-4 h-4 text-blue" /> Offline
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">Offline Sync</p>
            <p className="text-xs text-muted">Keep recent posts available offline</p>
          </div>
          <Toggle checked={offlineSync} onChange={v => { setOfflineSync(v); persistPrefs({ offlineSync: v }) }} />
        </div>
      </section>

      {/* Account */}
      <section className="card section mb-6">
        <h2 className="font-bold text-sm mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red" /> Account
        </h2>
        <div className="space-y-3">
          {!showDeactivate ? (
            <button onClick={() => setShowDeactivate(true)} className="text-sm text-red hover:underline">
              Deactivate Account
            </button>
          ) : (
            <div className="p-3 rounded-lg bg-red/10 border border-red/30">
              <p className="text-sm text-red mb-2">This can be reversed by contacting support.</p>
              <div className="flex gap-2">
                <button onClick={handleDeactivate} className="btn btn-danger btn-sm">Confirm</button>
                <button onClick={() => setShowDeactivate(false)} className="btn btn-secondary btn-sm">Cancel</button>
              </div>
            </div>
          )}
          <button onClick={handleSignOutAll} className="flex items-center gap-2 text-sm text-muted hover:text-cream transition-colors">
            <LogOut className="w-4 h-4" /> Sign out of all devices
          </button>
          <Link href="/support" className="flex items-center gap-2 text-sm text-muted hover:text-cream transition-colors">
            <HelpCircle className="w-4 h-4" /> Contact Support
          </Link>
        </div>
      </section>
    </>
  )
}
