'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useSupabase, useUser, toast } from '@/app/providers'
import { Play, Plus, PlusIcon, X, Image, Send } from 'lucide-react'
import { getInitials, isVideoType } from '@/lib/utils'

interface Story {
  id: string
  user_id: string
  media_url: string
  media_type: 'image' | 'video'
  thumbnail_url: string | null
  caption: string | null
  view_count: number
  expires_at: string
  created_at: string
  profiles: { id: string; full_name: string | null; username: string; avatar_url: string | null; is_verified_expert: boolean } | null
}

interface Short {
  id: string
  user_id: string
  post_type: string
  title: string | null
  content: string
  media_url: string | null
  media_type: string | null
  created_at: string
  upvotes_count: number
  answers_count: number
  profiles: { id: string; full_name: string | null; username: string; avatar_url: string | null; is_verified_expert: boolean } | null
}

interface StoryStripProps {
  profile: { id: string; username: string; full_name: string | null; avatar_url: string | null } | null
}

function timeLeft(exp: string) {
  const ms = new Date(exp).getTime() - Date.now()
  if (ms <= 0) return 'expired'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return `${h}h ${m}m`
}

export default function StoryStrip({ profile }: StoryStripProps) {
  const supabase = useSupabase()
  const [myStories, setMyStories] = useState<Story[]>([])
  const [myShorts, setMyShorts] = useState<Short[]>([])
  const [communityStories, setCommunityStories] = useState<Story[]>([])
  const [communityShorts, setCommunityShorts] = useState<Short[]>([])
  const [loading, setLoading] = useState(true)
  const [openStory, setOpenStory] = useState<Story | null>(null)

  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    ;(async () => {
      try {
        const now = new Date().toISOString()
        const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString()

        // My own stories (24h)
        const { data: myStoriesData } = await supabase
          .from('stories')
          .select('id, user_id, media_url, media_type, thumbnail_url, caption, view_count, expires_at, created_at, profiles:user_id(id, full_name, username, avatar_url, is_verified_expert)')
          .eq('user_id', profile?.id || '')
          .gt('expires_at', now)
          .order('created_at', { ascending: false })

        // My own posts (shorts from last 24h)
        const { data: myShortsData } = await supabase
          .from('posts')
          .select('id, user_id, post_type, title, content, media_url, media_type, created_at, upvotes_count, answers_count, profiles:user_id(id, full_name, username, avatar_url, is_verified_expert)')
          .eq('user_id', profile?.id || '')
          .not('media_url', 'is', null)
          .is('space_id', null)
          .neq('post_type', 'inquiry')
          .gte('created_at', yesterday)
          .order('created_at', { ascending: false })

        // Community stories (excluding my own)
        const { data: communityStoriesData } = await supabase
          .from('stories')
          .select('id, user_id, media_url, media_type, thumbnail_url, caption, view_count, expires_at, created_at, profiles:user_id(id, full_name, username, avatar_url, is_verified_expert)')
          .gt('expires_at', now)
          .neq('user_id', profile?.id || '')
          .order('created_at', { ascending: false })
          .limit(30)

        // Community shorts (excluding my own, last 24h)
        const { data: communityShortsData } = await supabase
          .from('posts')
          .select('id, user_id, post_type, title, content, media_url, media_type, created_at, upvotes_count, answers_count, profiles:user_id(id, full_name, username, avatar_url, is_verified_expert)')
          .not('user_id', 'eq', profile?.id || '')
          .not('media_url', 'is', null)
          .is('space_id', null)
          .neq('post_type', 'inquiry')
          .gte('created_at', yesterday)
          .order('created_at', { ascending: false })
          .limit(18)

        if (!cancelled) {
          setMyStories((myStoriesData || []) as any)
          setMyShorts((myShortsData || []) as any)
          setCommunityStories((communityStoriesData || []) as any)
          setCommunityShorts((communityShortsData || []) as any)
        }
      } catch {} finally {
        if (!cancelled) setLoading(false)
      }
    })()

    const channel = supabase
      .channel('feed-stories')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stories' }, (payload: any) => {
        const s = payload.new as any
        if (new Date(s.expires_at).getTime() <= Date.now()) return
        if (s.user_id === profile?.id) {
          setMyStories(prev => (prev.some(i => i.id === s.id) ? prev : [s as any, ...prev]).slice(0, 10))
        } else {
          setCommunityStories(prev => (prev.some(i => i.id === s.id) ? prev : [s as any, ...prev]).slice(0, 30))
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'stories' }, (payload: any) => {
        const s = payload.new as any
        if (s.user_id === profile?.id) {
          setMyStories(prev => prev.map(i => (i.id === s.id ? (s as any) : i)))
        } else {
          setCommunityStories(prev => prev.map(i => (i.id === s.id ? (s as any) : i)))
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload: any) => {
        const p = payload.new as any
        if (!p.media_url || p.space_id || p.post_type === 'inquiry') return
        const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
        if (new Date(p.created_at).getTime() < new Date(yesterday).getTime()) return
        if (p.user_id === profile?.id) {
          if (p.media_url) setMyShorts(prev => (prev.some(i => i.id === p.id) ? prev : [p as any, ...prev]).slice(0, 10))
        } else {
          setCommunityShorts(prev => (prev.some(i => i.id === p.id) ? prev : [p as any, ...prev]).slice(0, 18))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, profile])

  const [showStoryComposer, setShowStoryComposer] = useState(false)
  const [showIdeaComposer, setShowIdeaComposer] = useState(false)

  if (loading && myStories.length === 0 && communityStories.length === 0 && myShorts.length === 0 && communityShorts.length === 0) {
    return (
      <div className="mb-[14px]">
        <div className="flex items-center justify-between mb-[10px]">
          <h2 className="flex items-center gap-[6px] text-[13px] font-extrabold tracking-[-.01em]" style={{ fontFamily: "'Plus Jakarta Sans'" }}>
            <Play className="w-[14px] h-[14px] text-gold fill-gold" />
            <span className="text-cream">My ideas</span>
            <span className="text-[var(--muted)] font-semibold text-[11px]">24-hour photos & short videos</span>
          </h2>
        </div>
        <div className="flex gap-[10px] overflow-x-auto pb-[6px] scrollbar-none -mx-[12px] px-[12px]">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-16 h-16 rounded-full bg-[var(--raised)] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="mb-[14px]">
        <div className="flex items-center justify-between mb-[10px]">
          <h2 className="flex items-center gap-[6px] text-[13px] font-extrabold tracking-[-.01em]" style={{ fontFamily: "'Plus Jakarta Sans'" }}>
            <Play className="w-[14px] h-[14px] text-gold fill-gold" />
            <span className="text-cream">My ideas</span>
            <span className="text-[var(--muted)] font-semibold text-[11px]">24-hour photos & short videos</span>
          </h2>
        </div>

        <div className="flex gap-[10px] overflow-x-auto pb-[6px] scrollbar-none -mx-[12px] px-[12px]">
          {/* Create story */}
          <button
            onClick={() => setShowStoryComposer(true)}
            className="flex-shrink-0 w-16 h-16 rounded-full border-2 border-dashed border-[var(--line)] flex items-center justify-center text-[var(--muted)] hover:border-gold hover:text-gold transition-colors cursor-pointer"
            aria-label="My ideas"
            style={{ background: 'linear-gradient(135deg, color-mix(in oklab, var(--gold) 10%, var(--surface)), var(--surface))' }}
          >
            <span className="w-[30px] h-[30px] rounded-full grid place-items-center bg-gold/15">
              <Plus className="w-[16px] h-[16px] text-gold" />
            </span>
          </button>

          {/* Your own stories */}
          {myStories.map(s => (
            <StoryCard key={s.id} story={s} isOwn onClick={() => {
              void supabase.rpc('view_story', { p_story_id: s.id })
              setOpenStory(s)
            }} />
          ))}

          {/* Community stories */}
          {communityStories.map(s => (
            <StoryCard key={s.id} story={s} onClick={() => {
              if (profile?.id && s.user_id === profile.id) return
              void supabase.rpc('view_story', { p_story_id: s.id })
              setOpenStory(s)
            }} />
          ))}
        </div>

        {/* Your own shorts - 24h posts with media */}
        {myShorts.length > 0 && (
          <div className="flex gap-[10px] overflow-x-auto pb-[6px] pt-[8px] -mx-[12px] px-[12px]">
            <button
              onClick={() => setShowIdeaComposer(true)}
              className="flex-shrink-0 w-16 h-16 rounded-full border-2 border-dashed border-[var(--line)] flex items-center justify-center text-[var(--muted)] hover:border-gold hover:text-gold transition-colors cursor-pointer"
              aria-label="Your idea"
              style={{ background: 'var(--raised)' }}
            >
              <span className="w-[30px] h-[30px] rounded-full grid place-items-center bg-gold/15">
                <PlusIcon className="w-[16px] h-[16px] text-gold" />
              </span>
            </button>
            {myShorts.map(s => (
              <ShortCard key={s.id} short={s} />
            ))}
          </div>
        )}

        {/* Community shorts */}
        {communityShorts.length > 0 && (
          <div className="flex gap-[10px] overflow-x-auto pb-[6px] pt-[8px] border-t border-[var(--line)] mt-[8px] -mx-[12px] px-[12px]">
            {communityShorts.map(s => (
              <ShortCard key={s.id} short={s} />
            ))}
          </div>
        )}
      </div>

       {/* Story viewer */}
       {openStory && (
         <StoryViewer story={openStory} onClose={() => setOpenStory(null)} supabase={supabase} />
       )}

       {/* Inline 24h idea composer */}
       {showStoryComposer && (
         <StoryComposer
           profile={profile}
           supabase={supabase}
           onClose={() => setShowStoryComposer(false)}
           onPublished={() => { setShowStoryComposer(false); window.location.href = '/feed' }}
         />
       )}

       {/* Inline idea composer */}
       {showIdeaComposer && (
         <IdeaComposer
           profile={profile}
           supabase={supabase}
           onClose={() => setShowIdeaComposer(false)}
           onPublished={() => { setShowIdeaComposer(false); window.location.href = '/feed' }}
         />
       )}
     </>
   )
 }

function StoryComposer({ profile, supabase, onClose, onPublished }: {
  profile: { id: string; username: string; full_name: string | null; avatar_url: string | null } | null
  supabase: any
  onClose: () => void
  onPublished: () => void
}) {
  const { user } = useUser()
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) { setFile(f); setPreview(URL.createObjectURL(f)) }
    e.target.value = ''
  }

  const handlePublish = async () => {
    if (!user || !supabase) { toast('Sign in required'); return }
    if (!file) { toast('Add a photo or 15s video'); return }
    if (file.size > 50 * 1024 * 1024) { toast('Max 50MB'); return }

    setUploading(true)
    try {
      const ext = (file.name.split('.').pop() || 'bin').replace(/[^a-zA-Z0-9]/g, '')
      const path = `stories/${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('stories').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('stories').getPublicUrl(path)

      const isVideo = file.type.startsWith('video/')
      const { error: storyErr } = await supabase.rpc('create_story', {
        p_media_url: publicUrl,
        p_media_type: isVideo ? 'video' : 'image',
        p_caption: text || null,
        p_duration: null,
        p_thumbnail_url: null,
      })
      if (storyErr) throw storyErr

      toast('Idea shared! Visible for 24h.')
      onPublished()
    } catch (e: any) { toast(e?.message || 'Failed to share idea') }
    finally { setUploading(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end" onClick={onClose}>
      <div className="w-full max-w-md mx-auto mb-safe pb-safe bg-[var(--surface)] border-t border-[var(--line)] rounded-t-[20px] p-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold" style={{ color: 'var(--ink)' }}>Create Idea (24h)</h3>
          <button onClick={onClose} className="w-6 h-6 rounded-full grid place-items-center text-[var(--muted)] hover:bg-[var(--raised)]" style={{ background: 'var(--raised)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {preview ? (
          <img src={preview} alt="" className="w-full h-[140px] object-cover rounded-[12px] mb-3" />
        ) : (
          <button onClick={() => fileRef.current?.click()}
            className="w-full h-[140px] rounded-[12px] border-2 border-dashed border-[var(--line)] flex flex-col items-center justify-center gap-2 text-[var(--muted)] hover:border-gold hover:text-gold transition-colors cursor-pointer mb-3"
            style={{ background: 'var(--raised)' }}>
            <Image className="w-6 h-6" />
            <span className="text-[11px] font-bold">Add photo or video</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} className="hidden" />
        {file && (
          <button onClick={() => { setFile(null); setPreview(null) }}
            className="text-[10px] text-[var(--muted)] hover:text-[var(--red)] underline mb-2">
            Remove media
          </button>
        )}

        <textarea value={text} onChange={e => setText(e.target.value)}
          placeholder="Add a caption (optional)..." rows={2}
          className="w-full rounded-[10px] px-3 py-2 text-sm outline-none resize-none mb-3"
          style={{ background: 'var(--raised)', border: '1px solid var(--line)', color: 'var(--ink)' }} />

        <button onClick={handlePublish} disabled={uploading || !file}
          className="w-full h-[40px] rounded-[10px] font-bold text-sm border-0 cursor-pointer flex items-center justify-center gap-2"
          style={{
            background: uploading || !file ? 'var(--raised)' : '#0F625B',
            color: uploading || !file ? 'var(--faint)' : '#FFFFFF',
            opacity: uploading || !file ? 0.7 : 1,
          }}>
          {uploading ? 'Sharing...' : 'Share Idea'}
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function IdeaComposer({ profile, supabase, onClose, onPublished }: {
  profile: { id: string; username: string; full_name: string | null; avatar_url: string | null } | null
  supabase: any
  onClose: () => void
  onPublished: () => void
}) {
  const { user } = useUser()
  const [text, setText] = useState('')
  const [uploading, setUploading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handlePublish = async () => {
    if (!user || !supabase) { toast('Sign in required'); return }
    if (!text.trim()) { toast('Add something first'); return }

    setUploading(true)
    try {
      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        post_type: 'baraza',
        content: text.trim(),
        title: text.trim().split('\n')[0].slice(0, 100),
        media_url: null,
        media_type: null,
        category: 'Post',
        county_tag: null,
        baraza_id: null,
        space_id: null,
        bounty_tokens: 0,
      })
      if (error) throw error
      toast('Idea published!')
      onPublished()
    } catch (e: any) { toast(e?.message || 'Failed to publish') }
    finally { setUploading(false) }
  }

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  return (
    <div className="fixed inset-0 z-[100] flex items-end" onClick={onClose}>
      <div className="w-full max-w-md mx-auto mb-safe pb-safe bg-[var(--surface)] border-t border-[var(--line)] rounded-t-[20px] p-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold" style={{ color: 'var(--ink)' }}>New Idea</h3>
          <button onClick={onClose} className="w-6 h-6 rounded-full grid place-items-center text-[var(--muted)] hover:bg-[var(--raised)]" style={{ background: 'var(--raised)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <textarea ref={textareaRef} value={text} onChange={e => setText(e.target.value)}
          placeholder="Share a useful thought, update, or local insight..."
          rows={3}
          className="w-full rounded-[10px] px-3 py-2 text-sm outline-none resize-none mb-3"
          style={{ background: 'var(--raised)', border: '1px solid var(--line)', color: 'var(--ink)' }} />

        <button onClick={handlePublish} disabled={uploading || !text.trim()}
          className="w-full h-[40px] rounded-[10px] font-bold text-sm border-0 cursor-pointer flex items-center justify-center gap-2"
          style={{
            background: uploading || !text.trim() ? 'var(--raised)' : 'var(--gold)',
            color: uploading || !text.trim() ? 'var(--faint)' : 'var(--night)',
            opacity: uploading || !text.trim() ? 0.7 : 1,
          }}>
          {uploading ? 'Publishing...' : 'Publish'}
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function ShortCard({ short }: { short: Short }) {
  const isVideo = isVideoType(short.media_type)
  return (
    <Link
      href={`/posts/${short.id}`}
      className="relative flex-shrink-0 w-16 h-16 rounded-full overflow-hidden block group"
      aria-label={`@${short.profiles?.username}'s short`}
    >
      {isVideo ? (
        <div className="w-full h-full bg-gradient-to-b from-deep to-night2 grid place-items-center">
          <span className="w-[22px] h-[22px] rounded-full bg-black/40 flex items-center justify-center">
            <Play className="w-[11px] h-[11px] text-white fill-white" />
          </span>
        </div>
      ) : (
        <img src={short.media_url!} alt="" className="w-full h-full object-cover object-center" loading="lazy" />
      )}
    </Link>
  )
}

function StoryCard({ story, isOwn = false, onClick }: { story: Story; isOwn?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative flex-shrink-0 w-16 h-16 rounded-full overflow-hidden flex items-center justify-center cursor-pointer"
      aria-label={`@${story.profiles?.username}'s story`}
    >
      {story.media_type === 'video' ? (
        <video src={story.thumbnail_url || story.media_url} autoPlay muted loop playsInline
          className="w-full h-full object-cover object-center" />
      ) : (
        <img src={story.media_url} alt="" className="w-full h-full object-cover object-center" loading="lazy" />
      )}
      {!isOwn && (
        <span className="absolute inset-0 rounded-full border-2 border-gold/70 pointer-events-none" />
      )}
    </button>
  )
}

function StoryViewer({ story, onClose, supabase }: { story: Story; onClose: () => void; supabase: any }) {
  const [ended, setEnded] = useState(false)
  const mediaRef = story.media_type === 'video' ? 'video' : 'img'

  useEffect(() => {
    if (story.media_type === 'image') {
      const t = setTimeout(onClose, 4000)
      return () => clearTimeout(t)
    }
  }, [story, onClose])

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90" onClick={onClose}>
      <div className="relative max-w-[90vw] max-h-[90vh] rounded-[22px] overflow-hidden" onClick={e => e.stopPropagation()}>
        {story.media_type === 'video' ? (
          <video ref={v => { if (v) v.src = story.media_url }} controls autoPlay playsInline
            className="w-[300px] h-[540px] sm:w-[340px] sm:h-[600px] object-cover"
            onEnded={() => setEnded(true)} onPlay={e => { if (story.media_type === 'video') { (e.currentTarget as HTMLVideoElement).playbackRate = 1 } }} />
        ) : (
          <img src={story.media_url} alt={story.caption || ''} className="w-[300px] h-[540px] sm:w-[340px] sm:h-[600px] object-cover" />
        )}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
          <p className="text-sm text-white font-medium">{story.caption}</p>
          <div className="flex items-center gap-2 text-[10px] text-white/70 mt-1">
            <span>👁 {story.view_count} views</span>
            <span>🕒 {timeLeft(story.expires_at)} left</span>
          </div>
        </div>
        <button onClick={onClose} className="absolute top-3 right-3 text-white/80 hover:text-white text-2xl">×</button>
      </div>
    </div>
  )
}
