-- ============================================================
-- COMPREHENSIVE ERROR FIX: Postgres, PI Gateway, Storage, Auth
-- ============================================================

-- ============================================================
-- PART 1: GRANT EXECUTE on all RPC functions called from
-- API routes (anon key) and client-side (anon key).
-- Each GRANT targets the specific function signature used.
-- ============================================================

-- API route: src/app/api/conversations/route.ts
GRANT EXECUTE ON FUNCTION public.create_conversation TO authenticated, anon;

-- API route: src/app/api/messages/route.ts
GRANT EXECUTE ON FUNCTION public.send_message TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read TO authenticated, anon;

-- API route: src/app/api/barazas/route.ts
GRANT EXECUTE ON FUNCTION public.get_barazas TO authenticated, anon;

-- API route: src/app/api/feed/recommended/route.ts
GRANT EXECUTE ON FUNCTION public.get_personalized_feed TO authenticated, anon;

-- API route: src/app/api/translate/route.ts
GRANT EXECUTE ON FUNCTION public.insert_translation TO authenticated, anon;

-- API route: src/app/api/payments/webhook/route.ts
GRANT EXECUTE ON FUNCTION public.confirm_order_payment TO authenticated, anon;

-- API route: src/app/api/saves/route.ts
GRANT EXECUTE ON FUNCTION public.toggle_save TO authenticated, anon;

-- API route: src/app/api/orders/route.ts
GRANT EXECUTE ON FUNCTION public.create_order TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.cancel_order TO authenticated, anon;

-- Client-side: AppShell, MobileNav
GRANT EXECUTE ON FUNCTION public.unread_message_count TO authenticated, anon;

-- Client-side: admin/moderation
GRANT EXECUTE ON FUNCTION public.admin_moderate_item TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.admin_bulk_moderate TO authenticated, anon;

-- Client-side: nyumba
GRANT EXECUTE ON FUNCTION public.check_alert_rate_limit TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.report_alert_audited TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.create_nyumba_group_audited TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.moderate_alert_audited TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.hide_alert_audited TO authenticated, anon;

-- Client-side: providers.tsx
GRANT EXECUTE ON FUNCTION public.admin_log_activity TO authenticated, anon;

-- Media/upload functions
GRANT EXECUTE ON FUNCTION public.create_post_with_media TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.upload_media TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.generate_video_thumbnail TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_signed_upload_url TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.finalize_upload TO authenticated, anon;

-- Follow RPCs (need anon for unauthenticated fallback)
GRANT EXECUTE ON FUNCTION public.increment_follower_count TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.decrement_follower_count TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.increment_following_count TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.decrement_following_count TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.create_notification TO authenticated, anon;

-- Heshima RPCs
GRANT EXECUTE ON FUNCTION public.grant_heshima TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.spend_heshima TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_heshima_balance TO authenticated, anon;

-- Nyumba alert RPC
GRANT EXECUTE ON FUNCTION public.create_nyumba_alert TO authenticated, anon;

-- ============================================================
-- PART 2: Fix notifications table schema.
-- The schema.sql defines `content text not null`, but newer
-- functions insert using `title`/`body`/`data` columns instead
-- of `content`. Make `content` nullable to prevent NOT NULL
-- constraint violations on all notification inserts.
-- ============================================================

ALTER TABLE public.notifications ALTER COLUMN content DROP NOT NULL;

-- Also ensure all notification-related columns exist
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS data jsonb DEFAULT '{}'::jsonb;

-- ============================================================
-- PART 3: Create missing function `update_topic_followers`
-- Called by src/app/api/topics/follow/route.ts with params:
--   topic_id (uuid), increment (integer)
-- ============================================================
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
  UPDATE public.topics
  SET follower_count = GREATEST(COALESCE(follower_count, 0) + p_increment, 0)
  WHERE id = p_topic_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_topic_followers TO authenticated, anon;

-- ============================================================
-- PART 3: Fix `grant_heshima` — remove non-existent sequence
-- `heshima_earnings` uses `id uuid DEFAULT gen_random_uuid()`
-- so no `heshima_earnings_id_seq` exists.
-- Use RETURNING clause instead of currval().
-- ============================================================
CREATE OR REPLACE FUNCTION public.grant_heshima(
  p_user_id uuid,
  p_amount integer,
  p_source_type text,
  p_source_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id uuid;
  v_new_balance integer;
  v_result jsonb;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  INSERT INTO public.heshima_earnings (user_id, amount, source_type, source_id, description)
  VALUES (p_user_id, p_amount, p_source_type, p_source_id, p_description)
  RETURNING id INTO v_new_id;

  UPDATE public.profiles
  SET heshima_points = COALESCE(heshima_points, 0) + p_amount,
      updated_at = now()
  WHERE id = p_user_id
  RETURNING heshima_points INTO v_new_balance;

  SELECT jsonb_build_object(
    'granted', true,
    'amount', p_amount,
    'total_points', v_new_balance,
    'new_earnings_id', v_new_id
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ============================================================
-- PART 4: Fix `create_post_with_media` — wrong column names
-- Table `posts` has `media_url` (singular) and `media_type`
-- (singular), but the function tries `media_urls`, `media_types`.
-- Also, `embed_url` does not exist on posts; only `embed_active`
-- was added. Use individual media_url/media_type params.
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_post_with_media(
  p_user_id uuid,
  p_post_type text,
  p_content text,
  p_title text DEFAULT NULL,
  p_county_tag text DEFAULT NULL,
  p_language text DEFAULT 'en',
  p_media_url text DEFAULT NULL,
  p_media_type text DEFAULT NULL,
  p_bounty_tokens integer DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_id uuid;
BEGIN
  INSERT INTO public.posts (user_id, post_type, content, title, county_tag, language, media_url, media_type, bounty_tokens)
  VALUES (p_user_id, p_post_type, p_content, p_title, p_county_tag, p_language, p_media_url, p_media_type, p_bounty_tokens)
  RETURNING id INTO v_post_id;

  RETURN json_build_object(
    'success', true,
    'post_id', v_post_id,
    'message', 'Post created successfully'
  );
END;
$$;

-- ============================================================
-- PART 5: Fix `upload_media` — replace non-existent
-- `generate_signed_url()` call with path generation
-- ============================================================
CREATE OR REPLACE FUNCTION public.upload_media(
  p_user_id uuid,
  p_file_name text,
  p_file_path text,
  p_media_type text,
  p_bucket text DEFAULT 'public-media'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_public_url text;
BEGIN
  v_public_url := p_bucket || '/' || p_file_path;

  RETURN json_build_object(
    'success', true,
    'signed_url', NULL,
    'public_url', v_public_url,
    'media_type', p_media_type,
    'file_path', p_file_path,
    'note', 'Use client-side upload with signed URL from API'
  );
END;
$$;

-- ============================================================
-- PART 6: Fix `create_nyumba_alert` — wrong column names
-- Table `nyumba_kumi_alerts` has `type`, `approximate_location`,
-- `confirmations` (not `alert_type`, `location`, `confirmations_count`).
-- Also create the two missing tables referenced by this function.
-- ============================================================

-- Create missing table: nyumba_kumi_confirmations
CREATE TABLE IF NOT EXISTS public.nyumba_kumi_confirmations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  alert_id uuid REFERENCES public.nyumba_kumi_alerts(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, alert_id)
);

-- Create missing table: nyumba_kumi_trusted
CREATE TABLE IF NOT EXISTS public.nyumba_kumi_trusted (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  trusted_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, trusted_id),
  CHECK (user_id != trusted_id)
);

-- Fix the create_nyumba_alert function with correct column names
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
  -- Check rate limit
  rate_check := public.check_alert_rate_limit(p_user_id);
  IF NOT (rate_check->>'allowed')::boolean THEN
    RETURN jsonb_build_object('error', rate_check->>'reason');
  END IF;

  -- Insert alert with correct column names
  INSERT INTO public.nyumba_kumi_alerts (user_id, type, title, description, county, approximate_location, severity, confirmations)
  VALUES (p_user_id, p_alert_type, p_title, p_description, p_location, p_location, p_severity, 1)
  RETURNING id INTO alert_id;

  -- Auto-confirm by creator
  INSERT INTO public.nyumba_kumi_confirmations (user_id, alert_id)
  VALUES (p_user_id, alert_id)
  ON CONFLICT DO NOTHING;

  -- Notify all members of groups that match the alert's location
  FOR group_record IN
    SELECT g.id, g.name FROM public.nyumba_kumi_groups g
    WHERE g.county = p_location OR g.county IS NULL
  LOOP
    FOR member_record IN
      SELECT user_id FROM public.nyumba_kumi_group_members
      WHERE group_id = group_record.id AND user_id != p_user_id
    LOOP
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (
        member_record.user_id,
        'nyumba_alert',
        p_title,
        p_description,
        jsonb_build_object(
          'alert_id', alert_id,
          'alert_type', p_alert_type,
          'severity', p_severity,
          'location', p_location,
          'group_name', group_record.name,
          'actor_id', p_user_id
        )
      );
      notification_count := notification_count + 1;
    END LOOP;
  END LOOP;

  -- Also notify trusted neighbours
  FOR member_record IN
    SELECT DISTINCT t.user_id FROM public.nyumba_kumi_trusted t
    JOIN public.profiles p ON p.id = t.user_id
    WHERE t.trusted_id = p_user_id AND t.user_id != p_user_id
      AND (p.county_hub = p_location OR p.county_hub IS NULL)
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      member_record.user_id,
      'nyumba_alert',
      p_title,
      p_description,
      jsonb_build_object(
        'alert_id', alert_id,
        'alert_type', p_alert_type,
        'severity', p_severity,
        'location', p_location,
        'actor_id', p_user_id
      )
    )
    ON CONFLICT DO NOTHING;
    notification_count := notification_count + 1;
  END LOOP;

  -- Log activity
  INSERT INTO public.admin_activity (admin_id, action, target_type, target_id, details)
  VALUES (p_user_id, 'create_nyumba_alert', 'nyumba_kumi_alert', alert_id::text,
    jsonb_build_object(
      'alert_type', p_alert_type,
      'severity', p_severity,
      'location', p_location,
      'title', p_title,
      'notifications_sent', notification_count
    )
  );

  -- Flag suspicious content for moderation
  IF p_severity IN ('high', 'critical') AND
     (SELECT COUNT(*) FROM public.nyumba_kumi_alerts
      WHERE user_id = p_user_id AND created_at > now() - interval '1 hour') >= 2
  THEN
    INSERT INTO public.moderation_queue (target_type, target_id, reporter_id, reason, status)
    VALUES (
      'nyumba_kumi_alert', alert_id, p_user_id,
      'Automated: multiple high-severity alerts in short period',
      'pending'
    );
  END IF;

  RETURN jsonb_build_object('id', alert_id, 'notifications_sent', notification_count);
END;
$$;

-- ============================================================
-- PART 7: Create missing storage bucket `private-guidance`
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('private-guidance', 'private-guidance', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'video/mp4', 'audio/mpeg'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'video/mp4', 'audio/mpeg'];

-- ============================================================
-- PART 8: Add `SET search_path = public` to all SECURITY
-- DEFINER functions that lack it (prevents schema injection)
-- ============================================================

-- From database/schema.sql
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_post_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.topics SET post_count = post_count + 1
    WHERE id IN (SELECT topic_id FROM public.post_topics WHERE post_id = NEW.id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.topics SET post_count = GREATEST(post_count - 1, 0)
    WHERE id IN (SELECT topic_id FROM public.post_topics WHERE post_id = OLD.id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_vote_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_table text;
BEGIN
  v_target_table := CASE NEW.target_type WHEN 'post' THEN 'posts' WHEN 'answer' THEN 'answers' END;

  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 1 THEN
      EXECUTE format('UPDATE public.%I SET upvotes_count = upvotes_count + 1 WHERE id = $1', v_target_table) USING NEW.target_id;
    ELSE
      EXECUTE format('UPDATE public.%I SET downvotes_count = downvotes_count + 1 WHERE id = $1', v_target_table) USING NEW.target_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 1 THEN
      EXECUTE format('UPDATE public.%I SET upvotes_count = GREATEST(upvotes_count - 1, 0) WHERE id = $1', v_target_table) USING OLD.target_id;
    ELSE
      EXECUTE format('UPDATE public.%I SET downvotes_count = GREATEST(downvotes_count - 1, 0) WHERE id = $1', v_target_table) USING OLD.target_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_heshima_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET heshima_rating = (
    SELECT COALESCE(AVG(heshima_rating), 0) FROM public.professionals WHERE user_id = NEW.user_id
  )
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- From 20260729110001 (follow count RPCs)
CREATE OR REPLACE FUNCTION public.increment_follower_count(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles SET follower_count = COALESCE(follower_count, 0) + 1, updated_at = now() WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_following_count(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles SET following_count = COALESCE(following_count, 0) + 1, updated_at = now() WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_follower_count(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles SET follower_count = GREATEST(COALESCE(follower_count, 0) - 1, 0), updated_at = now() WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_following_count(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles SET following_count = GREATEST(COALESCE(following_count, 0) - 1, 0), updated_at = now() WHERE id = p_user_id;
END;
$$;

-- From 20260729120001
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_actor_id uuid DEFAULT NULL,
  p_type text DEFAULT 'system',
  p_target_id uuid DEFAULT NULL,
  p_target_type text DEFAULT NULL,
  p_content text DEFAULT NULL,
  p_meta jsonb DEFAULT '{}'::jsonb,
  p_title text DEFAULT NULL,
  p_body text DEFAULT NULL,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.notifications (user_id, actor_id, type, target_id, target_type, content, meta, title, body, data)
  VALUES (p_user_id, p_actor_id, p_type, p_target_id, p_target_type, p_content, p_meta, p_title, p_body, p_data)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- From 20260729130001 (conversation features)
CREATE OR REPLACE FUNCTION public.toggle_save(p_target_type text, p_target_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_deleted boolean := false;
  v_total integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_target_type NOT IN ('post', 'answer', 'listing') THEN
    RAISE EXCEPTION 'Invalid target type';
  END IF;

  DELETE FROM public.saves
  WHERE user_id = v_user_id AND target_type = p_target_type AND target_id = p_target_id;

  IF FOUND THEN
    v_deleted := true;
  ELSE
    BEGIN
      INSERT INTO public.saves (user_id, target_type, target_id)
      VALUES (v_user_id, p_target_type, p_target_id);
    EXCEPTION WHEN unique_violation THEN
      v_deleted := true;
    END;
  END IF;

  SELECT count(*) INTO v_total
  FROM public.saves
  WHERE target_type = p_target_type AND target_id = p_target_id;

  RETURN jsonb_build_object('saved', NOT v_deleted, 'total', v_total);
END;
$$;

CREATE OR REPLACE FUNCTION public.can_dm(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN false; END IF;
  IF v_user_id = target_user_id THEN RETURN false; END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_conversation(
  p_participant_ids uuid[],
  p_type text DEFAULT 'dm',
  p_title text DEFAULT NULL,
  p_initial_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_conv_id uuid;
  v_participant_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  INSERT INTO public.conversations (type, title, created_by)
  VALUES (p_type, p_title, v_user_id)
  RETURNING id INTO v_conv_id;

  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES (v_conv_id, v_user_id);

  FOREACH v_participant_id IN ARRAY p_participant_ids
  LOOP
    IF v_participant_id != v_user_id THEN
      INSERT INTO public.conversation_participants (conversation_id, user_id)
      VALUES (v_conv_id, v_participant_id);
    END IF;
  END LOOP;

  IF p_initial_message IS NOT NULL THEN
    INSERT INTO public.messages (conversation_id, sender_id, content)
    VALUES (v_conv_id, v_user_id, p_initial_message);
  END IF;

  RETURN jsonb_build_object('conversation_id', v_conv_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.send_message(
  p_conversation_id uuid,
  p_content text,
  p_message_type text DEFAULT 'text',
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_reply_to uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_msg_id uuid;
  v_participant RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = p_conversation_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  INSERT INTO public.messages (conversation_id, sender_id, content, message_type, metadata, reply_to)
  VALUES (p_conversation_id, v_user_id, p_content, p_message_type, p_metadata, p_reply_to)
  RETURNING id INTO v_msg_id;

  UPDATE public.conversations SET last_message_at = now() WHERE id = p_conversation_id;

  FOR v_participant IN
    SELECT user_id FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id != v_user_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (v_participant.user_id, 'message', 'New message', substring(p_content, 1, 100),
      jsonb_build_object('conversation_id', p_conversation_id, 'message_id', v_msg_id, 'sender_id', v_user_id));
  END LOOP;

  RETURN jsonb_build_object('message_id', v_msg_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversation_participants
  SET last_read_at = now()
  WHERE conversation_id = p_conversation_id AND user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.unread_message_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.messages m
  WHERE m.conversation_id IN (
    SELECT cp.conversation_id FROM public.conversation_participants cp WHERE cp.user_id = auth.uid()
  )
  AND m.sender_id != auth.uid()
  AND (m.created_at > COALESCE(
    (SELECT cp.last_read_at FROM public.conversation_participants cp
     WHERE cp.conversation_id = m.conversation_id AND cp.user_id = auth.uid()),
    '1970-01-01'::timestamptz
  ));

  RETURN v_count;
END;
$$;

-- From 20260729140001 (marketplace payments)
CREATE OR REPLACE FUNCTION public.create_order(
  p_listing_id uuid,
  p_quantity integer DEFAULT 1,
  p_delivery_address text DEFAULT '',
  p_contact_phone text DEFAULT '',
  p_delivery_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_listing public.marketplace_listings;
  v_order_id uuid;
  v_total_price numeric(12,2);
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_listing
  FROM public.marketplace_listings
  WHERE id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Listing not found'; END IF;
  IF v_listing.seller_id = v_user_id THEN RAISE EXCEPTION 'Cannot buy your own listing'; END IF;
  IF v_listing.status != 'active' THEN RAISE EXCEPTION 'Listing is not available'; END IF;

  v_total_price := v_listing.price * p_quantity;

  INSERT INTO public.marketplace_orders
    (listing_id, buyer_id, seller_id, quantity, unit_price, total_price,
     delivery_address, contact_phone, delivery_notes, status)
  VALUES
    (p_listing_id, v_user_id, v_listing.seller_id, p_quantity, v_listing.price,
     v_total_price, p_delivery_address, p_contact_phone, p_delivery_notes, 'pending')
  RETURNING id INTO v_order_id;

  IF v_listing.stock_quantity IS NOT NULL THEN
    UPDATE public.marketplace_listings
    SET stock_quantity = stock_quantity - p_quantity
    WHERE id = p_listing_id;
  END IF;

  UPDATE public.marketplace_listings
  SET orders_count = COALESCE(orders_count, 0) + 1
  WHERE id = p_listing_id;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'total_price', v_total_price,
    'seller_id', v_listing.seller_id,
    'listing_title', v_listing.title
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_order_payment(
  p_order_id uuid,
  p_payment_provider text DEFAULT 'mpesa',
  p_payment_reference text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.marketplace_orders;
BEGIN
  SELECT * INTO v_order FROM public.marketplace_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.status != 'pending' THEN RAISE EXCEPTION 'Order is not pending'; END IF;

  UPDATE public.marketplace_orders
  SET status = 'confirmed', payment_provider = p_payment_provider,
      payment_reference = COALESCE(p_payment_reference, payment_reference),
      updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('order_id', p_order_id, 'status', 'confirmed');
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_order public.marketplace_orders;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_order FROM public.marketplace_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.buyer_id != v_user_id AND v_order.seller_id != v_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF v_order.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Cannot cancel order in current status';
  END IF;

  UPDATE public.marketplace_orders
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_order_id;

  UPDATE public.marketplace_listings
  SET stock_quantity = COALESCE(stock_quantity, 0) + v_order.quantity,
      orders_count = GREATEST(COALESCE(orders_count, 0) - 1, 0)
  WHERE id = v_order.listing_id;

  RETURN jsonb_build_object('order_id', p_order_id, 'status', 'cancelled');
END;
$$;

-- From 20260729150001 (media bucket)
CREATE OR REPLACE FUNCTION public.get_signed_upload_url(
  p_folder text DEFAULT 'uploads',
  p_content_type text DEFAULT 'image/jpeg'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_file_name text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  v_file_name := p_folder || '/' || v_user_id || '/' ||
                 to_char(now(), 'YYYYMMDDHH24MISS') || '-' ||
                 substr(md5(random()::text), 1, 8) || '.' ||
                 CASE p_content_type
                   WHEN 'image/jpeg' THEN 'jpg'
                   WHEN 'image/png' THEN 'png'
                   WHEN 'image/gif' THEN 'gif'
                   WHEN 'image/webp' THEN 'webp'
                   ELSE 'bin'
                 END;

  RETURN jsonb_build_object('path', v_file_name);
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_upload(
  p_path text,
  p_make_public boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  RETURN jsonb_build_object('path', p_path, 'public', p_make_public);
END;
$$;

-- From 20260729170001 (nyumba groups)
CREATE OR REPLACE FUNCTION public.check_alert_rate_limit(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
  cooldown_seconds integer := 900;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.nyumba_kumi_alerts
  WHERE user_id = p_user_id
    AND created_at > now() - make_interval(secs => cooldown_seconds);

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

CREATE OR REPLACE FUNCTION public.update_group_member_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.nyumba_kumi_groups SET member_count = member_count + 1 WHERE id = NEW.group_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.nyumba_kumi_groups SET member_count = greatest(member_count - 1, 0) WHERE id = OLD.group_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- From 20260729190001 (heshima notifications)
CREATE OR REPLACE FUNCTION public.notify_on_heshima_earnings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    NEW.user_id,
    'heshima_earned',
    'Heshima Points Earned',
    CASE WHEN NEW.amount > 0
      THEN 'You earned ' || NEW.amount || ' Heshima points!'
      ELSE 'You spent ' || ABS(NEW.amount) || ' Heshima points'
    END,
    jsonb_build_object('amount', NEW.amount, 'source_type', NEW.source_type, 'source_id', NEW.source_id, 'earning_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_badge_awarded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_badge_name text;
BEGIN
  SELECT name INTO v_badge_name FROM public.badges WHERE id = NEW.badge_id;
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    NEW.user_id,
    'badge_awarded',
    'Badge Unlocked: ' || v_badge_name,
    'Congratulations! You earned the ' || v_badge_name || ' badge!',
    jsonb_build_object('badge_id', NEW.badge_id, 'badge_name', v_badge_name, 'user_badge_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

-- From 20260729060001 (heshima update)
CREATE OR REPLACE FUNCTION public.update_heshima_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET heshima_rating = (
    SELECT COALESCE(SUM(amount), 0) FROM public.heshima_earnings WHERE user_id = NEW.user_id
  )
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- From 20260729100001 (pages)
CREATE OR REPLACE FUNCTION public.update_page_followers_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.pages SET follower_count = COALESCE(follower_count, 0) + 1 WHERE id = NEW.page_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.pages SET follower_count = GREATEST(COALESCE(follower_count, 0) - 1, 0) WHERE id = OLD.page_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_page_posts_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.pages SET post_count = COALESCE(post_count, 0) + 1 WHERE id = NEW.page_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.pages SET post_count = GREATEST(COALESCE(post_count, 0) - 1, 0) WHERE id = OLD.page_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- From 20260729090001 (spaces)
CREATE OR REPLACE FUNCTION public.update_space_member_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.spaces SET member_count = COALESCE(member_count, 0) + 1 WHERE id = NEW.space_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.spaces SET member_count = GREATEST(COALESCE(member_count, 0) - 1, 0) WHERE id = OLD.space_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_space_post_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.spaces SET post_count = COALESCE(post_count, 0) + 1 WHERE id = NEW.space_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.spaces SET post_count = GREATEST(COALESCE(post_count, 0) - 1, 0) WHERE id = OLD.space_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- From 20260729080001 (session lifecycle)
CREATE OR REPLACE FUNCTION public.handle_session_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IN ('active', 'in_progress') AND NEW.status = 'completed' THEN
    UPDATE public.professionals
    SET session_count = COALESCE(session_count, 0) + 1
    WHERE user_id = NEW.professional_id;

    INSERT INTO public.heshima_earnings (user_id, amount, source_type, source_id, description, balance_after)
    VALUES (
      NEW.student_id, 25, 'session_completion', NEW.id,
      'Completed session: ' || COALESCE(NEW.topic, 'Mentoring session'),
      (SELECT COALESCE(heshima_balance, 0) + 25 FROM public.profiles WHERE id = NEW.student_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- PART 9: Fix `get_personalized_feed` return type so the
-- column names `bounty` and `comments_count` are selectable
-- by PostgREST.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_personalized_feed(
  p_user_id uuid,
  p_limit int DEFAULT 30,
  p_offset int DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  title text,
  content text,
  post_type text,
  media_url text,
  media_type text,
  bounty int,
  county_tag text,
  created_at timestamptz,
  upvotes_count int,
  downvotes_count int,
  comments_count int,
  author_id uuid,
  author_name text,
  author_username text,
  author_avatar text,
  author_heshima int
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.title,
    p.content,
    p.post_type,
    p.media_url,
    p.media_type,
    p.bounty_tokens,
    p.county_tag,
    p.created_at,
    p.upvotes_count,
    p.downvotes_count,
    p.answers_count,
    pr.id AS author_id,
    pr.full_name AS author_name,
    pr.username AS author_username,
    pr.avatar_url AS author_avatar,
    pr.heshima_rating AS author_heshima
  FROM public.posts p
  LEFT JOIN public.profiles pr ON pr.id = p.user_id
  WHERE (p.is_pinned = false OR p.is_pinned IS NULL)
  ORDER BY p.created_at DESC, p.upvotes_count DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ============================================================
-- PART 10: Add missing indexes for auth query performance
-- and notifications to reduce PI Gateway warnings
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conv ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON auth.users(email);

-- ============================================================
-- PART 11: Enable realtime for key tables that might be missing
-- from the publication (reduces Realtime warnings)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'posts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE posts;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'nyumba_kumi_alerts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE nyumba_kumi_alerts;
  END IF;
END $$;

-- ============================================================
-- PART 12: Ensure the `public-media` bucket exists
-- (previously only `media` bucket was created; `public-media`
-- is referenced throughout the codebase)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('public-media', 'public-media', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
