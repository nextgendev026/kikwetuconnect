import { z } from 'zod'

export const voteSchema = z.object({
  target_type: z.enum(['post', 'answer']),
  target_id: z.string().uuid(),
  vote_type: z.union([z.literal(1), z.literal(-1)]),
})

export const saveSchema = z.object({
  target_type: z.enum(['post', 'answer']),
  target_id: z.string().uuid(),
})

export const postCreateSchema = z.object({
  post_type: z.enum(['baraza', 'inquiry', 'article', 'poll']),
  content: z.string().min(1).max(10000),
  title: z.string().max(200).optional(),
  media_url: z.string().url().optional().nullable(),
  media_type: z.string().optional().nullable(),
  category: z.string().max(50).optional(),
  county_tag: z.string().max(50).optional().nullable(),
  baraza_id: z.string().uuid().optional().nullable(),
  space_id: z.string().uuid().optional().nullable(),
  bounty_tokens: z.number().min(0).max(500).optional(),
})

export const postUpdateSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1).max(10000).optional(),
  is_hidden: z.boolean().optional(),
})

export const messageSchema = z.object({
  conversation_id: z.string().uuid(),
  content: z.string().min(1).max(2000),
})

export const reportSchema = z.object({
  content_type: z.enum(['post', 'answer', 'message', 'profile']),
  content_id: z.string().uuid(),
  reason: z.string().min(1).max(500),
})

export const translateSchema = z.object({
  post_id: z.string().uuid(),
  source_type: z.enum(['posts', 'answers']),
  language: z.string().min(2).max(5),
})

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  full_name: z.string().min(1).max(100),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username must be alphanumeric'),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const profileUpdateSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().url().optional().nullable(),
  county_hub: z.string().max(50).optional().nullable(),
})

export const sessionClaimSchema = z.object({
  action: z.enum(['claim', 'check']),
})

export const followSchema = z.object({
  action: z.enum(['follow', 'unfollow']),
  target_user_id: z.string().uuid(),
})

export const quizAnswerSchema = z.object({
  quiz_id: z.string().uuid(),
  question_id: z.string().uuid(),
  answer_index: z.number().min(0).max(3),
})

export function validateBody<T extends z.ZodType>(schema: T, data: unknown): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const result = schema.safeParse(data)
  if (result.success) return { success: true, data: result.data }
  const firstError = result.error.errors[0]
  return { success: false, error: firstError?.message || 'Validation failed' }
}
