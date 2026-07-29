-- Atomic Heshima operations + secure client-side insert replacements
-- 1. Atomic grant/spend heshima (profile + ledger in one tx)
-- 2. RPCs for nyumba group operations (audited)
-- 3. Drop redundant admin_activity client-side code support

-- ============================================================
-- Atomic Heshima operations
-- ============================================================

CREATE OR REPLACE FUNCTION grant_heshima(
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
  v_result jsonb;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  INSERT INTO heshima_earnings (user_id, amount, source_type, source_id, description)
  VALUES (p_user_id, p_amount, p_source_type, p_source_id, p_description);

  WITH updated AS (
    UPDATE profiles
    SET heshima_points = COALESCE(heshima_points, 0) + p_amount,
        updated_at = now()
    WHERE id = p_user_id
    RETURNING heshima_points
  )
  SELECT jsonb_build_object(
    'granted', true,
    'amount', p_amount,
    'total_points', (SELECT heshima_points FROM updated),
    'new_earnings_id', currval('heshima_earnings_id_seq'::regclass)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION spend_heshima(
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
  v_current integer;
  v_result jsonb;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  SELECT heshima_points INTO v_current FROM profiles WHERE id = p_user_id;
  IF v_current IS NULL OR v_current < p_amount THEN
    RAISE EXCEPTION 'Insufficient Heshima points';
  END IF;

  INSERT INTO heshima_earnings (user_id, amount, source_type, source_id, description)
  VALUES (p_user_id, -p_amount, p_source_type, p_source_id, p_description);

  WITH updated AS (
    UPDATE profiles
    SET heshima_points = heshima_points - p_amount,
        updated_at = now()
    WHERE id = p_user_id
    RETURNING heshima_points
  )
  SELECT jsonb_build_object(
    'spent', true,
    'amount', p_amount,
    'total_points', (SELECT heshima_points FROM updated)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Get heshima balance (safe client-side call)
CREATE OR REPLACE FUNCTION get_heshima_balance(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance integer;
BEGIN
  SELECT heshima_points INTO v_balance FROM profiles WHERE id = p_user_id;
  RETURN COALESCE(v_balance, 0);
END;
$$;

-- ============================================================
-- Audited RPCs for Nyumba operations (replaces client-side admin_activity inserts)
-- ============================================================

CREATE OR REPLACE FUNCTION create_nyumba_group_audited(
  p_name text,
  p_slug text,
  p_description text,
  p_county text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid;
  v_user_id uuid;
  v_result jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO nyumba_kumi_groups (name, slug, description, county, created_by)
  VALUES (p_name, p_slug, p_description, p_county, v_user_id)
  RETURNING id INTO v_group_id;

  INSERT INTO nyumba_kumi_group_members (group_id, user_id, role)
  VALUES (v_group_id, v_user_id, 'admin');

  INSERT INTO admin_activity (admin_id, action, target_type, target_id, details)
  VALUES (v_user_id, 'create_nyumba_group', 'nyumba_kumi_group', v_group_id::text,
    jsonb_build_object('name', p_name, 'county', p_county));

  SELECT jsonb_build_object('id', v_group_id, 'slug', p_slug) INTO v_result;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION report_alert_audited(
  p_alert_id uuid,
  p_reason text DEFAULT 'Misinformation'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO moderation_queue (target_type, target_id, reporter_id, reason, status)
  VALUES ('nyumba_kumi_alert', p_alert_id, v_user_id, p_reason, 'pending');
END;
$$;

CREATE OR REPLACE FUNCTION hide_alert_audited(p_alert_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can hide alerts';
  END IF;

  DELETE FROM nyumba_kumi_alerts WHERE id = p_alert_id;

  INSERT INTO admin_activity (admin_id, action, target_type, target_id)
  VALUES (v_user_id, 'hide_alert', 'nyumba_kumi_alert', p_alert_id::text);
END;
$$;

-- ============================================================
-- Fix post_translations: allow anon key via RPC only
-- ============================================================

CREATE OR REPLACE FUNCTION insert_translation(
  p_post_id uuid,
  p_source_type text,
  p_language text,
  p_translated_text text,
  p_translated_title text DEFAULT NULL,
  p_provider text DEFAULT 'openai'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO post_translations (post_id, source_type, language, translated_text, translated_title, provider, created_by)
  VALUES (p_post_id, p_source_type, p_language, p_translated_text, p_translated_title, p_provider, auth.uid())
  ON CONFLICT (post_id, source_type, language)
  DO UPDATE SET translated_text = p_translated_text, translated_title = p_translated_title, created_at = now();
END;
$$;

-- Log admin activity (used by logAdminActivity helper)
CREATE OR REPLACE FUNCTION admin_log_activity(
  p_action text,
  p_target_type text DEFAULT NULL,
  p_target_id text DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can log activity';
  END IF;

  INSERT INTO admin_activity (admin_id, action, target_type, target_id, details)
  VALUES (v_user_id, p_action, p_target_type, p_target_id, p_details);
END;
$$;

-- Moderate alert (used by Nyumba admin panel)
CREATE OR REPLACE FUNCTION moderate_alert_audited(
  p_item_id uuid,
  p_status text,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can moderate';
  END IF;

  UPDATE moderation_queue
  SET status = p_status, reviewed_by = v_user_id, notes = COALESCE(p_notes, notes), reviewed_at = now()
  WHERE id = p_item_id;

  INSERT INTO admin_activity (admin_id, action, target_type, target_id, details)
  VALUES (v_user_id, 'moderate_alert', 'moderation_queue', p_item_id::text,
    jsonb_build_object('status', p_status, 'notes', p_notes));
END;
$$;
