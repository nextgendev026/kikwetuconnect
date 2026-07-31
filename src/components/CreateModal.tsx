'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useSupabase, useUser, toast } from '@/app/providers'
import { X, PenSquare, HelpCircle, BarChart3, ShoppingBag, Shield, Image, Video, Mic, Trash2, Upload, Plus, Minus, Coins, MapPin, Tag } from 'lucide-react'
import imageCompress from 'browser-image-compression'
import MediaEditor from '@/components/MediaEditor'

const TYPES = [
  { id: 'post', label: 'Post', icon: PenSquare, color: 'var(--green)' },
  { id: 'question', label: 'Question', icon: HelpCircle, color: 'var(--gold)' },
  { id: 'poll', label: 'Poll', icon: BarChart3, color: 'var(--blue)' },
  { id: 'listing', label: 'Mtaa listing', icon: ShoppingBag, color: 'var(--earth)' },
  { id: 'alert', label: 'Safety update', icon: Shield, color: 'var(--red)' },
]

const LABELS: Record<string, string> = {
  post: 'What is on your mind?',
  question: 'What do you want to learn?',
  poll: 'What should the community weigh in on?',
  listing: 'What are you offering?',
  alert: 'What useful update should neighbours know?',
}

const PLACEHOLDERS: Record<string, string> = {
  post: 'Share a useful thought, update, or local insight...',
  question: 'Ask a specific question to get answers from experts...',
  poll: 'Ask the community to weigh in...',
  listing: 'Describe what you are selling or offering...',
  alert: 'Describe the safety concern or update...',
}

const LISTING_CATEGORIES = ['Produce', 'Services', 'Crafts', 'Livestock', 'Tools', 'Other']
const ALERT_TYPES = ['theft', 'fire', 'flood', 'accident', 'suspicious', 'power_outage', 'water', 'other']
const SEVERITIES = ['low', 'medium', 'high', 'critical']
const COUNTIES = ['Nairobi', 'Mombasa', 'Kisumu', 'Eldoret', 'Kitale', 'Nakuru', 'Thika', 'Kericho', 'Isiolo', 'Kilifi', 'Kwale', 'Machakos', 'Kajiado', 'Narok', 'Kisii', 'Bungoma', 'Busia', 'Kakamega', 'Nyeri', 'Embu', 'Meru', 'Kiambu', 'Makueni']

export default function CreateModal() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('post')
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [mediaFiles, setMediaFiles] = useState<{ file: File; preview: string; type: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [countyTag, setCountyTag] = useState<string | null>(null)
  const [barazaId, setBarazaId] = useState<string | null>(null)
  const [spaceId, setSpaceId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const supabase = useSupabase()
  const { user } = useUser()

  // Poll state
  const [pollOptions, setPollOptions] = useState<string[]>(['', ''])

  // Listing state
  const [listingPrice, setListingPrice] = useState('')
  const [listingCurrency, setListingCurrency] = useState('KES')
  const [listingCategory, setListingCategory] = useState('Produce')
  const [listingCounty, setListingCounty] = useState('')
  const [listingLocation, setListingLocation] = useState('')

  // Alert state
  const [alertType, setAlertType] = useState('suspicious')
  const [alertSeverity, setAlertSeverity] = useState('medium')
  const [alertUrgent, setAlertUrgent] = useState(false)
  const [alertLocation, setAlertLocation] = useState('')
  const [editingMedia, setEditingMedia] = useState<{ file: File; type: 'image' | 'video' | 'audio' } | null>(null)

  // Bounty
  const [bountyTokens, setBountyTokens] = useState(0)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.type) {
        const t = detail.type
        if (TYPES.some(tp => tp.id === t)) setType(t)
      }
      setCountyTag(detail?.countyTag || null)
      setBarazaId(detail?.barazaId || null)
      setSpaceId(detail?.spaceId || null)
      setOpen(true)
    }
    document.addEventListener('open-create-modal', handler)
    return () => document.removeEventListener('open-create-modal', handler)
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false)
    if (e.key !== 'Tab' || !modalRef.current) return
    const focusable = modalRef.current.querySelectorAll<HTMLElement>('button, textarea, select, input, [tabindex]:not([tabindex="-1"])')
    if (!focusable.length) return
    const first = focusable[0], last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }, [])

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => textareaRef.current?.focus(), 50)
    document.addEventListener('keydown', handleKeyDown)
    return () => { clearTimeout(timer); document.removeEventListener('keydown', handleKeyDown) }
  }, [open, handleKeyDown])

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>, mediaType: string) => {
    const files = Array.from(e.target.files || [])
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) { toast(`${file.name} is too large (max 10MB)`); continue }
      try {
        const processed = mediaType === 'image' && file.type.startsWith('image/')
          ? await imageCompress(file, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true })
          : file
        if (mediaType === 'image' || mediaType === 'video' || mediaType === 'audio') {
          setEditingMedia({ file: processed, type: mediaType as 'image' | 'video' | 'audio' })
        } else {
          const preview = URL.createObjectURL(processed)
          setMediaFiles(prev => [...prev, { file: processed, preview, type: mediaType }])
        }
      } catch { toast(`Failed to process ${file.name}`) }
    }
    e.target.value = ''
  }

  const removeMedia = (index: number) => {
    URL.revokeObjectURL(mediaFiles[index].preview)
    setMediaFiles(prev => prev.filter((_, i) => i !== index))
  }

  const uploadMedia = async (): Promise<string[]> => {
    if (mediaFiles.length === 0) return []
    const urls: string[] = []
    for (const m of mediaFiles) {
      const ext = (m.file.name.split('.').pop() || 'bin').replace(/[^a-zA-Z0-9]/g, '')
      const path = `posts/${user!.id}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('public-media').upload(path, m.file, { upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('public-media').getPublicUrl(path)
      urls.push(publicUrl)
    }
    return urls
  }

  const resetForm = () => {
    setOpen(false); setText(''); setTitle(''); setMediaFiles([]); setCountyTag(null)
    setBarazaId(null); setSpaceId(null); setPollOptions(['', '']); setListingPrice('')
    setListingCurrency('KES'); setListingCategory('Produce'); setListingCounty('')
    setListingLocation(''); setAlertType('suspicious'); setAlertSeverity('medium')
    setAlertUrgent(false); setAlertLocation(''); setBountyTokens(0)
    mediaFiles.forEach(m => URL.revokeObjectURL(m.preview))
  }

  const handlePublish = async () => {
    if (!user) { toast('Please sign in first'); return }
    if (type === 'listing') {
      if (!title.trim()) { toast('Add a title for your listing'); return }
      if (!listingPrice || isNaN(Number(listingPrice)) || Number(listingPrice) <= 0) { toast('Enter a valid price'); return }
      if (!listingCounty) { toast('Select a county'); return }
    } else if (type === 'alert') {
      if (!title.trim()) { toast('Add a title for the alert'); return }
      if (!countyTag && !alertLocation) { toast('Add a location'); return }
    } else if (type === 'poll') {
      const valid = pollOptions.filter(o => o.trim())
      if (valid.length < 2) { toast('Add at least 2 poll options'); return }
      if (!text.trim()) { toast('Add context for your poll'); return }
    } else {
      if (!text.trim()) { toast('Add a little context first'); return }
    }

    setUploading(true)
    try {
      const mediaUrls = mediaFiles.length > 0 ? await uploadMedia() : []

      if (type === 'listing') {
        const { error } = await supabase.from('marketplace_listings').insert({
          seller_id: user.id, title: title.trim(), description: text.trim(),
          category: listingCategory, price: Number(listingPrice), currency: listingCurrency,
          county: listingCounty, location: listingLocation || null,
          images: mediaUrls.length > 0 ? mediaUrls : null,
        })
        if (error) throw error
        toast('Listing published!')
        window.location.href = '/market'
        resetForm()
        return
      }

      if (type === 'alert') {
        const { error } = await supabase.from('nyumba_kumi_alerts').insert({
          user_id: user.id, type: alertType, title: title.trim(),
          description: text.trim(), county: countyTag || alertLocation,
          approximate_location: alertLocation || null, severity: alertSeverity,
          is_urgent: alertUrgent,
        })
        if (error) throw error
        toast('Alert sent to neighbours!')
        window.location.href = '/nyumba'
        resetForm()
        return
      }

      const postType = type === 'question' ? 'inquiry' : type === 'poll' ? 'poll' : 'baraza'
      const catMap: Record<string, string> = { post: 'Post', question: 'Ask', poll: 'Poll' }
      const insertData: any = {
        user_id: user.id, post_type: postType, content: text,
        title: title || text.split('\n')[0].slice(0, 100),
        media_url: mediaUrls[0] || null,
        media_type: mediaFiles[0]?.type || null,
        category: catMap[type] || 'Post',
        county_tag: countyTag,
        baraza_id: barazaId,
        space_id: spaceId,
        bounty_tokens: type === 'question' ? bountyTokens : 0,
      }

      if (type === 'poll') {
        insertData.poll_options = pollOptions.filter(o => o.trim()).map(o => ({ text: o.trim(), votes: 0 }))
      }

      const { data: post, error } = await supabase.from('posts').insert(insertData).select().single()
      if (error) throw error

      if (type === 'poll' && post) {
        const opts = pollOptions.filter(o => o.trim()).map(o => ({ post_id: post.id, option_text: o.trim(), votes: 0 }))
        await supabase.from('poll_options').insert(opts)
      }

      toast('Published!')
      resetForm()
    } catch (e: any) { toast(e?.message || 'Failed to publish') }
    finally { setUploading(false) }
  }

  const inp = { background: 'var(--raised)', border: '1px solid var(--line)', borderRadius: 9, padding: '9px 12px', fontSize: 12, color: 'var(--ink)', outline: 'none', width: '100%' as const }
  const label = { fontSize: 10, color: 'var(--muted)', fontWeight: 600, display: 'block' as const, marginBottom: 4 }
  const sel = { ...inp, cursor: 'pointer' as const }
  const row = { display: 'flex', gap: 10, marginBottom: 12 }

  return (
    <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="create-modal-title" tabIndex={-1} style={{
      display: open ? 'flex' : 'none',
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'color-mix(in oklab, var(--night) 70%, transparent)',
      alignItems: 'center', justifyContent: 'center', padding: 18,
      overflowY: 'auto',
    }} onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
      <div className="animate-rise" style={{
        width: 'min(560px, 100%)', background: 'var(--surface)',
        border: '1px solid var(--line)', borderRadius: 22, padding: 24,
        boxShadow: '0 25px 60px color-mix(in oklab, var(--night) 30%, transparent)',
        maxHeight: '90vh', overflowY: 'auto',
        margin: 'auto',
      }} onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 id="create-modal-title" style={{ font: '800 20px var(--jakarta)', letterSpacing: '-.04em', color: 'var(--ink)', margin: 0 }}>
              Share something useful
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>Choose a format, type your thought, and share it.</p>
          </div>
          <button onClick={() => setOpen(false)}
            style={{ background: 'var(--raised)', color: 'var(--muted)', border: 0, cursor: 'pointer', width: 32, height: 32, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Type selector */}
        <div className="grid grid-cols-2 sm:flex sm:gap-2 gap-1.5 mb-4">
          {TYPES.map(t => {
            const Icon = t.icon; const active = type === t.id
            return (
              <button key={t.id} onClick={() => setType(t.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '7px 14px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                  border: active ? '2px solid ' + t.color : '1px solid var(--line)',
                  background: active ? `color-mix(in oklab, ${t.color} 12%, var(--surface))` : 'var(--surface)',
                  color: active ? t.color : 'var(--muted)',
                  cursor: 'pointer', transition: 'all .2s var(--ease)',
                }}>
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            )
          })}
        </div>

        {/* Media editor overlay */}
        {editingMedia && (
          <MediaEditor file={editingMedia.file} type={editingMedia.type}
            onComplete={(editedFile) => {
              const preview = URL.createObjectURL(editedFile)
              setMediaFiles(prev => [...prev, { file: editedFile, preview, type: editingMedia.type }])
              setEditingMedia(null)
            }}
            onCancel={() => setEditingMedia(null)} />
        )}

        {/* Title field (for question, listing, alert) */}
        {['question', 'listing', 'alert'].includes(type) && (
          <div style={{ marginBottom: 12 }}>
            <label style={label}>{type === 'listing' ? 'Listing title' : 'Title'}</label>
            <input style={inp} placeholder={type === 'listing' ? 'e.g. Fresh organic sukuma wiki' : type === 'alert' ? 'e.g. Suspicious vehicle on Kimathi Street' : 'e.g. How do I start a poultry farm?'}
              value={title} onChange={e => setTitle(e.target.value)} />
          </div>
        )}

        {/* Body text */}
        <div style={{ marginBottom: 12 }}>
          <label style={label}>{type === 'poll' ? 'Context' : LABELS[type] || 'What is on your mind?'}</label>
          <textarea ref={textareaRef} value={text} onChange={e => setText(e.target.value)}
            placeholder={PLACEHOLDERS[type] || 'Share a useful thought, update, or local insight...'}
            rows={type === 'poll' ? 2 : 4} aria-label="Content"
            style={{
              width: '100%', minHeight: type === 'poll' ? 60 : 100, padding: 12,
              background: 'var(--raised)', border: '1px solid var(--line)',
              borderRadius: 12, fontFamily: 'inherit', color: 'var(--ink)',
              outline: 'none', fontSize: 13, resize: 'vertical',
            }} />
        </div>

        {/* Poll options */}
        {type === 'poll' && (
          <div style={{ marginBottom: 14, padding: 14, borderRadius: 12, background: 'var(--raised)' }}>
            <label style={{ ...label, marginBottom: 8 }}>Poll options</label>
            {pollOptions.map((opt, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input style={{ flex: 1, ...inp }} placeholder={`Option ${i + 1}`}
                  value={opt} onChange={e => { const n = [...pollOptions]; n[i] = e.target.value; setPollOptions(n) }} />
                {pollOptions.length > 2 && (
                  <button onClick={() => setPollOptions(prev => prev.filter((_, j) => j !== i))}
                    style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--red)', padding: '0 4px' }}>
                    <Minus className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button onClick={() => setPollOptions(prev => [...prev, ''])}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: 'var(--surface)', color: 'var(--blue)', border: '1px dashed var(--line)', cursor: 'pointer', marginTop: 4 }}>
              <Plus className="w-3 h-3" /> Add option
            </button>
          </div>
        )}

        {/* Bounty (for questions) */}
        {type === 'question' && (
          <div style={row}>
            <div style={{ flex: 1 }}>
              <label style={label}><Coins className="w-3 h-3" style={{ color: 'var(--gold)' }} /> Bounty tokens</label>
              <input type="number" min={0} max={500} style={inp} placeholder="0"
                value={bountyTokens || ''} onChange={e => setBountyTokens(Number(e.target.value) || 0)} />
            </div>
          </div>
        )}

        {/* Listing fields */}
        {type === 'listing' && (
          <div style={{ marginBottom: 12 }}>
            <div style={row}>
              <div style={{ flex: 1 }}><label style={label}>Price</label><input type="number" min={0} step="0.01" style={inp} placeholder="e.g. 500" value={listingPrice} onChange={e => setListingPrice(e.target.value)} /></div>
              <div style={{ width: 100 }}><label style={label}>Currency</label><select style={sel} value={listingCurrency} onChange={e => setListingCurrency(e.target.value)}><option>KES</option><option>USD</option><option>UGX</option><option>TZS</option></select></div>
            </div>
            <div style={row}>
              <div style={{ flex: 1 }}><label style={label}>Category</label><select style={sel} value={listingCategory} onChange={e => setListingCategory(e.target.value)}>{LISTING_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
              <div style={{ flex: 1 }}><label style={label}>County</label><select style={sel} value={listingCounty} onChange={e => setListingCounty(e.target.value)}><option value="">Select county</option>{COUNTIES.map(c => <option key={c}>{c}</option>)}</select></div>
            </div>
            <div><label style={label}>Specific location (optional)</label><input style={inp} placeholder="e.g. Stage 43, Kawangware" value={listingLocation} onChange={e => setListingLocation(e.target.value)} /></div>
          </div>
        )}

        {/* Alert fields */}
        {type === 'alert' && (
          <div style={{ marginBottom: 12 }}>
            <div style={row}>
              <div style={{ flex: 1 }}><label style={label}>Alert type</label><select style={sel} value={alertType} onChange={e => setAlertType(e.target.value)}>{ALERT_TYPES.map(a => <option key={a}>{a.replace('_', ' ')}</option>)}</select></div>
              <div style={{ flex: 1 }}><label style={label}>Severity</label><select style={sel} value={alertSeverity} onChange={e => setAlertSeverity(e.target.value)}>{SEVERITIES.map(s => <option key={s}>{s}</option>)}</select></div>
            </div>
            <div style={row}>
              <div style={{ flex: 1 }}><label style={label}>Location</label><input style={inp} placeholder="e.g. Kimathi Street, Nairobi" value={alertLocation} onChange={e => setAlertLocation(e.target.value)} /></div>
              <div style={{ display: 'flex', alignItems: 'end', paddingBottom: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={alertUrgent} onChange={e => setAlertUrgent(e.target.checked)} style={{ accentColor: 'var(--red)' }} /> Urgent
                </label>
              </div>
            </div>
          </div>
        )}

        {/* County tag (for post, question, poll) */}
        {['post', 'question', 'poll'].includes(type) && (
          <div style={{ marginBottom: 12 }}>
            <label style={label}><MapPin className="w-3 h-3" /> County tag (optional)</label>
            <select style={sel} value={countyTag || ''} onChange={e => setCountyTag(e.target.value || null)}>
              <option value="">Select a county</option>
              {COUNTIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        )}

        {/* Media upload (for post, question, poll, listing) */}
        {['post', 'question', 'poll', 'listing'].includes(type) && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={e => handleMediaSelect(e, 'image')} className="hidden" />
              <input ref={videoInputRef} type="file" accept="video/*" onChange={e => handleMediaSelect(e, 'video')} className="hidden" />
              <input ref={audioInputRef} type="file" accept="audio/*" onChange={e => handleMediaSelect(e, 'audio')} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()}
                style={{ padding: '8px 14px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: 'var(--raised)', color: 'var(--muted)', border: '1px solid var(--line)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Image className="w-3.5 h-3.5" style={{ color: 'var(--green)' }} /> Image
              </button>
              <button onClick={() => videoInputRef.current?.click()}
                style={{ padding: '8px 14px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: 'var(--raised)', color: 'var(--muted)', border: '1px solid var(--line)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Video className="w-3.5 h-3.5" style={{ color: 'var(--blue)' }} /> Video
              </button>
              <button onClick={() => audioInputRef.current?.click()}
                style={{ padding: '8px 14px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: 'var(--raised)', color: 'var(--muted)', border: '1px solid var(--line)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Mic className="w-3.5 h-3.5" style={{ color: 'var(--red)' }} /> Audio
              </button>
            </div>

            {mediaFiles.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {mediaFiles.map((m, i) => (
                  <div key={i} style={{ position: 'relative', width: 76, height: 76, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--line)' }}>
                    {m.type === 'image' ? <img src={m.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                     m.type === 'video' ? <video src={m.preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                     <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--raised)' }}><Mic className="w-5 h-5" style={{ color: 'var(--muted)' }} /></div>}
                    <button onClick={() => removeMedia(i)}
                      style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,0.6)', border: 0, borderRadius: '50%', width: 20, height: 20, display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#fff' }}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Submit */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid var(--line)', paddingTop: 16 }}>
          <button onClick={() => setOpen(false)}
            style={{ padding: '10px 20px', borderRadius: 11, fontWeight: 600, fontSize: 12, background: 'var(--raised)', color: 'var(--muted)', border: '1px solid var(--line)', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handlePublish} disabled={uploading}
            style={{
              padding: '10px 20px', borderRadius: 11, fontWeight: 700, fontSize: 12,
              background: 'var(--gold)', color: 'var(--night)', border: 0, cursor: 'pointer',
              opacity: uploading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6,
            }}>
            {uploading ? <><Upload className="w-3.5 h-3.5 animate-spin" /> Publishing...</> :
              type === 'listing' ? 'List item' : type === 'alert' ? 'Send alert' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  )
}
