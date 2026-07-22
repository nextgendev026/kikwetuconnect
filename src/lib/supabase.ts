import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          full_name: string | null
          avatar_url: string | null
          county_hub: string | null
          heshima_rating: number
          is_verified_expert: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          full_name?: string | null
          avatar_url?: string | null
          county_hub?: string | null
          heshima_rating?: number
          is_verified_expert?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          full_name?: string | null
          avatar_url?: string | null
          county_hub?: string | null
          heshima_rating?: number
          is_verified_expert?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          user_id: string
          post_type: 'baraza' | 'inquiry' | 'article'
          title: string | null
          content: string
          media_url: string | null
          county_tag: string | null
          bounty_tokens: number
          upvotes_count: number
          answers_count: number
          is_pinned: boolean
          is_expert_solution: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          post_type: 'baraza' | 'inquiry' | 'article'
          title?: string | null
          content: string
          media_url?: string | null
          county_tag?: string | null
          bounty_tokens?: number
          upvotes_count?: number
          answers_count?: number
          is_pinned?: boolean
          is_expert_solution?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          post_type?: 'baraza' | 'inquiry' | 'article'
          title?: string | null
          content?: string
          media_url?: string | null
          county_tag?: string | null
          bounty_tokens?: number
          upvotes_count?: number
          answers_count?: number
          is_pinned?: boolean
          is_expert_solution?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      answers: {
        Row: {
          id: string
          post_id: string
          user_id: string
          content: string
          upvotes_count: number
          is_expert_solution: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          content: string
          upvotes_count?: number
          is_expert_solution?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          content?: string
          upvotes_count?: number
          is_expert_solution?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      votes: {
        Row: {
          id: string
          user_id: string
          target_type: 'post' | 'answer'
          target_id: string
          vote_type: 1 | -1
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          target_type: 'post' | 'answer'
          target_id: string
          vote_type: 1 | -1
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          target_type?: 'post' | 'answer'
          target_id?: string
          vote_type?: 1 | -1
          created_at?: string
        }
      }
      topics: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          color: string
          follower_count: number
          post_count: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          color?: string
          follower_count?: number
          post_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          color?: string
          follower_count?: number
          post_count?: number
          created_at?: string
        }
      }
      post_topics: {
        Row: {
          post_id: string
          topic_id: string
        }
        Insert: {
          post_id: string
          topic_id: string
        }
        Update: {
          post_id?: string
          topic_id?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          actor_id: string | null
          type: 'upvote' | 'answer' | 'mention' | 'token' | 'follow' | 'expert'
          target_id: string | null
          target_type: 'post' | 'answer' | 'profile' | null
          content: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          actor_id?: string | null
          type: 'upvote' | 'answer' | 'mention' | 'token' | 'follow' | 'expert'
          target_id?: string | null
          target_type?: 'post' | 'answer' | 'profile' | null
          content: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          actor_id?: string | null
          type?: 'upvote' | 'answer' | 'mention' | 'token' | 'follow' | 'expert'
          target_id?: string | null
          target_type?: 'post' | 'answer' | 'profile' | null
          content?: string
          is_read?: boolean
          created_at?: string
        }
      }
      user_topics: {
        Row: {
          user_id: string
          topic_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          topic_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          topic_id?: string
          created_at?: string
        }
      }
      translations: {
        Row: {
          id: string
          source_content: string
          source_language: string
          target_language: string
          translated_content: string
          created_at: string
        }
        Insert: {
          id?: string
          source_content: string
          source_language: string
          target_language: string
          translated_content: string
          created_at?: string
        }
        Update: {
          id?: string
          source_content?: string
          source_language?: string
          target_language?: string
          translated_content?: string
          created_at?: string
        }
      }
      moderation: {
        Row: {
          id: string
          target_type: 'post' | 'answer' | 'profile'
          target_id: string
          reporter_id: string
          reason: string
          evidence: string | null
          status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
          reviewer_id: string | null
          action_taken: string | null
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          target_type: 'post' | 'answer' | 'profile'
          target_id: string
          reporter_id: string
          reason: string
          evidence?: string | null
          status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
          reviewer_id?: string | null
          action_taken?: string | null
          created_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          target_type?: 'post' | 'answer' | 'profile'
          target_id?: string
          reporter_id?: string
          reason?: string
          evidence?: string | null
          status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
          reviewer_id?: string | null
          action_taken?: string | null
          created_at?: string
          resolved_at?: string | null
        }
      }
      tokens: {
        Row: {
          id: string
          user_id: string
          amount: number
          type: 'earned' | 'spent' | 'bounty' | 'award'
          reference: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          type: 'earned' | 'spent' | 'bounty' | 'award'
          reference?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          type?: 'earned' | 'spent' | 'bounty' | 'award'
          reference?: string | null
          created_at?: string
        }
      }
      badges: {
        Row: {
          id: string
          name: string
          description: string
          icon: string
          criteria: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          icon: string
          criteria: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          icon?: string
          criteria?: string
          created_at?: string
        }
      }
      user_badges: {
        Row: {
          user_id: string
          badge_id: string
          awarded_at: string
        }
        Insert: {
          user_id: string
          badge_id: string
          awarded_at?: string
        }
        Update: {
          user_id?: string
          badge_id?: string
          awarded_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Client-side Supabase client
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export const createBrowserClient = () =>
  createClientComponentClient<Database>()

// Server-side Supabase client
export const createServerClient = () =>
  createServerComponentClient<Database>({ cookies })

// Public client (for non-authenticated requests)
export const supabase = createClientComponentClient<Database>()