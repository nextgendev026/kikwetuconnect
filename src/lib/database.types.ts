export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_events: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          metadata: Json | null
          severity: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          severity?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          severity?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_impressions: {
        Row: {
          ad_id: string
          created_at: string | null
          id: string
          source: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          ad_id: string
          created_at?: string | null
          id?: string
          source?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          ad_id?: string
          created_at?: string | null
          id?: string
          source?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_impressions_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_impressions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_activity: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_activity_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_bulk_jobs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          error_details: Json | null
          failed: number
          id: string
          item_ids: string[]
          notes: string | null
          processed: number
          status: string
          succeeded: number
          total: number
          updated_at: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          error_details?: Json | null
          failed?: number
          id?: string
          item_ids?: string[]
          notes?: string | null
          processed?: number
          status?: string
          succeeded?: number
          total?: number
          updated_at?: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          error_details?: Json | null
          failed?: number
          id?: string
          item_ids?: string[]
          notes?: string | null
          processed?: number
          status?: string
          succeeded?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_bulk_jobs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ads: {
        Row: {
          clicks: number | null
          created_at: string | null
          created_by: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          impressions: number | null
          is_active: boolean | null
          link_url: string
          placement: string
          starts_at: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          clicks?: number | null
          created_at?: string | null
          created_by?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          impressions?: number | null
          is_active?: boolean | null
          link_url: string
          placement: string
          starts_at?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          clicks?: number | null
          created_at?: string | null
          created_by?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          impressions?: number | null
          is_active?: boolean | null
          link_url?: string
          placement?: string
          starts_at?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      answers: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_expert_solution: boolean | null
          language: string | null
          post_id: string
          updated_at: string | null
          upvotes_count: number | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_expert_solution?: boolean | null
          language?: string | null
          post_id: string
          updated_at?: string | null
          upvotes_count?: number | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_expert_solution?: boolean | null
          language?: string | null
          post_id?: string
          updated_at?: string | null
          upvotes_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          new_state: Json | null
          previous_state: Json | null
          reason: string | null
          updated_at: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          new_state?: Json | null
          previous_state?: Json | null
          reason?: string | null
          updated_at?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          new_state?: Json | null
          previous_state?: Json | null
          reason?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          requirement_type: string
          requirement_value: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      barazas: {
        Row: {
          active_member_count: number | null
          category: string
          county: string
          cover_url: string | null
          created_at: string | null
          description: string | null
          id: string
          is_default: boolean | null
          member_count: number | null
          name: string
          post_count: number | null
          slug: string
          trend: number | null
          updated_at: string | null
        }
        Insert: {
          active_member_count?: number | null
          category?: string
          county: string
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          member_count?: number | null
          name: string
          post_count?: number | null
          slug: string
          trend?: number | null
          updated_at?: string | null
        }
        Update: {
          active_member_count?: number | null
          category?: string
          county?: string
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          member_count?: number | null
          name?: string
          post_count?: number | null
          slug?: string
          trend?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      communities: {
        Row: {
          avatar_url: string | null
          category: string | null
          cover_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_public: boolean | null
          member_count: number | null
          name: string
          post_count: number | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          category?: string | null
          cover_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          member_count?: number | null
          name: string
          post_count?: number | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          category?: string | null
          cover_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          member_count?: number | null
          name?: string
          post_count?: number | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_invites: {
        Row: {
          community_id: string | null
          created_at: string | null
          id: string
          invited_by: string | null
          invited_user: string | null
          status: string | null
        }
        Insert: {
          community_id?: string | null
          created_at?: string | null
          id?: string
          invited_by?: string | null
          invited_user?: string | null
          status?: string | null
        }
        Update: {
          community_id?: string | null
          created_at?: string | null
          id?: string
          invited_by?: string | null
          invited_user?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_invites_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_invites_invited_user_fkey"
            columns: ["invited_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members: {
        Row: {
          community_id: string | null
          id: string
          joined_at: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          community_id?: string | null
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          community_id?: string | null
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_flags: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          flagged_by: string
          id: string
          notes: string | null
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          risk_score: number
          status: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          flagged_by?: string
          id?: string
          notes?: string | null
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_score?: number
          status?: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          flagged_by?: string
          id?: string
          notes?: string | null
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_score?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_flags_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string | null
          id: string
          joined_at: string | null
          last_read_at: string | null
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          last_message: string | null
          last_message_at: string | null
          title: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      error_reports: {
        Row: {
          created_at: string
          id: string
          message: string | null
          metadata: Json | null
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          route: string | null
          source: string
          stack: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          route?: string | null
          source: string
          stack?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          route?: string | null
          source?: string
          stack?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "error_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expert_applications: {
        Row: {
          admin_notes: string | null
          category_id: string | null
          certification_urls: string[] | null
          created_at: string | null
          experience: string
          id: string
          qualifications: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          category_id?: string | null
          certification_urls?: string[] | null
          created_at?: string | null
          experience: string
          id?: string
          qualifications: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          category_id?: string | null
          certification_urls?: string[] | null
          created_at?: string | null
          experience?: string
          id?: string
          qualifications?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expert_applications_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expertise_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expert_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expert_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expertise_categories: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      follow_requests: {
        Row: {
          created_at: string | null
          id: string
          requester_id: string
          status: string | null
          target_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          requester_id: string
          status?: string | null
          target_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          requester_id?: string
          status?: string | null
          target_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_requests_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      heshima_earnings: {
        Row: {
          amount: number
          balance_after: number
          created_at: string | null
          description: string | null
          id: string
          source_id: string | null
          source_type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string | null
          description?: string | null
          id?: string
          source_id?: string | null
          source_type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string | null
          description?: string | null
          id?: string
          source_id?: string | null
          source_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "heshima_earnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          category: string
          condition: string | null
          county: string
          created_at: string | null
          currency: string | null
          description: string
          id: string
          images: string[] | null
          is_active: boolean | null
          location: string | null
          orders_count: number | null
          price: number
          seller_id: string
          seller_rating: number | null
          status: string | null
          stock_quantity: number | null
          title: string
          tsv: unknown
          updated_at: string | null
          views_count: number | null
        }
        Insert: {
          category: string
          condition?: string | null
          county: string
          created_at?: string | null
          currency?: string | null
          description: string
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          location?: string | null
          orders_count?: number | null
          price: number
          seller_id: string
          seller_rating?: number | null
          status?: string | null
          stock_quantity?: number | null
          title: string
          tsv?: unknown
          updated_at?: string | null
          views_count?: number | null
        }
        Update: {
          category?: string
          condition?: string | null
          county?: string
          created_at?: string | null
          currency?: string | null
          description?: string
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          location?: string | null
          orders_count?: number | null
          price?: number
          seller_id?: string
          seller_rating?: number | null
          status?: string | null
          stock_quantity?: number | null
          title?: string
          tsv?: unknown
          updated_at?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_messages: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          order_id: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          order_id?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          order_id?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "marketplace_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_orders: {
        Row: {
          buyer_id: string
          contact_phone: string | null
          created_at: string | null
          delivery_address: string | null
          delivery_notes: string | null
          id: string
          listing_id: string
          payment_method: string | null
          quantity: number | null
          seller_id: string
          status: string | null
          total_price: number
          updated_at: string | null
        }
        Insert: {
          buyer_id: string
          contact_phone?: string | null
          created_at?: string | null
          delivery_address?: string | null
          delivery_notes?: string | null
          id?: string
          listing_id: string
          payment_method?: string | null
          quantity?: number | null
          seller_id: string
          status?: string | null
          total_price: number
          updated_at?: string | null
        }
        Update: {
          buyer_id?: string
          contact_phone?: string | null
          created_at?: string | null
          delivery_address?: string | null
          delivery_notes?: string | null
          id?: string
          listing_id?: string
          payment_method?: string | null
          quantity?: number | null
          seller_id?: string
          status?: string | null
          total_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          listing_id: string | null
          order_id: string
          rating: number
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          listing_id?: string | null
          order_id: string
          rating: number
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          listing_id?: string | null
          order_id?: string
          rating?: number
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "marketplace_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media_items: {
        Row: {
          created_at: string | null
          duration: number | null
          file_size: number | null
          height: number | null
          id: string
          message_id: string | null
          mime_type: string | null
          post_id: string | null
          sort_order: number | null
          thumbnail_url: string | null
          type: string
          url: string
          width: number | null
        }
        Insert: {
          created_at?: string | null
          duration?: number | null
          file_size?: number | null
          height?: number | null
          id?: string
          message_id?: string | null
          mime_type?: string | null
          post_id?: string | null
          sort_order?: number | null
          thumbnail_url?: string | null
          type: string
          url: string
          width?: number | null
        }
        Update: {
          created_at?: string | null
          duration?: number | null
          file_size?: number | null
          height?: number | null
          id?: string
          message_id?: string | null
          mime_type?: string | null
          post_id?: string | null
          sort_order?: number | null
          thumbnail_url?: string | null
          type?: string
          url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_items_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_items_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          file_url: string | null
          id: string
          is_read: boolean | null
          message_type: string | null
          metadata: Json | null
          read_at: string | null
          receiver_id: string | null
          reply_to: string | null
          sender_id: string
          session_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean | null
          message_type?: string | null
          metadata?: Json | null
          read_at?: string | null
          receiver_id?: string | null
          reply_to?: string | null
          sender_id: string
          session_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean | null
          message_type?: string | null
          metadata?: Json | null
          read_at?: string | null
          receiver_id?: string | null
          reply_to?: string | null
          sender_id?: string
          session_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation: {
        Row: {
          action_taken: string | null
          created_at: string | null
          evidence: string | null
          id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          reviewer_id: string | null
          status: string | null
          target_id: string
          target_type: string
          updated_at: string | null
        }
        Insert: {
          action_taken?: string | null
          created_at?: string | null
          evidence?: string | null
          id?: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          reviewer_id?: string | null
          status?: string | null
          target_id: string
          target_type: string
          updated_at?: string | null
        }
        Update: {
          action_taken?: string | null
          created_at?: string | null
          evidence?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          reviewer_id?: string | null
          status?: string | null
          target_id?: string
          target_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_queue: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          reason: string | null
          reporter_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          reporter_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          reporter_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_queue_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_queue_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          email_enabled: boolean | null
          push_enabled: boolean | null
          types: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_enabled?: boolean | null
          push_enabled?: boolean | null
          types?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_enabled?: boolean | null
          push_enabled?: boolean | null
          types?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string | null
          content: string | null
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          meta: Json | null
          target_id: string | null
          target_type: string | null
          title: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          content?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          meta?: Json | null
          target_id?: string | null
          target_type?: string | null
          title?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          content?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          meta?: Json | null
          target_id?: string | null
          target_type?: string | null
          title?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nyumba_kumi_alerts: {
        Row: {
          approximate_location: string | null
          confirmations: number | null
          county: string
          created_at: string | null
          description: string
          id: string
          is_urgent: boolean | null
          severity: string | null
          status: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approximate_location?: string | null
          confirmations?: number | null
          county: string
          created_at?: string | null
          description: string
          id?: string
          is_urgent?: boolean | null
          severity?: string | null
          status?: string | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approximate_location?: string | null
          confirmations?: number | null
          county?: string
          created_at?: string | null
          description?: string
          id?: string
          is_urgent?: boolean | null
          severity?: string | null
          status?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nyumba_kumi_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nyumba_kumi_confirmations: {
        Row: {
          alert_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          alert_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          alert_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nyumba_kumi_confirmations_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "nyumba_kumi_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nyumba_kumi_confirmations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nyumba_kumi_group_members: {
        Row: {
          group_id: string | null
          id: string
          joined_at: string | null
          role: string
          user_id: string | null
        }
        Insert: {
          group_id?: string | null
          id?: string
          joined_at?: string | null
          role?: string
          user_id?: string | null
        }
        Update: {
          group_id?: string | null
          id?: string
          joined_at?: string | null
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nyumba_kumi_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "nyumba_kumi_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nyumba_kumi_group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nyumba_kumi_groups: {
        Row: {
          county: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_public: boolean | null
          member_count: number | null
          name: string
          slug: string
        }
        Insert: {
          county?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          member_count?: number | null
          name: string
          slug: string
        }
        Update: {
          county?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          member_count?: number | null
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "nyumba_kumi_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nyumba_kumi_invites: {
        Row: {
          code: string | null
          created_at: string | null
          group_id: string | null
          id: string
          invitee_id: string | null
          inviter_id: string | null
          status: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          group_id?: string | null
          id?: string
          invitee_id?: string | null
          inviter_id?: string | null
          status?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          group_id?: string | null
          id?: string
          invitee_id?: string | null
          inviter_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nyumba_kumi_invites_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "nyumba_kumi_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nyumba_kumi_invites_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nyumba_kumi_invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nyumba_kumi_saved: {
        Row: {
          alert_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          alert_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          alert_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nyumba_kumi_saved_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "nyumba_kumi_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nyumba_kumi_saved_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nyumba_kumi_trusted: {
        Row: {
          created_at: string | null
          id: string
          trusted_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          trusted_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          trusted_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nyumba_kumi_trusted_trusted_id_fkey"
            columns: ["trusted_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nyumba_kumi_trusted_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      page_admins: {
        Row: {
          added_at: string | null
          added_by: string | null
          id: string
          page_id: string
          role: string
          user_id: string
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          id?: string
          page_id: string
          role?: string
          user_id: string
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          id?: string
          page_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_admins_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_admins_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      page_follows: {
        Row: {
          created_at: string | null
          id: string
          page_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          page_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          page_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_follows_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          address: string | null
          avatar_url: string | null
          category: string
          cover_url: string | null
          created_at: string | null
          created_by: string | null
          description: string
          email: string | null
          followers_count: number | null
          id: string
          is_verified: boolean | null
          name: string
          phone: string | null
          posts_count: number | null
          slug: string
          tsv: unknown
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          category?: string
          cover_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          email?: string | null
          followers_count?: number | null
          id?: string
          is_verified?: boolean | null
          name: string
          phone?: string | null
          posts_count?: number | null
          slug: string
          tsv?: unknown
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          category?: string
          cover_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          email?: string | null
          followers_count?: number | null
          id?: string
          is_verified?: boolean | null
          name?: string
          phone?: string | null
          posts_count?: number | null
          slug?: string
          tsv?: unknown
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_links: {
        Row: {
          child_id: string
          created_at: string | null
          id: string
          parent_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          child_id: string
          created_at?: string | null
          id?: string
          parent_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          child_id?: string
          created_at?: string | null
          id?: string
          parent_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_links_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_links_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          fee: number
          id: string
          mpesa_number: string
          mpesa_reference: string | null
          net_amount: number
          period_end: string
          period_start: string
          processed_at: string | null
          professional_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          fee: number
          id?: string
          mpesa_number: string
          mpesa_reference?: string | null
          net_amount: number
          period_end: string
          period_start: string
          processed_at?: string | null
          professional_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          fee?: number
          id?: string
          mpesa_number?: string
          mpesa_reference?: string | null
          net_amount?: number
          period_end?: string
          period_start?: string
          processed_at?: string | null
          professional_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payouts_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      poll_options: {
        Row: {
          created_at: string | null
          id: string
          option_text: string
          post_id: string
          votes: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_text: string
          post_id: string
          votes?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          option_text?: string
          post_id?: string
          votes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string | null
          option_id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          option_id: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          option_id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_topics: {
        Row: {
          created_at: string | null
          post_id: string
          topic_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          post_id: string
          topic_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          post_id?: string
          topic_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_topics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      post_translations: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          language: string
          post_id: string
          provider: string | null
          provider_response: Json | null
          source_type: string
          translated_text: string
          translated_title: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          language?: string
          post_id: string
          provider?: string | null
          provider_response?: Json | null
          source_type?: string
          translated_text: string
          translated_title?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          language?: string
          post_id?: string
          provider?: string | null
          provider_response?: Json | null
          source_type?: string
          translated_text?: string
          translated_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_translations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          answers_count: number | null
          baraza_id: string | null
          bounty_tokens: number | null
          category: string
          content: string
          county_tag: string | null
          created_at: string | null
          downvotes_count: number | null
          embed_active: boolean | null
          embed_description: string | null
          embed_image: string | null
          embed_title: string | null
          embed_url: string | null
          id: string
          is_expert_solution: boolean | null
          is_hidden: boolean | null
          is_pinned: boolean | null
          language: string | null
          media_duration: number | null
          media_type: string | null
          media_types: string[] | null
          media_url: string | null
          media_urls: string[] | null
          page_id: string | null
          poll_options: Json | null
          post_type: string
          space_id: string | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string | null
          upvotes_count: number | null
          user_id: string
        }
        Insert: {
          answers_count?: number | null
          baraza_id?: string | null
          bounty_tokens?: number | null
          category?: string
          content: string
          county_tag?: string | null
          created_at?: string | null
          downvotes_count?: number | null
          embed_active?: boolean | null
          embed_description?: string | null
          embed_image?: string | null
          embed_title?: string | null
          embed_url?: string | null
          id?: string
          is_expert_solution?: boolean | null
          is_hidden?: boolean | null
          is_pinned?: boolean | null
          language?: string | null
          media_duration?: number | null
          media_type?: string | null
          media_types?: string[] | null
          media_url?: string | null
          media_urls?: string[] | null
          page_id?: string | null
          poll_options?: Json | null
          post_type: string
          space_id?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          upvotes_count?: number | null
          user_id: string
        }
        Update: {
          answers_count?: number | null
          baraza_id?: string | null
          bounty_tokens?: number | null
          category?: string
          content?: string
          county_tag?: string | null
          created_at?: string | null
          downvotes_count?: number | null
          embed_active?: boolean | null
          embed_description?: string | null
          embed_image?: string | null
          embed_title?: string | null
          embed_url?: string | null
          id?: string
          is_expert_solution?: boolean | null
          is_hidden?: boolean | null
          is_pinned?: boolean | null
          language?: string | null
          media_duration?: number | null
          media_type?: string | null
          media_types?: string[] | null
          media_url?: string | null
          media_urls?: string[] | null
          page_id?: string | null
          poll_options?: Json | null
          post_type?: string
          space_id?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          upvotes_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_baraza_id_fkey"
            columns: ["baraza_id"]
            isOneToOne: false
            referencedRelation: "barazas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          availability: string | null
          bio: string
          county: string | null
          created_at: string | null
          currency: string | null
          expertise: string[] | null
          heshima_rating: number | null
          id: string
          languages: string[] | null
          mpesa_number: string | null
          qualification_doc: string | null
          qualifications: string
          rate: number | null
          rating: number | null
          session_count: number | null
          session_format: string | null
          status: string | null
          teaching_levels: string[] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          availability?: string | null
          bio: string
          county?: string | null
          created_at?: string | null
          currency?: string | null
          expertise?: string[] | null
          heshima_rating?: number | null
          id?: string
          languages?: string[] | null
          mpesa_number?: string | null
          qualification_doc?: string | null
          qualifications: string
          rate?: number | null
          rating?: number | null
          session_count?: number | null
          session_format?: string | null
          status?: string | null
          teaching_levels?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          availability?: string | null
          bio?: string
          county?: string | null
          created_at?: string | null
          currency?: string | null
          expertise?: string[] | null
          heshima_rating?: number | null
          id?: string
          languages?: string[] | null
          mpesa_number?: string | null
          qualification_doc?: string | null
          qualifications?: string
          rate?: number | null
          rating?: number | null
          session_count?: number | null
          session_format?: string | null
          status?: string | null
          teaching_levels?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professionals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_session_id: string | null
          area: string | null
          avatar_url: string | null
          bio: string | null
          county_hub: string | null
          cover_url: string | null
          created_at: string | null
          expert_since: string | null
          featured_post_id: string | null
          follower_count: number | null
          following_count: number | null
          full_name: string | null
          headline: string | null
          heshima_balance: number | null
          heshima_cap: number | null
          heshima_rating: number | null
          id: string
          interests: string[] | null
          is_deactivated: boolean
          is_expert: boolean | null
          is_online: boolean | null
          is_verified_expert: boolean | null
          languages: string[] | null
          last_active_date: string | null
          last_seen: string | null
          latitude: number | null
          location_updated_at: string | null
          longitude: number | null
          notif_pref: string
          phone: string | null
          preferred_language: string | null
          quizzes_completed: number | null
          role: string
          social_handles: Json | null
          streak_days: number | null
          total_contributions: number | null
          updated_at: string | null
          user_type: string | null
          username: string
          visibility: string
        }
        Insert: {
          active_session_id?: string | null
          area?: string | null
          avatar_url?: string | null
          bio?: string | null
          county_hub?: string | null
          cover_url?: string | null
          created_at?: string | null
          expert_since?: string | null
          featured_post_id?: string | null
          follower_count?: number | null
          following_count?: number | null
          full_name?: string | null
          headline?: string | null
          heshima_balance?: number | null
          heshima_cap?: number | null
          heshima_rating?: number | null
          id: string
          interests?: string[] | null
          is_deactivated?: boolean
          is_expert?: boolean | null
          is_online?: boolean | null
          is_verified_expert?: boolean | null
          languages?: string[] | null
          last_active_date?: string | null
          last_seen?: string | null
          latitude?: number | null
          location_updated_at?: string | null
          longitude?: number | null
          notif_pref?: string
          phone?: string | null
          preferred_language?: string | null
          quizzes_completed?: number | null
          role?: string
          social_handles?: Json | null
          streak_days?: number | null
          total_contributions?: number | null
          updated_at?: string | null
          user_type?: string | null
          username: string
          visibility?: string
        }
        Update: {
          active_session_id?: string | null
          area?: string | null
          avatar_url?: string | null
          bio?: string | null
          county_hub?: string | null
          cover_url?: string | null
          created_at?: string | null
          expert_since?: string | null
          featured_post_id?: string | null
          follower_count?: number | null
          following_count?: number | null
          full_name?: string | null
          headline?: string | null
          heshima_balance?: number | null
          heshima_cap?: number | null
          heshima_rating?: number | null
          id?: string
          interests?: string[] | null
          is_deactivated?: boolean
          is_expert?: boolean | null
          is_online?: boolean | null
          is_verified_expert?: boolean | null
          languages?: string[] | null
          last_active_date?: string | null
          last_seen?: string | null
          latitude?: number | null
          location_updated_at?: string | null
          longitude?: number | null
          notif_pref?: string
          phone?: string | null
          preferred_language?: string | null
          quizzes_completed?: number | null
          role?: string
          social_handles?: Json | null
          streak_days?: number | null
          total_contributions?: number | null
          updated_at?: string | null
          user_type?: string | null
          username?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_featured_post_id_fkey"
            columns: ["featured_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string | null
          device_type: string | null
          endpoint: string
          id: string
          p256dh_key: string
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string | null
          device_type?: string | null
          endpoint: string
          id?: string
          p256dh_key: string
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string | null
          device_type?: string | null
          endpoint?: string
          id?: string
          p256dh_key?: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers: Json | null
          completed_at: string | null
          id: string
          quiz_id: string | null
          score: number
          total_questions: number
          user_id: string
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          id?: string
          quiz_id?: string | null
          score?: number
          total_questions?: number
          user_id: string
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          id?: string
          quiz_id?: string | null
          score?: number
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_progress: {
        Row: {
          current_question: number | null
          quiz_id: string
          selected_answers: Json | null
          started_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          current_question?: number | null
          quiz_id: string
          selected_answers?: Json | null
          started_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          current_question?: number | null
          quiz_id?: string
          selected_answers?: Json | null
          started_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_progress_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_index: number
          created_at: string | null
          explanation: string | null
          id: string
          options: string[]
          question: string
          quiz_id: string
          updated_at: string | null
        }
        Insert: {
          correct_index: number
          created_at?: string | null
          explanation?: string | null
          id?: string
          options: string[]
          question: string
          quiz_id: string
          updated_at?: string | null
        }
        Update: {
          correct_index?: number
          created_at?: string | null
          explanation?: string | null
          id?: string
          options?: string[]
          question?: string
          quiz_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_results: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          quiz_id: string
          score: number
          total: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          quiz_id: string
          score: number
          total: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          quiz_id?: string
          score?: number
          total?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_results_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          category: string
          county: string | null
          created_at: string | null
          created_by: string | null
          description: string
          difficulty: string
          estimated_time_minutes: number | null
          heshima_reward: number | null
          id: string
          language: string | null
          question_count: number | null
          slug: string
          space_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category: string
          county?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          difficulty: string
          estimated_time_minutes?: number | null
          heshima_reward?: number | null
          id?: string
          language?: string | null
          question_count?: number | null
          slug: string
          space_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          county?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          difficulty?: string
          estimated_time_minutes?: number | null
          heshima_reward?: number | null
          id?: string
          language?: string | null
          question_count?: number | null
          slug?: string
          space_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_listings: {
        Row: {
          created_at: string | null
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_listings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_quizzes: {
        Row: {
          created_at: string | null
          quiz_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          quiz_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          quiz_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_quizzes_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_quizzes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saves: {
        Row: {
          created_at: string | null
          id: string
          target_id: string
          target_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          target_id: string
          target_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          target_id?: string
          target_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string | null
          duration_minutes: number | null
          format: string | null
          goal: string | null
          id: string
          language: string | null
          notes: string | null
          post_id: string | null
          professional_id: string
          scheduled_at: string | null
          status: string | null
          student_id: string
          student_rating: number | null
          student_review: string | null
          tip_amount: number | null
          tip_status: string | null
          topic: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          duration_minutes?: number | null
          format?: string | null
          goal?: string | null
          id?: string
          language?: string | null
          notes?: string | null
          post_id?: string | null
          professional_id: string
          scheduled_at?: string | null
          status?: string | null
          student_id: string
          student_rating?: number | null
          student_review?: string | null
          tip_amount?: number | null
          tip_status?: string | null
          topic: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          duration_minutes?: number | null
          format?: string | null
          goal?: string | null
          id?: string
          language?: string | null
          notes?: string | null
          post_id?: string | null
          professional_id?: string
          scheduled_at?: string | null
          status?: string | null
          student_id?: string
          student_rating?: number | null
          student_review?: string | null
          tip_amount?: number | null
          tip_status?: string | null
          topic?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      space_members: {
        Row: {
          created_at: string | null
          joined_at: string | null
          role: string
          space_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          joined_at?: string | null
          role?: string
          space_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          joined_at?: string | null
          role?: string
          space_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_members_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces: {
        Row: {
          address: string | null
          avatar_url: string | null
          category: string | null
          cover_url: string | null
          created_at: string | null
          created_by: string | null
          description: string
          email: string | null
          icon: string | null
          id: string
          is_private: boolean | null
          is_verified: boolean | null
          language: string | null
          member_count: number | null
          name: string
          phone: string | null
          post_count: number | null
          slug: string
          tsv: unknown
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          category?: string | null
          cover_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          email?: string | null
          icon?: string | null
          id?: string
          is_private?: boolean | null
          is_verified?: boolean | null
          language?: string | null
          member_count?: number | null
          name: string
          phone?: string | null
          post_count?: number | null
          slug: string
          tsv?: unknown
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          category?: string | null
          cover_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          email?: string | null
          icon?: string | null
          id?: string
          is_private?: boolean | null
          is_verified?: boolean | null
          language?: string | null
          member_count?: number | null
          name?: string
          phone?: string | null
          post_count?: number | null
          slug?: string
          tsv?: unknown
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spaces_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_help_requests: {
        Row: {
          assigned_to: string | null
          budget_heshima: number | null
          created_at: string | null
          description: string
          id: string
          status: string | null
          student_id: string
          subject: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          budget_heshima?: number | null
          created_at?: string | null
          description: string
          id?: string
          status?: string | null
          student_id: string
          subject?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          budget_heshima?: number | null
          created_at?: string | null
          description?: string
          id?: string
          status?: string | null
          student_id?: string
          subject?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_help_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_help_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_sessions: {
        Row: {
          created_at: string | null
          duration_minutes: number | null
          ended_at: string | null
          expert_id: string
          expert_notes: string | null
          heshima_earned: number | null
          id: string
          request_id: string | null
          started_at: string | null
          status: string | null
          student_feedback: string | null
          student_id: string
          student_rating: number | null
        }
        Insert: {
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          expert_id: string
          expert_notes?: string | null
          heshima_earned?: number | null
          id?: string
          request_id?: string | null
          started_at?: string | null
          status?: string | null
          student_feedback?: string | null
          student_id: string
          student_rating?: number | null
        }
        Update: {
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          expert_id?: string
          expert_notes?: string | null
          heshima_earned?: number | null
          id?: string
          request_id?: string | null
          started_at?: string | null
          status?: string | null
          student_feedback?: string | null
          student_id?: string
          student_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_sessions_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_sessions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "student_help_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_areas: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      tips: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          fee: number
          id: string
          mpesa_reference: string | null
          net_amount: number
          professional_id: string
          sender_id: string
          session_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          fee: number
          id?: string
          mpesa_reference?: string | null
          net_amount: number
          professional_id: string
          sender_id: string
          session_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          fee?: number
          id?: string
          mpesa_reference?: string | null
          net_amount?: number
          professional_id?: string
          sender_id?: string
          session_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tips_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      tokens: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          reference: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          reference?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          reference?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          follower_count: number | null
          icon: string | null
          id: string
          name: string
          post_count: number | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          follower_count?: number | null
          icon?: string | null
          id?: string
          name: string
          post_count?: number | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          follower_count?: number | null
          icon?: string | null
          id?: string
          name?: string
          post_count?: number | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      translations: {
        Row: {
          created_at: string | null
          id: string
          source_content: string
          source_language: string
          target_language: string
          translated_content: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          source_content: string
          source_language: string
          target_language: string
          translated_content: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          source_content?: string
          source_language?: string
          target_language?: string
          translated_content?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          awarded_at: string | null
          badge_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          awarded_at?: string | null
          badge_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          awarded_at?: string | null
          badge_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interactions: {
        Row: {
          created_at: string | null
          id: string
          interaction_type: string
          metadata: Json | null
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          interaction_type: string
          metadata?: Json | null
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          interaction_type?: string
          metadata?: Json | null
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_locations: {
        Row: {
          county: string | null
          id: string
          last_updated: string | null
          latitude: number | null
          longitude: number | null
          user_id: string | null
        }
        Insert: {
          county?: string | null
          id?: string
          last_updated?: string | null
          latitude?: number | null
          longitude?: number | null
          user_id?: string | null
        }
        Update: {
          county?: string | null
          id?: string
          last_updated?: string | null
          latitude?: number | null
          longitude?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_locations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_patterns: {
        Row: {
          active_hours: number[]
          comments_7d: number
          engagement_score: number
          first_seen: string
          follows_7d: number
          last_active: string | null
          posts_7d: number
          risk_score: number
          signins_7d: number
          updated_at: string
          upvotes_7d: number
          user_id: string
        }
        Insert: {
          active_hours?: number[]
          comments_7d?: number
          engagement_score?: number
          first_seen?: string
          follows_7d?: number
          last_active?: string | null
          posts_7d?: number
          risk_score?: number
          signins_7d?: number
          updated_at?: string
          upvotes_7d?: number
          user_id: string
        }
        Update: {
          active_hours?: number[]
          comments_7d?: number
          engagement_score?: number
          first_seen?: string
          follows_7d?: number
          last_active?: string | null
          posts_7d?: number
          risk_score?: number
          signins_7d?: number
          updated_at?: string
          upvotes_7d?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_patterns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_topics: {
        Row: {
          created_at: string | null
          topic_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          topic_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          topic_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_topics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_typing: {
        Row: {
          conversation_id: string
          id: string
          started_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          started_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_typing_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_typing_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          created_at: string | null
          id: string
          target_id: string
          target_type: string
          updated_at: string | null
          user_id: string
          vote_type: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          target_id: string
          target_type: string
          updated_at?: string | null
          user_id: string
          vote_type: number
        }
        Update: {
          created_at?: string | null
          id?: string
          target_id?: string
          target_type?: string
          updated_at?: string | null
          user_id?: string
          vote_type?: number
        }
        Relationships: [
          {
            foreignKeyName: "votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_topups: {
        Row: {
          account_reference: string | null
          amount: number
          checkout_request_id: string | null
          completed_at: string | null
          created_at: string | null
          error: string | null
          id: string
          mpesa_reference: string | null
          phone: string
          status: string
          user_id: string
        }
        Insert: {
          account_reference?: string | null
          amount: number
          checkout_request_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          mpesa_reference?: string | null
          phone: string
          status?: string
          user_id: string
        }
        Update: {
          account_reference?: string | null
          amount?: number
          checkout_request_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          mpesa_reference?: string | null
          phone?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_topups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_follow_request: { Args: { p_request_id: string }; Returns: Json }
      admin_activity_overview: { Args: never; Returns: Json }
      admin_bulk_moderate: {
        Args: {
          p_admin_id: string
          p_item_ids: string[]
          p_notes?: string
          p_status: string
        }
        Returns: string
      }
      admin_delete_content: {
        Args: { p_item_id: string; p_item_type: string }
        Returns: Json
      }
      admin_export_snapshot: { Args: never; Returns: Json }
      admin_log_activity: {
        Args: {
          p_action: string
          p_details?: Json
          p_target_id?: string
          p_target_type?: string
        }
        Returns: undefined
      }
      admin_moderate_item: {
        Args: {
          p_admin_id: string
          p_item_id: string
          p_notes?: string
          p_status: string
        }
        Returns: undefined
      }
      admin_reinstate_user: {
        Args: { p_admin_id: string; p_reason: string; p_user_id: string }
        Returns: undefined
      }
      admin_review_expert_application: {
        Args: { p_app_id: string; p_approve: boolean; p_notes?: string }
        Returns: undefined
      }
      admin_suspend_user: {
        Args: { p_admin_id: string; p_reason: string; p_user_id: string }
        Returns: undefined
      }
      admin_user_patterns: { Args: { p_limit?: number }; Returns: Json }
      award_heshima_milestone_badges: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      award_weekly_contribution_bonus: { Args: never; Returns: undefined }
      calculate_user_interest_score: {
        Args: { p_post_id: string; p_user_id: string }
        Returns: number
      }
      can_dm: { Args: { target_user_id: string }; Returns: boolean }
      cancel_follow_request: { Args: { p_target_id: string }; Returns: Json }
      cancel_order: { Args: { p_order_id: string }; Returns: Json }
      check_alert_rate_limit: { Args: { p_user_id: string }; Returns: Json }
      check_and_award_badges: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      check_content_risk: { Args: { p_content: string }; Returns: Json }
      check_expert_graduation: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      complete_wallet_topup: {
        Args: {
          p_amount?: number
          p_checkout_request_id: string
          p_mpesa_reference: string
        }
        Returns: Json
      }
      compute_baraza_trending: { Args: never; Returns: undefined }
      confirm_order_payment: {
        Args: {
          p_order_id: string
          p_payment_provider?: string
          p_payment_reference?: string
        }
        Returns: Json
      }
      create_conversation: {
        Args: { p_member_ids?: string[]; p_title?: string; p_type?: string }
        Returns: string
      }
      create_follow_request: { Args: { p_target_id: string }; Returns: Json }
      create_notification: {
        Args: {
          p_actor_id?: string
          p_body?: string
          p_content?: string
          p_data?: Json
          p_meta?: Json
          p_target_id?: string
          p_target_type?: string
          p_title?: string
          p_type?: string
          p_user_id: string
        }
        Returns: string
      }
      create_nyumba_alert: {
        Args: {
          p_alert_type: string
          p_description: string
          p_location: string
          p_severity: string
          p_title: string
          p_user_id: string
        }
        Returns: Json
      }
      create_nyumba_group_audited: {
        Args: {
          p_county?: string
          p_description: string
          p_name: string
          p_slug: string
        }
        Returns: Json
      }
      create_order: {
        Args: {
          p_contact_phone?: string
          p_delivery_address?: string
          p_delivery_notes?: string
          p_listing_id: string
          p_quantity?: number
        }
        Returns: Json
      }
      create_post_with_media: {
        Args: {
          p_bounty_tokens?: number
          p_content: string
          p_county_tag?: string
          p_language?: string
          p_media_type?: string
          p_media_url?: string
          p_post_type: string
          p_title?: string
          p_user_id: string
        }
        Returns: Json
      }
      decline_follow_request: { Args: { p_request_id: string }; Returns: Json }
      decrement_follower_count: {
        Args: { user_id: string }
        Returns: undefined
      }
      decrement_following_count: {
        Args: { user_id: string }
        Returns: undefined
      }
      ensure_heshima_milestone_badges: { Args: never; Returns: undefined }
      fail_wallet_topup: {
        Args: { p_checkout_request_id: string; p_error?: string }
        Returns: Json
      }
      finalize_upload: {
        Args: { p_make_public?: boolean; p_path: string }
        Returns: Json
      }
      flag_content: {
        Args: {
          p_content_id: string
          p_content_type: string
          p_reason: string
          p_risk_score?: number
        }
        Returns: string
      }
      generate_video_thumbnail: {
        Args: { p_bucket?: string; p_file_path: string }
        Returns: string
      }
      get_admin_bulk_job: { Args: { p_job_id: string }; Returns: Json }
      get_admin_stats: { Args: never; Returns: Json }
      get_barazas: {
        Args: {
          p_category?: string
          p_page?: number
          p_page_size?: number
          p_sort?: string
        }
        Returns: Json
      }
      get_conversation_participants: {
        Args: { p_conversation_id: string }
        Returns: Json
      }
      get_heshima_balance: { Args: { p_user_id: string }; Returns: number }
      get_pending_follow_requests: { Args: never; Returns: Json }
      get_personalized_feed: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string }
        Returns: {
          answers_count: number
          author_avatar: string
          author_heshima: number
          author_id: string
          author_name: string
          author_username: string
          bounty_tokens: number
          content: string
          county_tag: string
          created_at: string
          id: string
          media_url: string
          post_type: string
          relevance_score: number
          title: string
          upvotes_count: number
        }[]
      }
      get_post_by_id: { Args: { p_post_id: string }; Returns: Json }
      get_sent_follow_requests: { Args: never; Returns: Json }
      get_setting: { Args: { p_key: string }; Returns: string }
      get_signed_upload_url: {
        Args: { p_content_type?: string; p_folder?: string }
        Returns: Json
      }
      grant_heshima: {
        Args: {
          p_amount: number
          p_description?: string
          p_source_id?: string
          p_source_type: string
          p_user_id: string
        }
        Returns: Json
      }
      hide_alert_audited: { Args: { p_alert_id: string }; Returns: undefined }
      increment_follower_count: {
        Args: { user_id: string }
        Returns: undefined
      }
      increment_following_count: {
        Args: { user_id: string }
        Returns: undefined
      }
      insert_translation:
        | {
            Args: {
              p_language: string
              p_post_id: string
              p_source_type: string
              p_translated_text: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_language: string
              p_post_id: string
              p_provider?: string
              p_source_type: string
              p_translated_text: string
              p_translated_title?: string
            }
            Returns: undefined
          }
      is_admin: { Args: never; Returns: boolean }
      is_conversation_participant: {
        Args: { conv_id: string }
        Returns: boolean
      }
      is_space_member: {
        Args: { p_roles?: string[]; p_space_id: string; p_user_id: string }
        Returns: boolean
      }
      mark_conversation_read: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      moderate_alert_audited: {
        Args: { p_item_id: string; p_notes?: string; p_status: string }
        Returns: undefined
      }
      recalculate_comprehensive_heshima: {
        Args: { p_user_id?: string }
        Returns: undefined
      }
      recalculate_heshima: { Args: { p_user_id?: string }; Returns: undefined }
      refresh_user_patterns: { Args: { p_user_id?: string }; Returns: number }
      report_alert_audited: {
        Args: { p_alert_id: string; p_reason?: string }
        Returns: undefined
      }
      report_error: {
        Args: {
          p_message: string
          p_metadata?: Json
          p_route: string
          p_source: string
          p_stack?: string
        }
        Returns: string
      }
      resolve_error: {
        Args: { p_error_id: string; p_resolution?: string }
        Returns: Json
      }
      review_content_flag: {
        Args: { p_action: string; p_flag_id: string; p_notes?: string }
        Returns: Json
      }
      save_ai_quiz: {
        Args: {
          p_category: string
          p_description: string
          p_difficulty?: string
          p_questions?: Json
          p_title: string
        }
        Returns: string
      }
      send_message: {
        Args: {
          p_content: string
          p_conversation_id: string
          p_message_type?: string
          p_metadata?: Json
          p_reply_to?: string
        }
        Returns: Json
      }
      set_setting: {
        Args: { p_key: string; p_value: string }
        Returns: undefined
      }
      spend_heshima: {
        Args: {
          p_amount: number
          p_description?: string
          p_source_id?: string
          p_source_type: string
          p_user_id: string
        }
        Returns: Json
      }
      toggle_save: {
        Args: { p_target_id: string; p_target_type: string }
        Returns: Json
      }
      track_activity: {
        Args: {
          p_entity_id?: string
          p_entity_type?: string
          p_event_type: string
          p_metadata?: Json
          p_severity?: string
          p_user_id: string
        }
        Returns: string
      }
      unread_message_count: { Args: never; Returns: number }
      update_daily_streak: { Args: { p_user_id: string }; Returns: undefined }
      update_topic_followers: {
        Args: { p_increment?: number; p_topic_id: string }
        Returns: undefined
      }
      update_user_location: {
        Args: { p_lat: number; p_lng: number }
        Returns: undefined
      }
      upload_media: {
        Args: {
          p_bucket?: string
          p_file_name: string
          p_file_path: string
          p_media_type: string
          p_user_id: string
        }
        Returns: Json
      }
      validate_embed_url: {
        Args: { p_url: string; p_user_id: string }
        Returns: Json
      }
      vote_on_poll_option: {
        Args: { p_option_id: string; p_post_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
