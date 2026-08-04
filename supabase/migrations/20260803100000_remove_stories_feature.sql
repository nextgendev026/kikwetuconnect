-- Remove the "my idea / your idea" 24h stories feature entirely.
-- The feature was never well integrated and is being gutted from the product.
-- Drops: stories, story_views, profile_story_stats tables; stories RPCs;
-- the auto-moderation trigger/function; the 'stories' storage bucket; and
-- activity-engine references to story counters.

-- 1. Drop the auto-moderation trigger + function for stories
-- (guarded so migration is idempotent if stories table was already removed)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stories') THEN
    DROP TRIGGER IF EXISTS tr_stories_auto_moderate ON public.stories;
  END IF;
END;
$$;
DROP FUNCTION IF EXISTS public.moderate_new_story();

-- 2. Drop the stories RPCs
DROP FUNCTION IF EXISTS public.create_story(text, text, text, int, text);
DROP FUNCTION IF EXISTS public.view_story(uuid);
DROP FUNCTION IF EXISTS public.purge_expired_stories();

-- 3. Recreate admin_delete_content WITHOUT the 'story' branch (it references
-- public.stories which is dropped below; leaving the branch would break the
-- function at runtime).
CREATE OR REPLACE FUNCTION public.admin_delete_content(p_item_type text, p_item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_actor uuid;
  v_deleted boolean := false;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT is_admin() INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_item_type = 'post' THEN
    DELETE FROM public.posts WHERE id = p_item_id;
    v_deleted := true;
  ELSIF p_item_type = 'answer' THEN
    DELETE FROM public.answers WHERE id = p_item_id;
    v_deleted := true;
  ELSIF p_item_type = 'listing' THEN
    DELETE FROM public.marketplace_listings WHERE id = p_item_id;
    v_deleted := true;
  ELSIF p_item_type = 'alert' THEN
    DELETE FROM public.nyumba_kumi_alerts WHERE id = p_item_id;
    v_deleted := true;
  ELSIF p_item_type = 'space' THEN
    DELETE FROM public.spaces WHERE id = p_item_id;
    v_deleted := true;
  ELSE
    RAISE EXCEPTION 'Unsupported item type: %', p_item_type;
  END IF;

  IF v_deleted THEN
    INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, reason)
    VALUES (v_actor, 'admin_delete', p_item_type, p_item_id::text, 'Deleted by admin');
  END IF;

  RETURN jsonb_build_object('ok', true, 'deleted', v_deleted);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_content(text, uuid) TO authenticated;

-- 4. Drop the stories tables
DROP TABLE IF EXISTS public.story_views;
DROP TABLE IF EXISTS public.profile_story_stats;
DROP TABLE IF EXISTS public.stories;

-- 5. Strip 'stories' from the app-media storage policies. The bucket itself
-- is removed via the Storage API (Direct deletion from storage tables is
-- blocked by the platform's protect_delete trigger).
DROP POLICY IF EXISTS "Anyone can read app media" ON storage.objects;
CREATE POLICY "Anyone can read app media" ON storage.objects
  FOR SELECT USING (
    auth.role() = 'authenticated'
    and bucket_id in ('avatars', 'covers', 'feed-images', 'feed-videos', 'media', 'public-media', 'audio', 'video')
  );

DROP POLICY IF EXISTS "Authenticated can upload app media" ON storage.objects;
CREATE POLICY "Authenticated can upload app media" ON storage.objects
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    and bucket_id in ('avatars', 'covers', 'feed-images', 'feed-videos', 'media', 'public-media', 'audio', 'video')
    and owner = auth.uid()
  );

-- 6. Remove stories from realtime publication
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'stories'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE stories;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'story_views'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE story_views;
  END IF;
END;
$$;

-- 7. Activity engine: drop the story counters from user_patterns and the
-- functions that reference them.
ALTER TABLE public.user_patterns DROP COLUMN IF EXISTS stories_7d;

CREATE OR REPLACE FUNCTION public.track_activity(
  p_user_id uuid,
  p_event_type text,
  p_entity_type text DEFAULT NULL,
  p_entity_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_severity text DEFAULT 'info'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_event_id uuid;
  v_hour int;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    v_uid := p_user_id;
  END IF;
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.activity_events (user_id, event_type, entity_type, entity_id, metadata, severity)
  VALUES (v_uid, p_event_type, p_entity_type, p_entity_id, p_metadata, p_severity)
  RETURNING id INTO v_event_id;

  v_hour := EXTRACT(HOUR FROM now())::int;

  INSERT INTO public.user_patterns (user_id, active_hours, last_active, updated_at)
  VALUES (v_uid, ARRAY[v_hour], now(), now())
  ON CONFLICT (user_id) DO UPDATE SET
    last_active = now(),
    updated_at = now(),
    engagement_score = user_patterns.engagement_score + 1,
    active_hours = CASE
      WHEN NOT (user_patterns.active_hours @> ARRAY[v_hour]) THEN user_patterns.active_hours || v_hour
      ELSE user_patterns.active_hours
    END,
    posts_7d = CASE WHEN p_event_type IN ('post_created','idea_created') THEN user_patterns.posts_7d + 1 ELSE user_patterns.posts_7d END,
    comments_7d = CASE WHEN p_event_type IN ('answer_created','comment_created') THEN user_patterns.comments_7d + 1 ELSE user_patterns.comments_7d END,
    upvotes_7d = CASE WHEN p_event_type IN ('upvote','post_upvoted','answer_upvoted') THEN user_patterns.upvotes_7d + 1 ELSE user_patterns.upvotes_7d END,
    follows_7d = CASE WHEN p_event_type = 'follow' THEN user_patterns.follows_7d + 1 ELSE user_patterns.follows_7d END,
    signins_7d = CASE WHEN p_event_type = 'session_started' THEN user_patterns.signins_7d + 1 ELSE user_patterns.signins_7d END;

  RETURN v_event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_user_patterns(p_limit int DEFAULT 15)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'user_id', up.user_id,
      'username', p.username,
      'full_name', p.full_name,
      'engagement', up.engagement_score,
      'risk', up.risk_score,
      'posts', up.posts_7d,
      'comments', up.comments_7d,
      'follows', up.follows_7d,
      'signins', up.signins_7d,
      'active_hours', up.active_hours,
      'last_active', up.last_active,
      'first_seen', up.first_seen))
    FROM public.user_patterns up
    LEFT JOIN public.profiles p ON p.id = up.user_id
    ORDER BY up.risk_score DESC, up.engagement_score DESC
    LIMIT GREATEST(1, LEAST(p_limit, 100))
  ), '[]'::jsonb);
END;
$$;

NOTIFY pgrst, 'reload schema';
