import { withAuth } from '@/lib/server-supabase'
import { NextResponse } from 'next/server'

export const POST = withAuth(async (request, { supabase, user }) => {
  try {
    const { post_id, source_type = 'nyumba_kumi_alerts', language = 'sw' } = await request.json()
    if (!post_id) return NextResponse.json({ error: 'post_id required' }, { status: 400 })

    // Check cache
    const { data: cached } = await supabase
      .from('post_translations')
      .select('translated_title, translated_text')
      .eq('post_id', post_id)
      .eq('source_type', source_type)
      .eq('language', language)
      .maybeSingle()

    if (cached) {
      return NextResponse.json({ translated_title: cached.translated_title, translated_text: cached.translated_text, cached: true })
    }

    // Fetch content
    const { data: row, error: fetchError } = await supabase
      .from(source_type)
      .select(source_type === 'posts' ? 'id, title, content' : 'id, title, description')
      .eq('id', post_id)
      .maybeSingle()

    if (!row) return NextResponse.json({ error: 'Content not found' }, { status: 404 })

    const title = (row as any).title || ''
    const text = (row as any).content || (row as any).description || ''
    const fullText = [title, text].filter(Boolean).join('\n\n')
    if (!fullText.trim()) return NextResponse.json({ error: 'No content to translate' }, { status: 400 })

    // Call translation provider
    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) return NextResponse.json({ error: 'Translation provider not configured' }, { status: 500 })

    const prompt = `Translate the following text to Kiswahili (Swahili). Keep all formatting, line breaks, and punctuation. Output only the translated text.\n\n${fullText}`

    const resp = await fetch('https://api.openai.com/v1/chat/completions', { signal: AbortSignal.timeout(15000),
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a professional translator from English/any language to Kiswahili (Swahili). Output only the translated text.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.0,
        max_tokens: 1500,
      }),
    })

    const respBody = await resp.json()
    const translated = respBody?.choices?.[0]?.message?.content || ''
    if (!translated) return NextResponse.json({ error: 'Translation provider returned empty result' }, { status: 502 })

    // Detect title vs content split from translation
    const lines = translated.split('\n')
    const translatedTitle = title && lines.length > 1 ? lines[0] : null
    const translatedText = translatedTitle ? lines.slice(1).join('\n').trim() || translated : translated

    // Cache result via RPC (respects RLS)
    await supabase.rpc('insert_translation', {
      p_post_id: post_id,
      p_source_type: source_type,
      p_language: language,
      p_translated_text: translatedText,
      p_translated_title: translatedTitle,
      p_provider: 'openai',
    })

    return NextResponse.json({ translated_title: translatedTitle, translated_text: translatedText, cached: false })
  } catch (err) {
    console.error('Translate error:', err)
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 })
  }
})
