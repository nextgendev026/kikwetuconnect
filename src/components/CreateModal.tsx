'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useSupabase, useUser, toast } from '@/app/providers'
import { X, PenSquare, HelpCircle, BarChart3, ShoppingBag, Shield, Image, Video, Mic, Trash2, Upload } from 'lucide-react'
import imageCompress from 'browser-image-compression'

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

export default function CreateModal() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('post')
  const [text, setText] = useState('')
  const [mediaFiles, setMediaFiles] = useState<{ file: File; preview: string; type: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const supabase = useSupabase()
  const { user } = useUser()

  useEffect(() => {
    const handler = () => setOpen(true)
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
        const preview = URL.createObjectURL(processed)
        setMediaFiles(prev => [...prev, { file: processed, preview, type: mediaType }])
      } catch { toast(`Failed to process ${file.name}`) }
    }
    e.target.value = ''
  }

  const removeMedia = (index: number) => {
    URL.revokeObjectURL(mediaFiles[index].preview)
    setMediaFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handlePublish = async () => {
    if (!text.trim()) { toast('Add a little context first'); return }
    if (!user) { toast('Please sign in first'); return }
    setUploading(true)
    const currentMedia = [...mediaFiles]
    try {
      const mediaUrls: string[] = []
      for (const m of currentMedia) {
        const ext = (m.file.name.split('.').pop() || 'bin').replace(/[^a-zA-Z0-9]/g, '')
        const path = `posts/${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('public-media').upload(path, m.file, { upsert: true })
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage.from('public-media').getPublicUrl(path)
        mediaUrls.push(publicUrl)
      }
      const postType = type === 'question' ? 'inquiry' : 'baraza'
      const { error } = await supabase.from('posts').insert({
        user_id: user.id, post_type: postType, content: text,
        title: text.split('\n')[0].slice(0, 100),
        media_url: mediaUrls[0] || null,
        media_type: currentMedia[0]?.type || null,
      })
      if (error) throw error
      setOpen(false); setText(''); setMediaFiles([])
      currentMedia.forEach(m => URL.revokeObjectURL(m.preview))
      toast('Published!')
    } catch (e: any) { toast(e?.message || 'Failed to publish') }
    finally { setUploading(false) }
  }

  return (
    <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="create-modal-title" tabIndex={-1} style={{
      display: open ? 'flex' : 'none',
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'color-mix(in oklab, var(--night) 70%, transparent)',
      alignItems: 'center', justifyContent: 'center', padding: 18,
    }} onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
      <div className="animate-rise" style={{
        width: 'min(540px, 100%)', background: 'var(--surface)',
        border: '1px solid var(--line)', borderRadius: 22, padding: 24,
        boxShadow: '0 25px 60px color-mix(in oklab, var(--night) 30%, transparent)',
        maxHeight: '90vh', overflowY: 'auto',
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

        <div className="mb-3">
          <label style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
            {LABELS[type] || 'What is on your mind?'}
          </label>
          <textarea ref={textareaRef} value={text} onChange={e => setText(e.target.value)}
            placeholder="Share a useful thought, update, or local insight..."
            rows={4} aria-label="Post content"
            style={{
              width: '100%', minHeight: 100, padding: 12,
              background: 'var(--raised)', border: '1px solid var(--line)',
              borderRadius: 12, fontFamily: 'inherit', color: 'var(--ink)',
              outline: 'none', fontSize: 13, resize: 'vertical',
            }} />
        </div>

        {/* Media upload buttons */}
        <div className="flex gap-2 mb-3">
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

        {/* Media previews */}
        {mediaFiles.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-3">
            {mediaFiles.map((m, i) => (
              <div key={i} style={{ position: 'relative', width: 80, height: 80, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--line)' }}>
                {m.type === 'image' ? (
                  <img src={m.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : m.type === 'video' ? (
                  <video src={m.preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--raised)', color: 'var(--muted)', fontSize: 10 }}>
                    <Mic className="w-5 h-5" />
                  </div>
                )}
                <button onClick={() => removeMedia(i)}
                  style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', border: 0, borderRadius: '50%', width: 20, height: 20, display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#fff' }}>
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mb-4">
          <label style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Topic</label>
          <select aria-label="Topic" style={{
            width: '100%', padding: '10px 12px', background: 'var(--raised)',
            border: '1px solid var(--line)', borderRadius: 11, fontFamily: 'inherit',
            color: 'var(--ink)', outline: 'none', fontSize: 12,
          }}>
            <option>Biashara & Hustles</option>
            <option>Tech & Startups</option>
            <option>Agriculture & Farming</option>
            <option>Education</option>
          </select>
        </div>

        <div className="flex justify-end gap-2" style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
          <button onClick={() => setOpen(false)}
            style={{
              padding: '10px 18px', borderRadius: 11, fontWeight: 600, fontSize: 12,
              background: 'var(--raised)', color: 'var(--muted)',
              border: '1px solid var(--line)', cursor: 'pointer',
            }}>
            Cancel
          </button>
          <button onClick={handlePublish} disabled={uploading}
            style={{
              padding: '10px 18px', borderRadius: 11, fontWeight: 700, fontSize: 12,
              background: 'var(--gold)', color: 'var(--night)',
              border: 0, cursor: 'pointer', opacity: uploading ? 0.6 : 1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
            {uploading ? <><Upload className="w-3.5 h-3.5 animate-spin" /> Uploading...</> : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  )
}
