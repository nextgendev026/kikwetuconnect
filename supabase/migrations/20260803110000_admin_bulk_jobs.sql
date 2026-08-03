-- ============================================================
-- Migration: 20260803110000_admin_bulk_jobs
-- Add job tracking for bulk admin moderation so long/partial
-- batches are observable and a single bad item id cannot abort
-- the whole operation.
--  1. admin_bulk_jobs table (RLS: admins only)
--  2. admin_bulk_moderate -> creates a job, processes items with
--     per-item exception handling, returns the job id
--  3. get_admin_bulk_job -> read a job's progress/results
-- ============================================================

-- ------------------------------------------------------------
-- 1. Job table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_bulk_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.profiles(id),
  action text NOT NULL,
  status text NOT NULL DEFAULT 'running', -- running | completed
  total integer NOT NULL DEFAULT 0,
  processed integer NOT NULL DEFAULT 0,
  succeeded integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  item_ids uuid[] NOT NULL DEFAULT '{}',
  notes text,
  error_details jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_bulk_jobs ENABLE ROW LEVEL SECURITY;

-- Writes happen only via SECURITY DEFINER RPCs; reads are admin-only.
DROP POLICY IF EXISTS "Admins can read bulk jobs" ON public.admin_bulk_jobs;
CREATE POLICY "Admins can read bulk jobs" ON public.admin_bulk_jobs
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admins can insert bulk jobs" ON public.admin_bulk_jobs;
CREATE POLICY "Admins can insert bulk jobs" ON public.admin_bulk_jobs
  FOR INSERT WITH CHECK (is_admin());

-- ------------------------------------------------------------
-- 2. Rewrite admin_bulk_moderate with job tracking + per-item
--    exception handling. Signature stays the same; return type
--    changes void -> uuid (job id).
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_bulk_moderate(uuid, uuid[], text, text);
CREATE FUNCTION public.admin_bulk_moderate(
  p_admin_id uuid,
  p_item_ids uuid[],
  p_status text,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin uuid;
  v_job_id uuid;
  v_item uuid;
  v_total integer;
  v_success integer := 0;
  v_fail integer := 0;
  v_errors jsonb := '[]'::jsonb;
BEGIN
  v_admin := (select auth.uid());
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_admin AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can moderate items';
  END IF;

  v_total := coalesce(array_length(p_item_ids, 1), 0);
  IF v_total = 0 THEN
    RAISE EXCEPTION 'No items selected';
  END IF;

  INSERT INTO public.admin_bulk_jobs (admin_id, action, status, total, item_ids, notes)
  VALUES (v_admin, 'moderate_' || p_status, 'running', v_total, p_item_ids, p_notes)
  RETURNING id INTO v_job_id;

  FOREACH v_item IN ARRAY p_item_ids
  LOOP
    BEGIN
      PERFORM public.admin_moderate_item(v_admin, v_item, p_status, p_notes);
      v_success := v_success + 1;
    EXCEPTION WHEN OTHERS THEN
      v_fail := v_fail + 1;
      v_errors := v_errors || jsonb_build_object('item_id', v_item, 'error', SQLERRM);
    END;

    UPDATE public.admin_bulk_jobs
    SET processed = processed + 1,
        succeeded = v_success,
        failed = v_fail,
        error_details = CASE WHEN v_fail > 0 THEN v_errors ELSE NULL END,
        updated_at = now()
    WHERE id = v_job_id;
  END LOOP;

  UPDATE public.admin_bulk_jobs
  SET status = 'completed', updated_at = now()
  WHERE id = v_job_id;

  RETURN v_job_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_bulk_moderate(uuid, uuid[], text, text) TO authenticated;

-- ------------------------------------------------------------
-- 3. Read job status/results
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_bulk_job(p_job_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin uuid;
  v_row public.admin_bulk_jobs;
BEGIN
  v_admin := (select auth.uid());
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_admin AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can view bulk jobs';
  END IF;

  SELECT * INTO v_row FROM public.admin_bulk_jobs WHERE id = p_job_id;
  IF NOT FOUND THEN
    RETURN null;
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'action', v_row.action,
    'status', v_row.status,
    'total', v_row.total,
    'processed', v_row.processed,
    'succeeded', v_row.succeeded,
    'failed', v_row.failed,
    'error_details', v_row.error_details,
    'created_at', v_row.created_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_bulk_job(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
