import { NextResponse } from 'next/server'

export const revalidate = 3600

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kikwetuconnect.vercel.app'

  const urls = [
    { path: '/', priority: 1.0 },
    { path: '/feed', priority: 0.9 },
    { path: '/baraza', priority: 0.8 },
    { path: '/login', priority: 0.6 },
    { path: '/signup', priority: 0.6 },
    { path: '/legal/terms', priority: 0.5 },
    { path: '/legal/privacy', priority: 0.5 },
    { path: '/legal/about', priority: 0.5 },
    { path: '/legal/community-guidelines', priority: 0.5 },
  ]

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${baseUrl}${u.path}</loc>
    <changefreq>daily</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
