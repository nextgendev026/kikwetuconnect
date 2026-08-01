-- Activity engine: activity_events, error_reports, content_flags, user_patterns
-- + track/report/flag RPCs, automatic abuse-scoring + auto-moderation, admin overview/patterns.

-- ============================================================
-- 1. Tables
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  entity_type text,
  entity_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warn','critical')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_events_user_time ON public.activity_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_type_time ON public.activity_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_time ON public.activity_events (created_at DESC);

CREATE TABLE IF NOT EXISTS public.error_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  source text NOT NULL,
  route text,
  message text,
  stack text,
  metadata jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_error_reports_status ON public.error_reports (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.content_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  flagged_by text NOT NULL DEFAULT 'system',
  reason text NOT NULL,
  risk_score int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','dismissed','action_taken')),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE (content_type, content_id)
);
CREATE INDEX IF NOT EXISTS idx_content_flags_status ON public.content_flags (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.user_patterns (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  posts_7d int NOT NULL DEFAULT 0,
  comments_7d int NOT NULL DEFAULT 0,
  upvotes_7d int NOT NULL DEFAULT 0,
  follows_7d int NOT NULL DEFAULT 0,
  stories_7d int NOT NULL DEFAULT 0,
  signins_7d int NOT NULL DEFAULT 0,
  risk_score int NOT NULL DEFAULT 0,
  engagement_score int NOT NULL DEFAULT 0,
  active_hours int[] NOT NULL DEFAULT '{}',
  last_active timestamptz,
  first_seen timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_patterns_risk ON public.user_patterns (risk_score DESC, engagement_score DESC);

-- ============================================================
-- 2. Abuse scoring
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_content_risk(p_content text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_low text[] := ARRAY['idiot','stupid','dumb','gross','trash'];
  v_med text[] := ARRAY['hate','scam','fraud','spam','nude','porn','gambl','cryptocurrency'];
  v_high text[] := ARRAY['kill yourself','go kill','rape','fuck','bitch','whore','cunt','nigger','nigga','child porn','terrorist','slaughter','murder'];
  v_content text := lower(coalesce(p_content, ''));
  v_score int := 0;
  v_reasons text[] := '{}';
  v_word text;
  v_hits int;
  v_upper int;
  v_letters int;
  v_add int;
BEGIN
  IF btrim(v_content) = '' THEN
    RETURN jsonb_build_object('score', 0, 'reasons', jsonb_build_array());
  END IF;

  FOREACH v_word IN ARRAY v_low LOOP
    v_hits := (length(v_content) - length(replace(v_content, v_word, ''))) / length(v_word);
    IF v_hits > 0 THEN
      v_add := 8 * least(v_hits, 3);
      v_score := v_score + v_add;
      IF NOT (v_reasons @> ARRAY['Concerning language']) THEN
        v_reasons := array_append(v_reasons, 'Concerning language');
      END IF;
    END IF;
  END LOOP;

  FOREACH v_word IN ARRAY v_med LOOP
    v_hits := (length(v_content) - length(replace(v_content, v_word, ''))) / length(v_word);
    IF v_hits > 0 THEN
      v_score := v_score + (15 * least(v_hits, 3));
      IF NOT (v_reasons @> ARRAY['Possible scam/spam']) THEN
        v_reasons := array_append(v_reasons, 'Possible scam/spam');
      END IF;
    END IF;
  END LOOP;

  FOREACH v_word IN ARRAY v_high LOOP
    v_hits := (length(v_content) - length(replace(v_content, v_word, ''))) / length(v_word);
    IF v_hits > 0 THEN
      v_score := v_score + (30 * least(v_hits, 2));
      IF NOT (v_reasons @> ARRAY['Abusive/harassing language']) THEN
        v_reasons := array_append(v_reasons, 'Abusive/harassing language');
      END IF;
    END IF;
  END LOOP;

  IF position('http' in v_content) > 0 OR position('t.me' in v_content) > 0 OR position('wa.me' in v_content) > 0 THEN
    v_score := v_score + 15;
    IF NOT (v_reasons @> ARRAY['Contains external link']) THEN
      v_reasons := array_append(v_reasons, 'Contains external link');
    END IF;
  END IF;

  IF length(v_content) > 30 THEN
    v_upper := length(regexp_replace(v_content, '[^a-z]', '', 'g'));
    v_letters := length(regexp_replace(v_content, '[^a-z]', '', 'g'));
    v_upper := length(regexp_replace(v_content, '[^A-Z]', '', 'g'));
    IF v_letters > 0 AND (v_upper::numeric / v_letters) > 0.5 THEN
      v_score := v_score + 10;
      IF NOT (v_reasons @> ARRAY['Excessive caps']) THEN
        v_reasons := array_append(v_reasons, 'Excessive caps');
      END IF;
    END IF;
  END IF;

  IF (length(v_content) - length(replace(v_content, '!!!', ''))) / 3 >= 2 THEN
    v_score := v_score + 5;
    IF NOT (v_reasons @> ARRAY['Excessive punctuation']) THEN
      v_reasons := array_append(v_reasons, 'Excessive punctuation');
    END IF;
  END IF;

  v_score := least(v_score, 100);
  RETURN jsonb_build_object('score', v_score, 'reasons', to_jsonb(v_reasons));
END;
$$;

-- ============================================================
-- 3. Activity tracking
-- ============================================================
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
    stories_7d = CASE WHEN p_event_type IN ('story_created','story_viewed') THEN user_patterns.stories_7d + 1 ELSE user_patterns.stories_7d END,
    signins_7d = CASE WHEN p_event_type = 'session_started' THEN user_patterns.signins_7d + 1 ELSE user_patterns.signins_7d END;

  RETURN v_event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.report_error(
  p_source text,
  p_route text,
  p_message text,
  p_stack text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.error_reports (user_id, source, route, message, stack, metadata, status)
  VALUES (auth.uid(), p_source, p_route, left(p_message, 2000), left(p_stack, 8000), p_metadata, 'open')
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.flag_content(
  p_content_type text,
  p_content_id uuid,
  p_reason text,
  p_risk_score int DEFAULT 0
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_actor text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  v_actor := auth.uid()::text;

  INSERT INTO public.content_flags (content_type, content_id, flagged_by, reason, risk_score, status)
  VALUES (p_content_type, p_content_id, v_actor, p_reason, p_risk_score, 'pending')
  ON CONFLICT (content_type, content_id) DO UPDATE SET
    reason = content_flags.reason || '; ' || p_reason
  RETURNING id INTO v_id;

  INSERT INTO public.moderation_queue (target_type, target_id, reporter_id, reason, status)
  VALUES (p_content_type, p_content_id, auth.uid(), p_reason, 'pending')
  ON CONFLICT DO NOTHING;

  RETURN v_id;
END;
$$;

-- ============================================================
-- 4. Auto-moderation on new posts and comments
-- ============================================================
CREATE OR REPLACE FUNCTION public.moderate_new_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_content text;
  v_risk jsonb;
  v_score int;
  v_reason text;
  v_rate int;
BEGIN
  IF TG_TABLE_NAME = 'posts' THEN
    v_content := coalesce(NEW.title, '') || ' ' || coalesce(NEW.content, '');
    SELECT count(*) INTO v_rate FROM public.posts
    WHERE user_id = NEW.user_id AND created_at > now() - interval '1 minute';
  ELSIF TG_TABLE_NAME = 'answers' THEN
    v_content := coalesce(NEW.content, '');
    SELECT count(*) INTO v_rate FROM public.answers
    WHERE user_id = NEW.user_id AND created_at > now() - interval '1 minute';
  ELSE
    RETURN NEW;
  END IF;

  v_risk := public.check_content_risk(v_content);
  v_score := (v_risk->>'score')::int;
  v_reason := COALESCE(NULLIF(v_risk->'reasons'->>0, ''), 'Unspecified');

  PERFORM public.track_activity(
    NEW.user_id,
    CASE WHEN TG_TABLE_NAME = 'posts' THEN 'post_created' ELSE 'answer_created' END,
    TG_TABLE_NAME,
    NEW.id::text,
    jsonb_build_object('risk_score', v_score),
    CASE WHEN v_score >= 60 THEN 'warn' ELSE 'info' END
  );

  IF v_score >= 60 THEN
    INSERT INTO public.content_flags (content_type, content_id, flagged_by, reason, risk_score, status)
    VALUES (TG_TABLE_NAME, NEW.id, 'system', v_reason || ' (auto)', v_score, 'pending')
    ON CONFLICT (content_type, content_id) DO NOTHING;

    INSERT INTO public.moderation_queue (target_type, target_id, reporter_id, reason, status)
    VALUES (TG_TABLE_NAME, NEW.id, NEW.user_id,
      'Auto-flagged (' || v_reason || ', score ' || v_score || ')', 'pending')
    ON CONFLICT DO NOTHING;

    UPDATE public.user_patterns
    SET risk_score = user_patterns.risk_score + (v_score / 10)
    WHERE user_id = NEW.user_id;
  END IF;

  IF v_rate >= 6 THEN
    INSERT INTO public.content_flags (content_type, content_id, flagged_by, reason, risk_score, status)
    VALUES (TG_TABLE_NAME, NEW.id, 'system', 'Rapid posting: ' || v_rate || ' in 60s', 85, 'pending')
    ON CONFLICT (content_type, content_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_posts_auto_moderate ON public.posts;
CREATE TRIGGER tr_posts_auto_moderate AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.moderate_new_content();

DROP TRIGGER IF EXISTS tr_answers_auto_moderate ON public.answers;
CREATE TRIGGER tr_answers_auto_moderate AFTER INSERT ON public.answers
  FOR EACH ROW EXECUTE FUNCTION public.moderate_new_content();

-- ============================================================
-- 5. Admin operations
-- ============================================================
CREATE OR REPLACE FUNCTION public.resolve_error(p_error_id uuid, p_resolution text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  UPDATE public.error_reports
  SET status = 'resolved', resolved_by = auth.uid(), resolution = p_resolution, resolved_at = now()
  WHERE id = p_error_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.review_content_flag(
  p_flag_id uuid,
  p_action text,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ctype text;
  v_cid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_action NOT IN ('dismiss','action_taken') THEN RAISE EXCEPTION 'Invalid action'; END IF;

  SELECT content_type, content_id INTO v_ctype, v_cid
  FROM public.content_flags WHERE id = p_flag_id;

  UPDATE public.content_flags
  SET status = p_action, reviewed_by = auth.uid(), notes = p_notes, reviewed_at = now()
  WHERE id = p_flag_id;

  UPDATE public.moderation_queue
  SET status = p_action, reviewed_by = auth.uid(), notes = p_notes, reviewed_at = now()
  WHERE target_type = v_ctype AND target_id = v_cid AND status = 'pending';

  IF p_action = 'action_taken' AND v_ctype IN ('post','answer') THEN
    PERFORM public.admin_delete_content(v_ctype, v_cid);
  END IF;

  RETURN jsonb_build_object('ok', true, 'content_type', v_ctype, 'content_id', v_cid);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_activity_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_h1 timestamptz := now() - interval '1 hour';
  v_d1 timestamptz := now() - interval '1 day';
  v_d7 timestamptz := now() - interval '7 days';
  v_d30 timestamptz := now() - interval '30 days';
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT jsonb_build_object(
    'totals', jsonb_build_object(
      'hour', (SELECT count(*) FROM public.activity_events WHERE created_at > v_h1),
      'day', (SELECT count(*) FROM public.activity_events WHERE created_at > v_d1),
      'week', (SELECT count(*) FROM public.activity_events WHERE created_at > v_d7),
      'month', (SELECT count(*) FROM public.activity_events WHERE created_at > v_d30),
      'all_time', (SELECT count(*) FROM public.activity_events)
    ),
    'by_type', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('type', event_type, 'count', c))
      FROM (SELECT event_type, count(*) c FROM public.activity_events
            WHERE created_at > v_d7 GROUP BY event_type ORDER BY c DESC LIMIT 15) t
    ), '[]'::jsonb),
    'by_day', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('day', to_char(d, 'YYYY-MM-DD'), 'count', c))
      FROM (SELECT date_trunc('day', created_at)::date d, count(*) c
            FROM public.activity_events WHERE created_at > v_d30 GROUP BY 1 ORDER BY 1) t
    ), '[]'::jsonb),
    'errors', jsonb_build_object(
      'open', (SELECT count(*) FROM public.error_reports WHERE status = 'open'),
      'today', (SELECT count(*) FROM public.error_reports WHERE created_at > v_d1),
      'recent', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', id, 'source', source, 'route', route, 'message', message,
          'status', status, 'created_at', created_at))
        FROM (SELECT * FROM public.error_reports ORDER BY created_at DESC LIMIT 8) t
      ), '[]'::jsonb)
    ),
    'flags', jsonb_build_object(
      'pending', (SELECT count(*) FROM public.content_flags WHERE status = 'pending'),
      'total', (SELECT count(*) FROM public.content_flags),
      'week', (SELECT count(*) FROM public.content_flags WHERE created_at > v_d7),
      'recent', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', id, 'content_type', content_type, 'content_id', content_id,
          'reason', reason, 'risk_score', risk_score, 'status', status, 'created_at', created_at))
        FROM (SELECT * FROM public.content_flags ORDER BY created_at DESC LIMIT 10) t
      ), '[]'::jsonb)
    ),
    'top_users', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('user_id', user_id, 'events', events, 'risk', risk))
      FROM (SELECT user_id, count(*) events,
                   COALESCE(sum((metadata->>'risk_score')::int), 0) risk
            FROM public.activity_events WHERE created_at > v_d7
            GROUP BY user_id ORDER BY events DESC LIMIT 8) t
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
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
      'stories', up.stories_7d,
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

CREATE OR REPLACE FUNCTION public.refresh_user_patterns(p_user_id uuid DEFAULT NULL)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated int := 0;
  v_uid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  FOR v_uid IN
    SELECT DISTINCT user_id FROM public.activity_events
    WHERE user_id IS NOT NULL AND (p_user_id IS NULL OR user_id = p_user_id)
  LOOP
    INSERT INTO public.user_patterns (user_id, active_hours, last_active, risk_score, engagement_score, updated_at)
    SELECT
      v_uid,
      ARRAY(SELECT DISTINCT extract(hour FROM created_at)::int
            FROM public.activity_events WHERE user_id = v_uid ORDER BY 1),
      (SELECT max(created_at) FROM public.activity_events WHERE user_id = v_uid),
      (SELECT COALESCE(sum((metadata->>'risk_score')::int), 0) FROM public.activity_events WHERE user_id = v_uid),
      (SELECT count(*) FROM public.activity_events WHERE user_id = v_uid),
      now()
    ON CONFLICT (user_id) DO UPDATE SET
      last_active = excluded.last_active,
      risk_score = excluded.risk_score,
      engagement_score = excluded.engagement_score,
      active_hours = excluded.active_hours,
      updated_at = now();
    v_updated := v_updated + 1;
  END LOOP;

  RETURN v_updated;
END;
$$;

-- ============================================================
-- 6. RLS + grants
-- ============================================================
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_patterns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS activity_events_read_own ON public.activity_events;
CREATE POLICY activity_events_read_own ON public.activity_events
  FOR SELECT USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS error_reports_read_admin ON public.error_reports;
CREATE POLICY error_reports_read_admin ON public.error_reports
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS content_flags_read_admin ON public.content_flags;
CREATE POLICY content_flags_read_admin ON public.content_flags
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS user_patterns_read_admin ON public.user_patterns;
CREATE POLICY user_patterns_read_admin ON public.user_patterns
  FOR SELECT USING (is_admin());

GRANT EXECUTE ON FUNCTION public.check_content_risk(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_activity(uuid, text, text, text, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_error(text, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.flag_content(text, uuid, text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_error(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_content_flag(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_activity_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_user_patterns(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_user_patterns(uuid) TO authenticated;
