import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase'
import PostDetail from './post-detail'

export const dynamic = 'force-dynamic'

interface PostMeta {
  id: string
  title: string
  content: string
  post_type: string
  user_id: string
  media_url: string | null
  media_type: string | null
  upvotes_count: number
  answers_count: number
  bounty_tokens: number
  county_tag: string | null
  is_hidden: boolean
  created_at: string
  profiles: { id: string; full_name: string | null; username: string | null; heshima_rating: number; is_verified_expert: boolean } | null
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

async function getPost(id: string): Promise<PostMeta | null> {
  try {
    const supabase = await createServerClient()
    const { data } = await supabase.rpc('get_post_by_id', { p_post_id: id })
    return (data as PostMeta) ?? null
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const post = await getPost(id)
  const title = post?.title ? `${post.title} | KikwetuConnect` : 'Post | KikwetuConnect'
  const description = post ? stripHtml(post.content || '').slice(0, 160) : 'Join the conversation on KikwetuConnect.'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await getPost(id)
  if (!post) notFound()
  return <PostDetail postId={id} initialPost={post as never} />
}
