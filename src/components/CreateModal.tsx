'use client'
import { useEffect, useState, useRef } from 'react'
import { useSupabase, useUser, toast } from '@/app/providers'

const TYPES = [
  { id: 'post', label: 'Post', icon: '✍️' },
  { id: 'question', label: 'Question', icon: '❓' },
  { id: 'poll', label: 'Poll', icon: '📊' },
  { id: 'listing', label: 'Mtaa listing', icon: '🛍️' },
  { id: 'alert', label: 'Safety update', icon: '🛡️' },
]

const LABELS: Record<string, string> = {
  post: 'What is on your mind?',
  question: 'What do you want to learn?',
  poll: 'What should the community weigh in on?',
  listing: 'What are you offering?',
  alert: 'What useful update should neighbours know?',
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_VIDEO_DURATION = 15 // seconds
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

export default function CreateModal() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('post')
  const [text, setText] = useState('')
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [embedUrl, setEmbedUrl] = useState('')
  const [embedData, setEmbedData] = useState<{ title: string; description: string; image: string } | null>(null)
  const supabase = useSupabase()
  const { user, profile } = useUser()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isAdmin = profile?.role === 'admin'

  useEffect(() => {
    const handler = () => { setOpen(true); setText(''); setMediaFiles([]); setMediaPreviews([]); setEmbedUrl(''); setEmbedData(null) }
    document.addEventListener('open-create-modal', handler)
    return () => document.removeEventListener('open-create-modal', handler)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + mediaFiles.length > 4) { toast('Maximum 4 media items'); return }
    
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) { toast(`${file.name} is too large (max 10MB)`); continue }
      
      if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
        const preview = URL.createObjectURL(file)
        setMediaFiles(prev => [...prev, file])
        setMediaPreviews(prev => [...prev, preview])
      } else if (ALLOWED_VIDEO_TYPES.includes(file.type)) {
        // Validate video duration
        const video = document.createElement('video')
        video.preload = 'metadata'
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(video.src)
          if (video.duration > MAX_VIDEO_DURATION) {
            toast(`Video must be ${MAX_VIDEO_DURATION}s or shorter`)
            return
          }
          const preview = URL.createObjectURL(file)
          setMediaFiles(prev => [...prev, file])
          setMediaPreviews(prev => [...prev, preview])
        }
        video.src = URL.createObjectURL(file)
      } else {
        toast('Only images and videos (MP4, WebM, MOV) allowed')
      }
    }
    if (e.target) e.target.value = ''
  }

  const removeMedia = (index: number) => {
    URL.revokeObjectURL(mediaPreviews[index])
    setMediaFiles(prev => prev.filter((_, i) => i !== index))
    setMediaPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const fetchEmbedData = async (url: string) => {
    try {
      const res = await fetch(`/api/embed?url=${encodeURIComponent(url)}`)
      if (res.ok) {
        const data = await res.json()
        setEmbedData(data)
      }
    } catch {}
  }

  const handleEmbedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value.trim()
    setEmbedUrl(url)
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      fetchEmbedData(url)
    } else {
      setEmbedData(null)
    }
  }

  const uploadMedia = async (): Promise<{ urls: string[]; types: string[] }> => {
    if (mediaFiles.length === 0) return { urls: [], types: [] }
    
    setUploading(true)
    const urls: string[] = []
    const types: string[] = []
    
    for (const file of mediaFiles) {
      const ext = file.name.split('.').pop() || 'bin'
      const path = `posts/${user?.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      
      const { error } = await supabase.storage.from('public-media').upload(path, file, {
        contentType: file.type,
        upsert: false,
      })
      
      if (error) throw error
      
      const { data } = supabase.storage.from('public-media').getPublicUrl(path)
      urls.push(data.publicUrl)
      types.push(file.type.startsWith('video/') ? 'video' : 'image')
    }
    
    setUploading(false)
    return { urls, types }
  }

  const handlePublish = async () => {
    if (!text.trim() && mediaFiles.length === 0 && !embedUrl) { toast('Add a little context first'); return }
    if (!user) { toast('Please sign in first'); return }
    
    const postType = type === 'question' ? 'inquiry' : 'baraza'
    let mediaUrls: string[] = []
    let mediaTypes: string[] = []
    
    if (mediaFiles.length > 0) {
      try {
        const result = await uploadMedia()
        mediaUrls = result.urls
        mediaTypes = result.types
      } catch (err: any) {
        toast('Failed to upload media: ' + err.message)
        return
      }
    }
    
    const { error } = await supabase.from('posts').insert({
      user_id: user.id,
      post_type: postType,
      content: text,
      title: text.split('\n')[0].slice(0, 100),
      media_urls: mediaUrls,
      media_types: mediaTypes,
      embed_url: isAdmin && embedUrl ? embedUrl : null,
      embed_title: isAdmin && embedData?.title ? embedData.title : null,
      embed_description: isAdmin && embedData?.description ? embedData.description : null,
      embed_image: isAdmin && embedData?.image ? embedData.image : null,
    })
    
    if (error) { toast('Failed to publish'); return }
    
    setOpen(false)
    setText('')
    setMediaFiles([])
    mediaPreviews.forEach(URL.revokeObjectURL)
    setMediaPreviews([])
    setEmbedUrl('')
    setEmbedData(null)
    toast('Published. Your circle can see it now.')
    window.dispatchEvent(new CustomEvent('refresh-feed'))
  }

  return (
    <div className={`modal-wrap${open ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
      <div className="modal">
        <div className="modal-head">
          <div>
            <h2>Put something useful into the circle.</h2>
            <p>Choose a format, add context, then share it.</p>
          </div>
          <button className="close" onClick={() => { setOpen(false); mediaPreviews.forEach(URL.revokeObjectURL); setMediaPreviews([]); setMediaFiles([]) }}>×</button>
        </div>
        
        <div className="chips">
          {TYPES.map(t => (
            <button key={t.id} className="chip" style={{ borderColor: type === t.id ? 'var(--gold)' : undefined, background: type === t.id ? 'var(--gold-soft)' : undefined, color: type === t.id ? 'var(--ink)' : undefined }}
              onClick={() => setType(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        
        <div className="field">
          <label>{LABELS[type] || 'What is on your mind?'}</label>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Share a useful thought, update, or local insight..." />
        </div>
        
        {/* Media Upload */}
        <div className="field">
          <label>Photos & Videos (max 4, 15s video)</label>
          <input type="file" ref={fileInputRef} accept="image/*,video/mp4,video/webm,video/quicktime" multiple onChange={handleFileSelect} style={{ display: 'none' }} />
          <button type="button" className="btn secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => fileInputRef.current?.click()}>
            + Add Media
          </button>
          
          {mediaPreviews.length > 0 && (
            <div className="media-previews" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px', marginTop: '8px' }}>
              {mediaPreviews.map((preview, i) => {
                const file = mediaFiles[i]
                const isVideo = file.type.startsWith('video/')
                return (
                  <div key={i} className="relative" style={{ aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--line)' }}>
                    {isVideo ? (
                      <video src={preview} muted loop playsInline className="w-full h-full object-cover" />
                    ) : (
                      <img src={preview} className="w-full h-full object-cover" />
                    )}
                    <button type="button" onClick={() => removeMedia(i)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs hover:bg-black/80">×</button>
                    {isVideo && <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1 rounded">🎥</span>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        
        {/* Admin-only URL Embed */}
        {isAdmin && (
          <div className="field">
            <label>Embed Link (Admin only)</label>
            <input 
              type="url" 
              value={embedUrl} 
              onChange={handleEmbedChange} 
              placeholder="https://example.com - will fetch preview" 
            />
            {embedData && (
              <div className="embed-preview" style={{ marginTop: '8px', padding: '12px', background: 'var(--night2)', border: '1px solid var(--line)', borderRadius: '12px', display: 'flex', gap: '12px' }}>
                {embedData.image && <img src={embedData.image} alt="" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{embedData.title}</p>
                  <p className="text-muted text-xs truncate">{embedData.description}</p>
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="field">
          <label>Topic</label>
          <select>
            <option>Biashara & Hustles</option>
            <option>Tech & Startups</option>
            <option>Agriculture & Farming</option>
            <option>Education</option>
          </select>
        </div>
        
        <div className="modal-foot">
          <button className="btn secondary" onClick={() => { setOpen(false); mediaPreviews.forEach(URL.revokeObjectURL); setMediaPreviews([]); setMediaFiles([]) }}>Cancel</button>
          <button className="btn primary" onClick={handlePublish} disabled={uploading}>{uploading ? 'Uploading...' : 'Publish'}</button>
        </div>
      </div>
    </div>
  )
}
