'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSupabase, toast } from '@/app/providers'
import { Play, Plus, PlusIcon } from 'lucide-react'

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

function initials(name: string | null | undefined): string {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function StoryStrip({ profile }: StoryStripProps) {
  const supabase = useSupabase()
  const [stories, setStories] = useState<Story[]>([])
  const [myStory, setMyStory] = useState<Story | null>(null)
  const [shorts, setShorts] = useState<Short[]>([])
  const [loading, setLoading] = useState(true)
  const [openStory, setOpenStory] = useState<Story | null>(null)

  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    ;(async () => {
      try {
        const now = new Date().toISOString()
        const { data: mine } = await supabase
          .from('stories')
          .select('id, user_id, media_url, media_type, thumbnail_url, caption, view_count, expires_at, created_at, profiles:user_id(id, full_name, username, avatar_url, is_verified_expert)')
          .eq('user_id', profile?.id || '')
          .gt('expires_at', now)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        const { data: theirs } = await supabase
          .from('stories')
          .select('id, user_id, media_url, media_type, thumbnail_url, caption, view_count, expires_at, created_at, profiles:user_id(id, full_name, username, avatar_url, is_verified_expert)')
          .gt('expires_at', now)
          .neq('user_id', profile?.id || '')
          .order('created_at', { ascending: false })
          .limit(30)

        const { data: communityShorts } = await supabase
          .from('posts')
          .select('id, user_id, post_type, title, content, media_url, media_type, created_at, upvotes_count, answers_count, profiles:user_id(id, full_name, username, avatar_url, is_verified_expert)')
          .not('media_url', 'is', null)
          .is('space_id', null)
          .gte('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(18)

        if (!cancelled) {
          if (mine) setMyStory(mine as any)
          setStories((theirs || []) as any)
          setShorts((communityShorts || []) as any)
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
          setMyStory(s as any)
        } else {
          setStories(prev => (prev.some(i => i.id === s.id) ? prev : [s as any, ...prev]).slice(0, 30))
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'stories' }, (payload: any) => {
        const s = payload.new as any
        if (s.user_id === profile?.id) {
          if (myStory?.id === s.id) setMyStory(s as any)
        } else {
          setStories(prev => prev.map(i => (i.id === s.id ? (s as any) : i)))
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload: any) => {
        const p = payload.new as any
        if (!p.media_url || p.space_id) return
        setShorts(prev => (prev.some(i => i.id === p.id) ? prev : [p as any, ...prev]).slice(0, 18))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, profile])

  const openComposer = () => {
    document.dispatchEvent(new CustomEvent('open-create-modal', { detail: { type: 'story' } }))
  }

  if (loading && stories.length === 0 && !myStory && shorts.length === 0) return null

  const openIdeaComposer = () => {
    document.dispatchEvent(new CustomEvent('open-create-modal', { detail: { type: 'post' } }))
  }

  return (
    <>
      <div className="mb-[14px]">
        <div className="flex items-center justify-between mb-[10px]">
          <h2 className="flex items-center gap-[6px] text-[13px] font-extrabold tracking-[-.01em]" style={{ fontFamily: "'Plus Jakarta Sans'" }}>
            <Play className="w-[14px] h-[14px] text-gold fill-gold" />
            <span className="text-cream">Stories</span>
            <span className="text-[var(--muted)] font-semibold text-[11px]">24-hour reels & community shorts</span>
          </h2>
        </div>

        <div className="flex gap-[10px] overflow-x-auto pb-[6px] scrollbar-none -mx-[12px] px-[12px]">
          {/* Create story */}
          <button
            onClick={openComposer}
            className="flex-shrink-0 w-[90px] h-[130px] rounded-[16px] border-2 border-dashed border-[var(--line)] flex flex-col items-center justify-center gap-[8px] text-[var(--muted)] hover:border-gold hover:text-gold transition-colors cursor-pointer"
            aria-label="Add a story"
            style={{ background: 'linear-gradient(135deg, color-mix(in oklab, var(--gold) 10%, var(--surface)), var(--surface))' }}
          >
            <span className="w-[30px] h-[30px] rounded-full grid place-items-center bg-gold/15">
              <Plus className="w-[16px] h-[16px] text-gold" />
            </span>
            <span className="text-[11px] font-bold">Your story</span>
          </button>

          {/* Your existing (unexpired) story */}
          {myStory && (
            <StoryCard story={myStory} isOwn onClick={() => setOpenStory(myStory)} />
          )}

          {/* Community 24h stories */}
          {stories.map(s => (
            <StoryCard key={s.id} story={s} onClick={() => {
              if (profile?.id && s.user_id === profile.id) return
              void supabase.rpc('view_story', { p_story_id: s.id })
              setOpenStory(s)
            }} />
          ))}
        </div>

        {/* Community shorts — "New idea" / short-form reels from the last 24h */}
        {shorts.length > 0 && (
          <div className="flex gap-[10px] overflow-x-auto pb-[6px] pt-[8px] border-t border-[var(--line)] mt-[8px] -mx-[12px] px-[12px]">
            <button
              onClick={openIdeaComposer}
              className="flex-shrink-0 w-[104px] h-[150px] rounded-[16px] border-2 border-dashed border-[var(--line)] flex flex-col items-center justify-center gap-[8px] text-[var(--muted)] hover:border-gold hover:text-gold transition-colors cursor-pointer"
              aria-label="Share an idea"
            >
              <span className="w-[34px] h-[34px] rounded-full grid place-items-center bg-gold/15">
                <PlusIcon className="w-[16px] h-[16px] text-gold" />
              </span>
              <span className="text-[11px] font-bold">Your idea</span>
            </button>
            {shorts.map(s => (
              <ShortCard key={s.id} short={s} />
            ))}
          </div>
        )}
      </div>

      {/* Story viewer */}
      {openStory && (
        <StoryViewer story={openStory} onClose={() => setOpenStory(null)} supabase={supabase} />
      )}
    </>
  )
}

function ShortCard({ short }: { short: Short }) {
  const author = short.profiles
  const isVideo = short.media_type?.startsWith('video/')
  const fallback = initials(author?.full_name || author?.username)
  return (
    <Link
      href={`/posts/${short.id}`}
      className="relative flex-shrink-0 w-[104px] h-[150px] rounded-[16px] overflow-hidden block group"
      aria-label={`@${author?.username}'s short`}
    >
      {isVideo ? (
        <div className="w-full h-full bg-gradient-to-b from-deep to-night2 grid place-items-center">
          <span className="w-[30px] h-[30px] rounded-full bg-black/40 flex items-center justify-center">
            <Play className="w-[13px] h-[13px] text-white fill-white" />
          </span>
        </div>
      ) : (
        <img src={short.media_url!} alt="" className="w-full h-full object-cover" loading="lazy" />
      )}
      <div className="absolute inset-x-0 bottom-0 p-[8px] bg-gradient-to-t from-black/70 to-transparent">
        <p className="text-white text-[10px] font-bold leading-tight line-clamp-2">{short.title || short.content?.slice(0, 60)}</p>
      </div>
      <div className="absolute top-[8px] left-[8px]">
        {author?.avatar_url ? (
          <img src={author.avatar_url} alt="" className="w-[18px] h-[18px] rounded-full object-cover border-[1.5px] border-gold/60" />
        ) : (
          <span className="w-[18px] h-[18px] rounded-full bg-gold text-night grid place-items-center text-[8px] font-extrabold border-[1.5px] border-gold/60">{fallback}</span>
        )}
      </div>
      {short.post_type === 'inquiry' && (
        <span className="absolute top-[8px] right-[8px] text-[9px] font-bold text-white px-[6px] py-[2px] rounded-full" style={{ background: 'rgba(0,0,0,0.55)' }}>Q</span>
      )}
    </Link>
  )
}

function StoryCard({ story, isOwn = false, onClick }: { story: Story; isOwn?: boolean; onClick: () => void }) {
  const hasVerifiedBadge = story.profiles?.is_verified_expert
  return (
    <button
      onClick={onClick}
      className="relative flex-shrink-0 w-[90px] h-[130px] rounded-[16px] overflow-hidden group cursor-pointer"
      aria-label={`@${story.profiles?.username}'s story`}
    >
      {story.media_type === 'video' ? (
        <video src={story.thumbnail_url || story.media_url} autoPlay muted loop playsInline
          className="w-full h-full object-cover" />
      ) : (
        <img src={story.media_url} alt="" className="w-full h-full object-cover" loading="lazy" />
      )}
      {!isOwn && (
        <span className="absolute inset-0 rounded-[16px]"
          style={{ boxShadow: 'inset 0 0 0 2px color-mix(in oklab, var(--gold) 0%, transparent)' }} />
      )}
      <div className="absolute top-[6px] left-[6px] flex items-center gap-[3px]">
        {story.profiles?.avatar_url ? (
          <img src={story.profiles.avatar_url} alt="" className="w-[16px] h-[16px] rounded-full object-cover border-[1.5px] border-gold/60" />
        ) : (
          <span className="w-[16px] h-[16px] rounded-full bg-gold text-[5px] font-extrabold grid place-items-center border-[1.5px] border-gold/60">
            {story.profiles?.username?.slice(0, 2).toUpperCase() || '??'}
          </span>
        )}
        {hasVerifiedBadge && <span className="text-[8px]">✓</span>}
      </div>
      <div className="absolute bottom-[6px] left-0 right-0 text-center">
        <span className="text-[8px] font-bold text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,.8)]">
          {isOwn ? 'Tap to view' : story.profiles?.full_name || story.profiles?.username}
        </span>
      </div>
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
