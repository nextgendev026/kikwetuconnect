import { createApiClient } from '@/lib/server-supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('page_size') || '20')
    const category = searchParams.get('category')
    const sort = searchParams.get('sort') || 'trend'

    const { data, error } = await supabase.rpc('get_barazas', {
      p_page: page,
      p_page_size: Math.min(pageSize, 50),
      p_category: category || null,
      p_sort: sort,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
