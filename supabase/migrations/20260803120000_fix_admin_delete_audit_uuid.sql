-- Fix admin_delete_content: audit_logs.entity_id is uuid, but the function
-- was inserting p_item_id::text (a text cast), causing:
--   column "entity_id" is of type uuid but expression is of type text
-- This broke deleting posts/answers/listings/alerts/spaces from the admin UI.

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
    VALUES (v_actor, 'admin_delete', p_item_type, p_item_id, 'Deleted by admin');
  END IF;

  RETURN jsonb_build_object('ok', true, 'deleted', v_deleted);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_content(text, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
