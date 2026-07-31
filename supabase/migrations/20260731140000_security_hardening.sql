-- ============================================================
-- SECURITY HARDENING v2
-- Fixes account fusing/leakage vectors:
--   1. Revoke the blanket function grant (anon/authenticated could
--      EXECUTE every public function, incl. SECURITY DEFINER admin,
--      payment and Heshima RPCs that trusted caller-supplied user ids).
--   2. Harden SECURITY DEFINER RPCs so identity ALWAYS comes from
--      auth.uid(), never from a client-passed parameter.
--   3. Restrict wallet top-up / order-confirm / notification /
--      count / Heshima functions to service_role (server-only).
--   4. Fix notifications: no more "user_id IS NULL" broadcasts that
--      every member could read; moderation notices go to admins only.
--   5. Enforce profiles.visibility (public / followers) via RLS.
--   6. Tighten follows/likes insert/update policies (no impersonation).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Revoke blanket EXECUTE on all public functions
-- ------------------------------------------------------------
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

-- ------------------------------------------------------------
-- 2. is_admin() helper (SECURITY DEFINER so policies don't recurse)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (select auth.uid()) AND role = 'admin'
  );
$$;

-- ------------------------------------------------------------
-- 3. Re-grant EXECUTE ONLY on the explicit allowlist to authenticated.
--    Every function here derives the actor from auth.uid() internally
--    or is a safe read.
-- ------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
           FROM pg_proc p
           WHERE p.pronamespace = 'public'::regnamespace
             AND p.proname IN (
               -- auth-state / messaging (actor = auth.uid())
               'unread_message_count', 'mark_conversation_read', 'send_message',
               'create_conversation',
               -- marketplace (actor = auth.uid())
               'create_order', 'cancel_order',
               -- reads / own-actions
               'get_barazas', 'get_post_by_id', 'toggle_save',
               'update_user_location',
               -- nyumba (actor = auth.uid(), admin checks inside)
               'check_alert_rate_limit', 'report_alert_audited',
               'create_nyumba_alert', 'create_nyumba_group_audited',
               'moderate_alert_audited', 'hide_alert_audited',
               -- admin (identity from auth.uid())
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
-- 3b. Anonymous read access for shared posts: only the safe
--     SECURITY DEFINER post reader is exposed to anon. It returns
--     just the post + author name/username (no phone/location).
-- ------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.get_post_by_id(uuid) TO anon;

-- ------------------------------------------------------------
-- 4. Server-only (service_role) functions: wallet, payments,
--    notifications, Heshima, follower counters.
--    The webhook/API routes call these with the service role key.
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

-- ------------------------------------------------------------
-- 5. Harden admin RPCs: never trust p_admin_id, always auth.uid()
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_suspend_user(p_admin_id uuid, p_user_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can suspend users';
  END IF;

  UPDATE profiles SET suspended = true, updated_at = now() WHERE id = p_user_id;

  INSERT INTO admin_activity (admin_id, action, target_type, target_id, details, created_at)
  VALUES ((select auth.uid()), 'suspend_user', 'profile', p_user_id::text, jsonb_build_object('reason', p_reason), now());

  INSERT INTO notifications (user_id, type, title, body, data, created_at)
  VALUES (p_user_id, 'account_suspended', 'Account suspended', p_reason, jsonb_build_object('by', (select auth.uid())), now());
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reinstate_user(p_admin_id uuid, p_user_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can reinstate users';
  END IF;

  UPDATE profiles SET suspended = false, updated_at = now() WHERE id = p_user_id;

  INSERT INTO admin_activity (admin_id, action, target_type, target_id, details, created_at)
  VALUES ((select auth.uid()), 'reinstate_user', 'profile', p_user_id::text, jsonb_build_object('reason', p_reason), now());

  INSERT INTO notifications (user_id, type, title, body, data, created_at)
  VALUES (p_user_id, 'account_reinstated', 'Account reinstated', p_reason, jsonb_build_object('by', (select auth.uid())), now());
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_moderate_item(p_admin_id uuid, p_item_id uuid, p_status text, p_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can moderate items';
  END IF;

  IF p_status NOT IN ('dismissed', 'action_taken', 'reviewed') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;

  UPDATE moderation_queue
  SET status = p_status, reviewed_by = (select auth.uid()), notes = COALESCE(p_notes, notes), reviewed_at = now()
  WHERE id = p_item_id;

  INSERT INTO admin_activity (admin_id, action, target_type, target_id, details, created_at)
  VALUES ((select auth.uid()), 'moderate_' || p_status, 'moderation_queue', p_item_id::text, jsonb_build_object('notes', p_notes), now());
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_bulk_moderate(p_admin_id uuid, p_item_ids uuid[], p_status text, p_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can moderate items';
  END IF;

  FOREACH item_id IN ARRAY p_item_ids
  LOOP
    PERFORM admin_moderate_item((select auth.uid()), item_id, p_status, p_notes);
  END LOOP;
END;
$$;

-- ------------------------------------------------------------
-- 6. Harden admin stats: only admins may read aggregates
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'users', (SELECT count(*) FROM public.profiles),
    'posts', (SELECT count(*) FROM public.posts),
    'spaces', (SELECT count(*) FROM public.spaces),
    'reports', (SELECT count(*) FROM public.moderation_queue WHERE status = 'pending'),
    'quizzes', (SELECT count(*) FROM public.quizzes),
    'listings', (SELECT count(*) FROM public.marketplace_listings),
    'topics', (SELECT count(*) FROM public.topics),
    'quiz_taken', (SELECT count(*) FROM public.quiz_results),
    'online_now', (SELECT count(*) FROM public.profiles WHERE is_online = true)
  ) INTO v_result;
  RETURN v_result;
END;
$$;

-- ------------------------------------------------------------
-- 7. Harden nyumba + feed RPCs: actor from auth.uid()
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_alert_rate_limit(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
  cooldown_seconds integer := 900;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM nyumba_kumi_alerts
  WHERE user_id = (select auth.uid())
    AND created_at > now() - (cooldown_seconds || ' seconds')::interval;

  IF recent_count >= 3 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Rate limit exceeded. Maximum 3 alerts per 15 minutes.',
      'retry_after_seconds', cooldown_seconds
    );
  END IF;

  RETURN jsonb_build_object('allowed', true, 'recent_count', recent_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_nyumba_alert(
  p_user_id uuid,
  p_alert_type text,
  p_title text,
  p_description text,
  p_location text,
  p_severity text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alert_id uuid;
  group_record RECORD;
  member_record RECORD;
  notification_count integer := 0;
  rate_check jsonb;
BEGIN
  rate_check := public.check_alert_rate_limit((select auth.uid()));
  IF NOT (rate_check->>'allowed')::boolean THEN
    RETURN jsonb_build_object('error', rate_check->>'reason');
  END IF;

  INSERT INTO public.nyumba_kumi_alerts (user_id, type, title, description, county, approximate_location, severity, confirmations)
  VALUES ((select auth.uid()), p_alert_type, p_title, p_description, p_location, p_location, p_severity, 1)
  RETURNING id INTO alert_id;

  INSERT INTO public.nyumba_kumi_confirmations (user_id, alert_id)
  VALUES ((select auth.uid()), alert_id)
  ON CONFLICT DO NOTHING;

  FOR group_record IN
    SELECT g.id, g.name FROM public.nyumba_kumi_groups g
    WHERE g.county = p_location OR g.county IS NULL
  LOOP
    FOR member_record IN
      SELECT user_id FROM public.nyumba_kumi_group_members
      WHERE group_id = group_record.id AND user_id != (select auth.uid())
    LOOP
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (member_record.user_id, 'nyumba_alert', p_title, p_description,
        jsonb_build_object('alert_id', alert_id, 'alert_type', p_alert_type,
          'severity', p_severity, 'location', p_location,
          'group_name', group_record.name, 'actor_id', (select auth.uid())));
      notification_count := notification_count + 1;
    END LOOP;
  END LOOP;

  FOR member_record IN
    SELECT DISTINCT t.user_id FROM public.nyumba_kumi_trusted t
    JOIN public.profiles p ON p.id = t.user_id
    WHERE t.trusted_id = (select auth.uid()) AND t.user_id != (select auth.uid())
      AND (p.county_hub = p_location OR p.county_hub IS NULL)
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (member_record.user_id, 'nyumba_alert', p_title, p_description,
      jsonb_build_object('alert_id', alert_id, 'alert_type', p_alert_type,
        'severity', p_severity, 'location', p_location, 'actor_id', (select auth.uid())))
    ON CONFLICT DO NOTHING;
    notification_count := notification_count + 1;
  END LOOP;

  INSERT INTO public.admin_activity (admin_id, action, target_type, target_id, details)
  VALUES ((select auth.uid()), 'create_nyumba_alert', 'nyumba_kumi_alert', alert_id::text,
    jsonb_build_object('alert_type', p_alert_type, 'severity', p_severity,
      'location', p_location, 'title', p_title,
      'notifications_sent', notification_count));

  IF p_severity IN ('high', 'critical') AND
     (SELECT COUNT(*) FROM public.nyumba_kumi_alerts
      WHERE user_id = (select auth.uid()) AND created_at > now() - interval '1 hour') >= 2
  THEN
    INSERT INTO public.moderation_queue (target_type, target_id, reporter_id, reason, status)
    VALUES ('nyumba_kumi_alert', alert_id, (select auth.uid()),
      'Automated: multiple high-severity alerts in short period', 'pending');
  END IF;

  RETURN jsonb_build_object('id', alert_id, 'notifications_sent', notification_count);
END;
$$;

-- Return type differs from the version created by
-- 20260730140001_fix_feed_rpc_and_storage.sql, so drop it first.
DROP FUNCTION IF EXISTS public.get_personalized_feed(uuid, integer, integer);
CREATE OR REPLACE FUNCTION public.get_personalized_feed(
  p_user_id uuid,
  p_limit integer default 30,
  p_offset integer default 0
) returns table (
  id uuid,
  post_type text,
  title text,
  content text,
  media_url text,
  county_tag text,
  bounty_tokens integer,
  upvotes_count integer,
  answers_count integer,
  created_at timestamptz,
  author_id uuid,
  author_name text,
  author_username text,
  author_avatar text,
  author_heshima integer,
  relevance_score bigint
) as $$
declare
  user_county text;
  user_following_ids uuid[];
  v_user_id uuid;
begin
  -- Actor identity ALWAYS comes from the session, never the parameter.
  v_user_id := (select auth.uid());

  -- Get user's county
  select county_hub into user_county from public.profiles where id = v_user_id;

  -- Get followed user IDs
  select array_agg(following_id) into user_following_ids
  from public.follows where follower_id = v_user_id;

  return query
  select
    p.id,
    p.post_type,
    p.title,
    p.content,
    p.media_url,
    p.county_tag,
    p.bounty_tokens,
    p.upvotes_count,
    p.answers_count,
    p.created_at,
    pr.id as author_id,
    pr.full_name as author_name,
    pr.username as author_username,
    pr.avatar_url as author_avatar,
    pr.heshima_rating as author_heshima,
    (
      -- Interest match score (up to 40 points)
      coalesce(
        (select count(*)::integer from unnest(pr.interests) i
         where i in (select topic_id::text from public.post_topics where post_id = p.id)),
        0
      ) * 10 +
      -- County match (30 points if same county)
      case when p.county_tag = user_county then 30 else 0 end +
      -- Following bonus (25 points if from followed user)
      case when p.user_id = any(user_following_ids) then 25 else 0 end +
      -- Engagement score (up to 20 points based on upvotes)
      least(p.upvotes_count, 20) +
      -- Heshima bonus (up to 10 points from author reputation)
      least(pr.heshima_rating / 10, 10) +
      -- Recency bonus (up to 10 points for recent posts)
      case when p.created_at > now() - interval '24 hours' then 10
           when p.created_at > now() - interval '7 days' then 5
           else 0 end
    )::bigint as relevance_score
  from public.posts p
  join public.profiles pr on pr.id = p.user_id
  where p.created_at > now() - interval '90 days'
  order by relevance_score desc, p.created_at desc
  limit p_limit
  offset p_offset;
end;
$$ language plpgsql stable;

-- ------------------------------------------------------------
-- 8. Wallet top-up hardening: service_role only, use the stored
--    amount (never the caller-supplied amount) so nobody can
--    credit a wallet for an arbitrary amount.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_wallet_topup(
  p_checkout_request_id text,
  p_mpesa_reference text,
  p_amount numeric default null
) returns jsonb language plpgsql security definer as $$
declare
  v_topup public.wallet_topups;
begin
  select * into v_topup from public.wallet_topups
  where checkout_request_id = p_checkout_request_id
  for update;

  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_topup.status = 'completed' then return jsonb_build_object('ok', false, 'reason', 'already_completed'); end if;

  update public.wallet_topups
  set status = 'completed', mpesa_reference = p_mpesa_reference, completed_at = now()
  where id = v_topup.id;

  insert into public.tokens (user_id, amount, type, reference)
  values (v_topup.user_id, v_topup.amount, 'topup', p_mpesa_reference);

  return jsonb_build_object('ok', true, 'user_id', v_topup.user_id, 'amount', v_topup.amount);
end;
$$;

-- ------------------------------------------------------------
-- 9. Notifications: no more public broadcasts (user_id IS NULL).
--    Moderation notices are inserted per admin instead.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_admins_of_moderation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, body, data, created_at)
  SELECT id, 'moderation_request', 'New moderation item', NEW.reason,
         jsonb_build_object('id', NEW.id, 'target_type', NEW.target_type, 'target_id', NEW.target_id),
         now()
  FROM public.profiles
  WHERE role = 'admin';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_moderation_notify ON moderation_queue;
CREATE TRIGGER tr_moderation_notify
  AFTER INSERT ON moderation_queue
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_of_moderation();

DROP POLICY IF EXISTS notifications_read_own ON notifications;
DROP POLICY IF EXISTS notifications_insert_server ON notifications;
CREATE POLICY notifications_read_own ON notifications
  FOR SELECT USING (
    (select auth.uid()) = user_id
    OR public.is_admin()
  );
CREATE POLICY notifications_insert_own ON notifications
  FOR INSERT WITH CHECK (
    user_id = (select auth.uid())
    OR public.is_admin()
  );

-- ------------------------------------------------------------
-- 10. Follows: only own relationships can be created/deleted,
--     only own relationships (outgoing or incoming) are readable.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS follows_read_all ON public.follows;
DROP POLICY IF EXISTS follows_insert_all ON public.follows;
DROP POLICY IF EXISTS follows_delete_all ON public.follows;
CREATE POLICY follows_read_own ON public.follows
  FOR SELECT USING (
    follower_id = (select auth.uid())
    OR following_id = (select auth.uid())
    OR public.is_admin()
  );
CREATE POLICY follows_insert_own ON public.follows
  FOR INSERT WITH CHECK (
    follower_id = (select auth.uid())
  );
CREATE POLICY follows_delete_own ON public.follows
  FOR DELETE USING (
    follower_id = (select auth.uid())
  );

-- ------------------------------------------------------------
-- 11. Votes: only own votes can be created/deleted/updated.
-- ------------------------------------------------------------
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS votes_read_all ON public.votes;
DROP POLICY IF EXISTS votes_insert_all ON public.votes;
DROP POLICY IF EXISTS votes_delete_all ON public.votes;
CREATE POLICY votes_read_public ON public.votes
  FOR SELECT USING (true);
CREATE POLICY votes_insert_own ON public.votes
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY votes_update_own ON public.votes
  FOR UPDATE USING (user_id = (select auth.uid()));
CREATE POLICY votes_delete_own ON public.votes
  FOR DELETE USING (user_id = (select auth.uid()));

-- Likes (chat/market features): own likes only
DROP POLICY IF EXISTS likes_read_all ON public.likes;
DROP POLICY IF EXISTS likes_insert_all ON public.likes;
DROP POLICY IF EXISTS likes_delete_all ON public.likes;
CREATE POLICY likes_read_public ON public.likes
  FOR SELECT USING (true);
CREATE POLICY likes_insert_own ON public.likes
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY likes_delete_own ON public.likes
  FOR DELETE USING (user_id = (select auth.uid()));

-- ------------------------------------------------------------
-- 12. Profiles: enforce visibility (public / followers) and keep
--     the owner + admins always able to read. Anonymous visitors
--     can only read public profiles (used for shared post reads).
-- ------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users or admins can update profiles" ON public.profiles;

CREATE POLICY profiles_select ON public.profiles
  FOR SELECT USING (
    (select auth.uid()) = id
    OR visibility = 'public'
    OR (
      visibility = 'followers'
      AND EXISTS (
        SELECT 1 FROM public.follows
        WHERE follower_id = (select auth.uid())
          AND following_id = profiles.id
      )
    )
    OR public.is_admin()
  );
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT WITH CHECK ((select auth.uid()) = id);
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING ((select auth.uid()) = id OR public.is_admin())
  WITH CHECK ((select auth.uid()) = id OR public.is_admin());

notify pgrst, 'reload schema';
