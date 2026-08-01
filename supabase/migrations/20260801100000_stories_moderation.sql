-- Extend the activity engine to stories: auto-moderation on story captions and
-- admin deletion support for flagged stories.

-- 1. Auto-moderation on new stories (tracks activity + flags abuse + spam-rate)
CREATE OR REPLACE FUNCTION public.moderate_new_story()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_risk jsonb;
  v_score int;
  v_reason text;
  v_rate int;
BEGIN
  v_risk := public.check_content_risk(coalesce(NEW.caption, ''));
  v_score := (v_risk->>'score')::int;
  v_reason := COALESCE(NULLIF(v_risk->'reasons'->>0, ''), 'Unspecified');

  SELECT count(*) INTO v_rate FROM public.stories
  WHERE user_id = NEW.user_id AND created_at > now() - interval '1 minute';

  PERFORM public.track_activity(
    NEW.user_id,
    'story_created',
    'story',
    NEW.id::text,
    jsonb_build_object('risk_score', v_score),
    CASE WHEN v_score >= 60 THEN 'warn' ELSE 'info' END
  );

  IF v_score >= 60 THEN
    INSERT INTO public.content_flags (content_type, content_id, flagged_by, reason, risk_score, status)
    VALUES ('story', NEW.id, 'system', v_reason || ' (auto)', v_score, 'pending')
    ON CONFLICT (content_type, content_id) DO NOTHING;

    INSERT INTO public.moderation_queue (target_type, target_id, reporter_id, reason, status)
    VALUES ('story', NEW.id, NEW.user_id,
      'Auto-flagged story (' || v_reason || ', score ' || v_score || ')', 'pending')
    ON CONFLICT DO NOTHING;

    UPDATE public.user_patterns
    SET risk_score = user_patterns.risk_score + (v_score / 10)
    WHERE user_id = NEW.user_id;
  END IF;

  IF v_rate >= 6 THEN
    INSERT INTO public.content_flags (content_type, content_id, flagged_by, reason, risk_score, status)
    VALUES ('story', NEW.id, 'system', 'Rapid posting: ' || v_rate || ' stories in 60s', 85, 'pending')
    ON CONFLICT (content_type, content_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_stories_auto_moderate ON public.stories;
CREATE TRIGGER tr_stories_auto_moderate AFTER INSERT ON public.stories
  FOR EACH ROW EXECUTE FUNCTION public.moderate_new_story();

-- 2. Extend admin_delete_content to support stories (replaces prior definition)
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
  ELSIF p_item_type = 'story' THEN
    DELETE FROM public.stories WHERE id = p_item_id;
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
