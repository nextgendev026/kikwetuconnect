-- ============================================================
-- CORRECTIVE: 20260731140000 revoked anon/authenticated EXECUTE
-- but PostgreSQL grants EXECUTE to PUBLIC by default, so anon
-- could STILL call wallet/counter/admin RPCs via PUBLIC.
-- 1. Revoke EXECUTE from PUBLIC on every public function.
-- 2. Re-assert the role-specific grants (anon/authenticated/
--    service_role) and add the two authenticated functions that
--    were missed (get_personalized_feed, update_topic_followers).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Remove the PUBLIC default EXECUTE on all public functions
-- ------------------------------------------------------------
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- ------------------------------------------------------------
-- 2. Harden update_topic_followers: require an authenticated
--    caller (auth.uid() not null). Counter updates stay tied to
--    the caller; the topic/follow route inserts/deletes the
--    user_topics row through RLS before calling this.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_topic_followers(
  p_topic_id uuid,
  p_increment integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (select auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_increment NOT IN (-1, 1) THEN
    RAISE EXCEPTION 'Increment must be -1 or 1';
  END IF;

  UPDATE public.topics
  SET follower_count = GREATEST(COALESCE(follower_count, 0) + p_increment, 0)
  WHERE id = p_topic_id;
END;
$$;

-- ------------------------------------------------------------
-- 3. Re-grant role-specific EXECUTE (idempotent) on the full
--    authenticated allowlist, now including get_personalized_feed
--    and update_topic_followers.
-- ------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
           FROM pg_proc p
           WHERE p.pronamespace = 'public'::regnamespace
             AND p.proname IN (
               -- auth-state / messaging
               'unread_message_count', 'mark_conversation_read', 'send_message',
               'create_conversation',
               -- marketplace
               'create_order', 'cancel_order',
               -- reads / own-actions / feed
               'get_barazas', 'get_post_by_id', 'toggle_save',
               'update_user_location', 'get_personalized_feed',
               'update_topic_followers',
               -- nyumba
               'check_alert_rate_limit', 'report_alert_audited',
               'create_nyumba_alert', 'create_nyumba_group_audited',
               'moderate_alert_audited', 'hide_alert_audited',
               -- admin
               'get_admin_stats', 'admin_suspend_user', 'admin_reinstate_user',
               'admin_moderate_item', 'admin_bulk_moderate', 'admin_log_activity',
               -- translations
               'insert_translation'
             )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated',
                   'public', r.proname, r.args);
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 4. Anonymous: ONLY the safe SECURITY DEFINER post reader.
-- ------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.get_post_by_id(uuid) TO anon;

-- ------------------------------------------------------------
-- 5. Server-only (service_role) functions: wallet, payments,
--    notifications, Heshima, follower counters.
-- ------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
           FROM pg_proc p
           WHERE p.pronamespace = 'public'::regnamespace
             AND p.proname IN (
               'complete_wallet_topup', 'fail_wallet_topup',
               'confirm_order_payment',
               'create_notification',
               'increment_follower_count', 'decrement_follower_count',
               'increment_following_count', 'decrement_following_count',
               'grant_heshima', 'spend_heshima'
             )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role',
                   'public', r.proname, r.args);
  END LOOP;
END $$;

notify pgrst, 'reload schema';
