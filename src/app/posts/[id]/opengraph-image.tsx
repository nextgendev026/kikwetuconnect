import { ImageResponse } from 'next/og'
import { createServerClient } from '@/lib/supabase'
import { isVideoType } from '@/lib/utils'

export const alt = 'KikwetuConnect post'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

interface OgProfile {
  full_name: string | null
  username: string | null
}

interface OgPost {
  id: string
  title: string
  content: string
  post_type: string
  media_url: string | null
  media_type: string | null
  county_tag: string | null
  profiles: OgProfile | null
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function wrapTitle(title: string, charsPerLine = 26): string[] {
  const words = title.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if ((current + ' ' + word).trim().length <= charsPerLine || current === '') {
      current = (current + ' ' + word).trim()
    } else {
      lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines.slice(0, 3)
}

async function toDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    const mime = res.headers.get('content-type') || 'image/jpeg'
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

export default async function OpengraphImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let post: OgPost | null = null
  try {
    const supabase = await createServerClient()
    const { data } = await supabase.rpc('get_post_by_id', { p_post_id: id })
    post = (data as OgPost) ?? null
  } catch {
    post = null
  }

  const title = post?.title || 'KikwetuConnect'
  const snippet = post ? stripHtml(post.content || '').slice(0, 160) : 'Ask. Share. Get answers from your community.'
  const author = post?.profiles?.full_name || post?.profiles?.username || 'Kikwetu member'
  const county = post?.county_tag
  const mediaUri = post?.media_url && !isVideoType(post?.media_type) ? await toDataUri(post.media_url) : null

  const lines = wrapTitle(title)
  const emerald = '#059669'
  const lime = '#a3e635'
  const cream = '#faf9f5'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          background: `linear-gradient(135deg, #022c22 0%, #064e3b 45%, #065f46 100%)`,
          color: cream,
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '56px 56px 48px 56px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: `linear-gradient(135deg, ${lime}, ${emerald})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 800,
                color: '#022c22',
              }}
            >
              K
            </div>
            <div style={{ fontSize: '30px', fontWeight: 800, letterSpacing: '-0.5px' }}>KikwetuConnect</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '640px' }}>
            {lines.map((line, i) => (
              <div
                key={i}
                style={{
                  fontSize: i === 0 && lines.length > 1 ? '58px' : '64px',
                  lineHeight: 1.06,
                  fontWeight: 800,
                  letterSpacing: '-1.5px',
                  color: cream,
                }}
              >
                {line}
              </div>
            ))}
            {!post && (
              <div style={{ fontSize: '30px', fontWeight: 600, color: '#d1fae5', lineHeight: 1.4 }}>
                Share knowledge, earn heshima, get real answers.
              </div>
            )}
            {post && (
              <div style={{ fontSize: '28px', fontWeight: 500, color: '#a7f3d0', lineHeight: 1.4, maxWidth: '620px' }}>
                {snippet}
              </div>
            )}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '24px',
                color: '#a7f3d0',
                marginTop: '6px',
              }}
            >
              <span style={{ fontWeight: 700, color: lime }}>{author}</span>
              {county ? (
                <>
                  <span style={{ opacity: 0.5 }}>•</span>
                  <span>{county}, Kenya</span>
                </>
              ) : null}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '22px', color: '#6ee7b7' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: lime,
                  display: 'block',
                }}
              />
              Ask. Share. Earn.
            </span>
          </div>
        </div>

        <div style={{ width: '360px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {mediaUri ? (
            <img
              src={mediaUri}
              alt=""
              style={{
                width: '300px',
                height: '300px',
                objectFit: 'cover',
                borderRadius: '24px',
                border: '3px solid rgba(255,255,255,0.15)',
              }}
            />
          ) : (
            <div
              style={{
                width: '300px',
                height: '300px',
                borderRadius: '24px',
                border: '3px solid rgba(255,255,255,0.15)',
                background: `linear-gradient(135deg, rgba(163,230,53,0.18), rgba(5,150,105,0.18))`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '110px',
                fontWeight: 900,
                color: lime,
              }}
            >
              K
            </div>
          )}
        </div>
      </div>
    ),
    { ...size }
  )
}
