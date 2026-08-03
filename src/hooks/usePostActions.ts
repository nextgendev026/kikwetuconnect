'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/app/providers'
import { feedKey } from '@/lib/feedHelpers'
import type { FeedParams, Post } from '@/lib/feedHelpers'

/** Patch a post across all pages of a feed query's cache. */
function patchInFeed(old: any, postId: string, patch: (post: Post) => Post) {
  if (!old?.pages) return old
  return {
    ...old,
    pages: old.pages.map((page: Post[]) => page.map((p: Post) => (p.id === postId ? patch(p) : p))),
  }
}

export function useVoteAction(params: FeedParams) {
  const queryClient = useQueryClient()
  const key = feedKey(params)

  return useMutation({
    mutationFn: async ({ postId, voteType }: { postId: string; voteType: 1 | -1 | null }) => {
      if (voteType === null) {
        const res = await fetch(`/api/votes?target_type=post&target_id=${postId}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Vote failed')
        return res
      }
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_type: 'post', target_id: postId, vote_type: voteType }),
      })
      if (!res.ok) throw new Error('Vote failed')
      return res
    },
    onMutate: async ({ postId, voteType }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const snapshot = queryClient.getQueryData(key)
      queryClient.setQueryData(key, (old: any) =>
        patchInFeed(old, postId, (p) => {
          const diff = voteType === 1 ? (p.user_vote === 1 ? 0 : 1) : voteType === -1 ? (p.user_vote === -1 ? 0 : -1) : p.user_vote === 1 ? -1 : 0
          return { ...p, user_vote: voteType, upvotes_count: Math.max(0, (p.upvotes_count || 0) + diff) }
        })
      )
      return { snapshot }
    },
    onError: (_err, _vars, context: any) => {
      if (context?.snapshot) queryClient.setQueryData(key, context.snapshot)
      toast('Failed to update vote')
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

export function useSaveAction(params: FeedParams) {
  const queryClient = useQueryClient()
  const key = feedKey(params)

  return useMutation({
    mutationFn: async ({ postId }: { postId: string }) => {
      const res = await fetch('/api/saves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_type: 'post', target_id: postId }),
      })
      if (!res.ok) throw new Error('Save failed')
      return res
    },
    onMutate: async ({ postId }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const snapshot = queryClient.getQueryData(key)
      queryClient.setQueryData(key, (old: any) =>
        patchInFeed(old, postId, (p) => ({ ...p, user_saved: !p.user_saved }))
      )
      return { snapshot }
    },
    onError: (_err, _vars, context: any) => {
      if (context?.snapshot) queryClient.setQueryData(key, context.snapshot)
      toast('Failed to save post')
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key })
    },
  })
}
