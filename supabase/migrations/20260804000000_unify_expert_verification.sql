-- =====================================================================
-- Unify the expert verification pipeline on expert_applications.
--
-- 1. Fix RLS on expert_applications: admin policies must key off
--    role = 'admin' (via is_admin()), not is_expert = true. Previously
--    ANY verified expert could read/update every application.
-- 2. Add a UNIQUE constraint on professionals.user_id so approval can
--    upsert (one professional row per user) instead of duplicating.
-- 3. Add admin_review_expert_application() SECURITY DEFINER RPC that
--    approves/declines an application, flips profile flags, upserts the
--    professionals directory row, and writes audit + notification.
-- =====================================================================

-- ---- 1. RLS on expert_applications -------------------------------
DROP POLICY IF EXISTS "Admins can read all" ON public.expert_applications;
DROP POLICY IF EXISTS "Admins can update" ON public.expert_applications;

CREATE POLICY "Admins can read all" ON public.expert_applications
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can update" ON public.expert_applications
  FOR UPDATE USING (is_admin());

-- ---- 2. Unique professional row per user --------------------------
CREATE UNIQUE INDEX IF NOT EXISTS professionals_user_id_key ON public.professionals (user_id);

-- ---- 3. Admin review RPC ------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_review_expert_application(
  p_app_id uuid,
  p_approve boolean,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_app expert_applications%ROWTYPE;
  v_category_name text;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can review expert applications';
  END IF;

  SELECT * INTO v_app FROM expert_applications WHERE id = p_app_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF v_app.status <> 'pending' THEN
    RAISE EXCEPTION 'Application already reviewed';
  END IF;

  SELECT name INTO v_category_name FROM expertise_categories WHERE id = v_app.category_id;

  UPDATE expert_applications
  SET status = CASE WHEN p_approve THEN 'approved' ELSE 'declined' END,
      reviewed_by = (select auth.uid()),
      reviewed_at = now(),
      admin_notes = COALESCE(p_notes, admin_notes)
  WHERE id = p_app_id;

  IF p_approve THEN
    UPDATE profiles
    SET is_expert = true,
        is_verified_expert = true
    WHERE id = v_app.user_id;

    INSERT INTO professionals (user_id, title, qualifications, bio, expertise, status)
    VALUES (
      v_app.user_id,
      v_app.title,
      v_app.qualifications,
      v_app.experience,
      CASE WHEN v_category_name IS NULL THEN '{}'::text[] ELSE ARRAY[v_category_name] END,
      'approved'
    )
    ON CONFLICT (user_id) DO UPDATE
      SET title = EXCLUDED.title,
          qualifications = EXCLUDED.qualifications,
          bio = EXCLUDED.bio,
          expertise = EXCLUDED.expertise,
          status = 'approved';

    INSERT INTO notifications (user_id, type, title, body, data, created_at)
    VALUES (v_app.user_id, 'expert_approved', 'Expert application approved',
      COALESCE(p_notes, 'Congratulations! You are now a verified expert.'),
      jsonb_build_object('application_id', v_app.id, 'reviewed_by', (select auth.uid())),
      now());
  ELSE
    INSERT INTO notifications (user_id, type, title, body, data, created_at)
    VALUES (v_app.user_id, 'expert_declined', 'Expert application declined',
      COALESCE(p_notes, 'Your application was not approved. You may apply again.'),
      jsonb_build_object('application_id', v_app.id, 'reviewed_by', (select auth.uid())),
      now());
  END IF;

  INSERT INTO admin_activity (admin_id, action, target_type, target_id, details, created_at)
  VALUES (
    (select auth.uid()),
    CASE WHEN p_approve THEN 'approve_expert' ELSE 'decline_expert' END,
    'expert_application',
    p_app_id::text,
    jsonb_build_object('user_id', v_app.user_id, 'status', CASE WHEN p_approve THEN 'approved' ELSE 'declined' END, 'notes', p_notes),
    now()
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_review_expert_application(uuid, boolean, text) TO authenticated;
