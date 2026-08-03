-- ============================================================
-- Migration: 20260803040000_database_hardening
-- NOTE: Rewritten 2026-08-03. The original draft was never
-- applied (not present in remote schema_migrations) and had
-- become superseded/broken: every RPC and RLS policy it defined
-- now exists remotely via later migrations with newer signatures,
-- and it referenced the now-removed `stories` tables plus a
-- nonexistent `activity_log` table. It has been reduced to the
-- changes that are still genuinely missing from the live schema:
-- making tips.session_id nullable and adding performance indexes.
-- ============================================================

-- ====== 1. FIX: tips.session_id nullable for marketplace payments ======
ALTER TABLE public.tips ALTER COLUMN session_id DROP NOT NULL;

-- ====== 2. ADD: Missing performance indexes ======
-- Marketplace order lookups
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_buyer
  ON public.marketplace_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_seller
  ON public.marketplace_orders(seller_id);

-- Wallet top-up webhook lookups
CREATE INDEX IF NOT EXISTS idx_wallet_topups_checkout
  ON public.wallet_topups(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_wallet_topups_account_ref
  ON public.wallet_topups(account_reference);

-- Push subscription lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_endpoint
  ON public.push_subscriptions(user_id, endpoint);

-- Post query patterns
CREATE INDEX IF NOT EXISTS idx_posts_category
  ON public.posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_user_created
  ON public.posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_type_created
  ON public.posts(post_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_hidden_created
  ON public.posts(is_hidden, created_at DESC);

-- Quiz progress lookups
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_quiz
  ON public.quiz_results(user_id, quiz_id);

-- Heshima earnings history
CREATE INDEX IF NOT EXISTS idx_heshima_earnings_user_source
  ON public.heshima_earnings(user_id, source_type);

-- Student sessions
CREATE INDEX IF NOT EXISTS idx_student_sessions_expert_status
  ON public.student_sessions(expert_id, status);

-- Follow requests
CREATE INDEX IF NOT EXISTS idx_follow_requests_target
  ON public.follow_requests(target_id, status);
