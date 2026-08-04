import { createServiceClient } from '@/lib/server-supabase'
import { NextResponse } from 'next/server'

export const revalidate = 3600

function xmlUrl(loc: string, lastmod: string, priority: number, changefreq: string) {
  return `
  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
}

export async function GET() {
  const supabase = createServiceClient()
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://kikwetuconnect.vercel.app').replace(/\/$/, '')

  const staticUrls = [
    { path: '/', priority: 1.0 },
    { path: '/feed', priority: 0.9 },
    { path: '/baraza', priority: 0.8 },
    { path: '/experts', priority: 0.8 },
    { path: '/quizzes', priority: 0.7 },
    { path: '/market', priority: 0.7 },
    { path: '/login', priority: 0.6 },
    { path: '/signup', priority: 0.6 },
    { path: '/legal/terms', priority: 0.5 },
    { path: '/legal/privacy', priority: 0.5 },
    { path: '/legal/about', priority: 0.5 },
    { path: '/legal/community-guidelines', priority: 0.5 },
  ]

  const today = new Date().toISOString().split('T')[0]

  const { data: posts } = await supabase
    .from('posts')
    .select('id, created_at')
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .limit(1000)

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, updated_at, heshima_rating')
    .gte('heshima_rating', 10)
    .order('heshima_rating', { ascending: false })
    .limit(500)

  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('id, slug, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls.map(u => xmlUrl(`${baseUrl}${u.path}`, today, u.priority, 'daily')).join('')}
${(posts || []).map((p: any) => xmlUrl(`${baseUrl}/posts/${p.id}`, p.created_at || today, 0.8, 'weekly')).join('')}
${(profiles || []).map((p: any) => xmlUrl(`${baseUrl}/profile/${p.username || p.id}`, p.updated_at || p.created_at || today, 0.6, 'weekly')).join('')}
${(quizzes || []).map((q: any) => xmlUrl(`${baseUrl}/quizzes/${q.slug || q.id}`, q.created_at || today, 0.6, 'weekly')).join('')}
</urlset>`

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
