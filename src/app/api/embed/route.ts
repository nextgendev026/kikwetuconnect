import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  
  if (!url) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 })
  }

  try {
    // Validate URL
    const parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'Invalid URL protocol' }, { status: 400 })
    }

    // Fetch the page
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KikwetuConnect/1.0; +https://kikwetuconnect.com/bot)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch URL' }, { status: 400 })
    }

    const html = await response.text()
    
    // Extract Open Graph / meta tags
    const title = extractMeta(html, 'og:title') || extractMeta(html, 'twitter:title') || extractTitle(html) || parsedUrl.hostname
    const description = extractMeta(html, 'og:description') || extractMeta(html, 'twitter:description') || extractMeta(html, 'description') || ''
    const image = extractMeta(html, 'og:image') || extractMeta(html, 'twitter:image') || extractFirstImage(html)
    
    return NextResponse.json({
      title: title.slice(0, 100),
      description: description.slice(0, 200),
      image: image ? new URL(image, url).href : null,
    })
  } catch (err: any) {
    console.error('Embed fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch embed data' }, { status: 500 })
  }
}

function extractMeta(html: string, property: string): string | null {
  // Try og:property
  let regex = new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i')
  let match = html.match(regex)
  if (match) return match[1]
  
  // Try name=property
  regex = new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i')
  match = html.match(regex)
  return match ? match[1] : null
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return match ? match[1] : null
}

function extractFirstImage(html: string): string | null {
  // Try og:image first
  let match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
  if (match) return match[1]
  
  // Try first img tag
  match = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  return match ? match[1] : null
}