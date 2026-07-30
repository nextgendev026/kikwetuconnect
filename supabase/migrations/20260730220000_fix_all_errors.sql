-- ============================================================
-- COMPREHENSIVE ERROR FIX: Postgres, PI Gateway, Storage, Auth
-- ============================================================

-- ============================================================
-- PART 1: GRANT EXECUTE on all public RPC functions
-- Uses DO block to handle overloaded functions with defaults
-- ============================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT oid, proname,
                  pg_get_function_identity_arguments(oid) as args
           FROM pg_proc
           WHERE pronamespace = 'public'::regnamespace
             AND proname NOT LIKE 'pg_%'
             AND proname NOT IN ('crypto', 'extensions')
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated, anon',
                   'public', r.proname, r.args);
  END LOOP;
END $$;

-- ============================================================
-- PART 2: Add SET search_path = public to ALL SECURITY DEFINER
-- functions (prevents schema injection / resolution errors)
-- ============================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT oid, proname, pronamespace,
                  pg_get_function_identity_arguments(oid) as args
           FROM pg_proc p
           WHERE p.prosecdef  -- SECURITY DEFINER
             AND p.pronamespace = 'public'::regnamespace
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public',
                     'public', r.proname, r.args);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not ALTER FUNCTION %(%): %', r.proname, r.args, SQLERRM;
    END;
  END LOOP;
END $$;

-- ============================================================
-- PART 3: Fix notifications table — content is NOT NULL but
-- newer functions use title/body/data without content.
-- ============================================================
ALTER TABLE public.notifications ALTER COLUMN content DROP NOT NULL;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS data jsonb DEFAULT '{}'::jsonb;

-- ============================================================
-- PART 4: Fix `create_notification` — support both old
-- (content/meta) and new (title/body/data) callers.
-- Also fix parameter names to match the API caller.
-- DROP + CREATE because parameter names changed.
-- ============================================================
DROP FUNCTION IF EXISTS public.create_notification;

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

-- ============================================================
-- PART 5: Fix `grant_heshima` — remove non-existent sequence
-- `heshima_earnings` uses UUID gen_random_uuid(), not serial.
-- ============================================================
DROP FUNCTION IF EXISTS public.grant_heshima;

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

  RETURN jsonb_build_object(
    'granted', true,
    'amount', p_amount,
    'total_points', v_new_balance,
    'new_earnings_id', v_new_id
  );
END;
$$;

-- ============================================================
-- PART 6: Fix `create_post_with_media` — wrong column names.
-- Original used media_urls/media_types (plural) and embed_url.
-- Table has media_url/media_type (singular), no embed_url.
-- ============================================================
DROP FUNCTION IF EXISTS public.create_post_with_media;

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
-- PART 7: Fix `upload_media` — removes call to non-existent
-- `generate_signed_url()` function. Returns path for
-- client-side signed URL generation.
-- ============================================================
DROP FUNCTION IF EXISTS public.upload_media;

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
-- PART 8: Fix `create_nyumba_alert` — wrong column names.
-- Table: type (not alert_type), approximate_location (not location),
-- confirmations (not confirmations_count).
-- Also create two missing tables.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.nyumba_kumi_confirmations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  alert_id uuid REFERENCES public.nyumba_kumi_alerts(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, alert_id)
);

CREATE TABLE IF NOT EXISTS public.nyumba_kumi_trusted (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  trusted_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, trusted_id),
  CHECK (user_id != trusted_id)
);

DROP FUNCTION IF EXISTS public.create_nyumba_alert;

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
  rate_check := public.check_alert_rate_limit(p_user_id);
  IF NOT (rate_check->>'allowed')::boolean THEN
    RETURN jsonb_build_object('error', rate_check->>'reason');
  END IF;

  INSERT INTO public.nyumba_kumi_alerts (user_id, type, title, description, county, approximate_location, severity, confirmations)
  VALUES (p_user_id, p_alert_type, p_title, p_description, p_location, p_location, p_severity, 1)
  RETURNING id INTO alert_id;

  INSERT INTO public.nyumba_kumi_confirmations (user_id, alert_id)
  VALUES (p_user_id, alert_id)
  ON CONFLICT DO NOTHING;

  FOR group_record IN
    SELECT g.id, g.name FROM public.nyumba_kumi_groups g
    WHERE g.county = p_location OR g.county IS NULL
  LOOP
    FOR member_record IN
      SELECT user_id FROM public.nyumba_kumi_group_members
      WHERE group_id = group_record.id AND user_id != p_user_id
    LOOP
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (member_record.user_id, 'nyumba_alert', p_title, p_description,
        jsonb_build_object('alert_id', alert_id, 'alert_type', p_alert_type,
          'severity', p_severity, 'location', p_location,
          'group_name', group_record.name, 'actor_id', p_user_id));
      notification_count := notification_count + 1;
    END LOOP;
  END LOOP;

  FOR member_record IN
    SELECT DISTINCT t.user_id FROM public.nyumba_kumi_trusted t
    JOIN public.profiles p ON p.id = t.user_id
    WHERE t.trusted_id = p_user_id AND t.user_id != p_user_id
      AND (p.county_hub = p_location OR p.county_hub IS NULL)
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (member_record.user_id, 'nyumba_alert', p_title, p_description,
      jsonb_build_object('alert_id', alert_id, 'alert_type', p_alert_type,
        'severity', p_severity, 'location', p_location, 'actor_id', p_user_id))
    ON CONFLICT DO NOTHING;
    notification_count := notification_count + 1;
  END LOOP;

  INSERT INTO public.admin_activity (admin_id, action, target_type, target_id, details)
  VALUES (p_user_id, 'create_nyumba_alert', 'nyumba_kumi_alert', alert_id::text,
    jsonb_build_object('alert_type', p_alert_type, 'severity', p_severity,
      'location', p_location, 'title', p_title,
      'notifications_sent', notification_count));

  IF p_severity IN ('high', 'critical') AND
     (SELECT COUNT(*) FROM public.nyumba_kumi_alerts
      WHERE user_id = p_user_id AND created_at > now() - interval '1 hour') >= 2
  THEN
    INSERT INTO public.moderation_queue (target_type, target_id, reporter_id, reason, status)
    VALUES ('nyumba_kumi_alert', alert_id, p_user_id,
      'Automated: multiple high-severity alerts in short period', 'pending');
  END IF;

  RETURN jsonb_build_object('id', alert_id, 'notifications_sent', notification_count);
END;
$$;

-- ============================================================
-- PART 9: Create missing function `update_topic_followers`
-- Called by src/app/api/topics/follow/route.ts
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

-- ============================================================
-- PART 10: Create missing storage bucket `private-guidance`
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('private-guidance', 'private-guidance', false, 52428800,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'video/mp4', 'audio/mpeg'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp',
                             'application/pdf', 'video/mp4', 'audio/mpeg'];

-- ============================================================
-- PART 11: Add missing performance indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conv ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- ============================================================
-- PART 12: Add missing tables to realtime publication
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
-- PART 13: Ensure public-media bucket exists with public=true
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('public-media', 'public-media', true, 10485760,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
