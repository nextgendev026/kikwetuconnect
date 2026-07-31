-- Admin capabilities: delete content, space thumbnails, marketplace realtime, data export

-- 1. Admin delete content (posts, answers, listings, spaces) — server-side, audit-logged
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

-- 2. Realtime for marketplace + spaces detail (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'marketplace_listings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE marketplace_listings;
  END IF;
END
$$;

-- 3. Space thumbnails: reuse cover_url; ensure column exists
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS cover_url text;

-- 4. Data export snapshot for admins — returns key platform data as jsonb
CREATE OR REPLACE FUNCTION public.admin_export_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_result jsonb;
BEGIN
  SELECT is_admin() INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT jsonb_build_object(
    'exported_at', now(),
    'users', (SELECT jsonb_agg(jsonb_build_object('id', id, 'username', username, 'full_name', full_name, 'county_hub', county_hub, 'role', role, 'created_at', created_at)) FROM profiles),
    'posts', (SELECT jsonb_agg(jsonb_build_object('id', id, 'user_id', user_id, 'post_type', post_type, 'content', left(content, 2000), 'created_at', created_at)) FROM posts),
    'spaces', (SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'slug', slug, 'category', category, 'member_count', member_count, 'created_at', created_at)) FROM spaces),
    'listings', (SELECT jsonb_agg(jsonb_build_object('id', id, 'title', title, 'price', price, 'status', status, 'created_at', created_at)) FROM marketplace_listings),
    'alerts', (SELECT jsonb_agg(jsonb_build_object('id', id, 'title', title, 'type', type, 'county', county, 'status', status)) FROM nyumba_kumi_alerts),
    'counts', jsonb_build_object(
      'users', (SELECT count(*) FROM profiles),
      'posts', (SELECT count(*) FROM posts),
      'answers', (SELECT count(*) FROM answers),
      'spaces', (SELECT count(*) FROM spaces),
      'listings', (SELECT count(*) FROM marketplace_listings),
      'messages', (SELECT count(*) FROM messages)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_export_snapshot() TO authenticated;
