-- Fix poll voting end-to-end.
--
-- Root cause: the feed UI reads the posts.poll_options JSONB column
-- ({ text, votes } — no id), but the vote API/RPC require a real uuid from the
-- poll_options table, so every vote click sent optionId: undefined and got a
-- 400. Additionally:
--   * the old RPC accepted p_user_id from the caller (vote spoofing),
--   * delete+insert was race-prone,
--   * it never validated that the option belongs to the post,
--   * the posts.poll_options JSONB was never kept in sync.
--
-- This rewrites vote_on_poll_option to derive the voter from auth.uid(), do an
-- atomic ON CONFLICT upsert, validate the option/post relationship, recompute
-- counts, and mirror them back into posts.poll_options for legacy consumers.

DROP FUNCTION IF EXISTS public.vote_on_poll_option(uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION public.vote_on_poll_option(
  p_post_id uuid,
  p_option_id uuid
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
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.poll_options
    WHERE id = p_option_id AND post_id = p_post_id
  ) THEN
    RAISE EXCEPTION 'Option does not belong to this poll';
  END IF;

  -- Atomic: switching votes replaces the previous option in one statement.
  INSERT INTO public.poll_votes (user_id, post_id, option_id)
  VALUES (v_user_id, p_post_id, p_option_id)
  ON CONFLICT (user_id, post_id)
  DO UPDATE SET option_id = EXCLUDED.option_id;

  -- Recompute counts from the poll_votes table (authoritative).
  UPDATE public.poll_options po
  SET votes = (SELECT COUNT(*) FROM public.poll_votes pv WHERE pv.option_id = po.id)
  WHERE po.post_id = p_post_id;

  -- Keep the legacy posts.poll_options JSONB in sync for other consumers.
  UPDATE public.posts
  SET poll_options = COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', po.id,
        'text', po.option_text,
        'option_text', po.option_text,
        'votes', po.votes
      ) ORDER BY po.created_at
    )
    FROM public.poll_options po
    WHERE po.post_id = p_post_id
  ), '[]'::jsonb)
  WHERE id = p_post_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.vote_on_poll_option(uuid, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
