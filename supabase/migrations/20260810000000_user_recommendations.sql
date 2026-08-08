-- ============================================================
-- 20260810000000 — user recommendations + dynamic sidebar ads
-- 1. get_user_recommendations(): score suggested people to follow
--    by region, shared interests, likes activity and popularity.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_recommendations(p_limit int DEFAULT 8)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid          uuid;
  v_my_interests text[];
  v_my_county    text;
  v_max          int;
  v_rows         jsonb;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_max := GREATEST(1, p_limit);

  SELECT interests, county_hub
    INTO v_my_interests, v_my_county
    FROM public.profiles
   WHERE id = v_uid;

  WITH scored AS (
    SELECT
      p.id,
      p.username,
      p.full_name,
      p.avatar_url,
      p.headline,
      p.county_hub,
      p.heshima_rating,
      p.is_verified_expert,
      ( CASE WHEN p.county_hub IS NOT NULL AND p.county_hub = v_my_county THEN 3 ELSE 0 END
      + (SELECT count(*) FROM (
           SELECT unnest(p.interests) INTERSECT SELECT unnest(COALESCE(v_my_interests, ARRAY[]::text[]))
         ) x) * 2
      + (SELECT count(*) FROM public.likes l WHERE l.user_id = p.id
           AND l.post_id IN (SELECT id FROM public.posts WHERE user_id = v_uid)) * 2
      + (SELECT count(*) FROM public.likes l WHERE l.post_id IN (SELECT id FROM public.posts WHERE user_id = p.id)
           AND l.user_id = v_uid) * 2
      + least(COALESCE(p.heshima_rating, 0), 100)
      ) AS score,
      ( SELECT COALESCE(string_agg(r.reason, ' · '), '')
          FROM (
            SELECT 'Same region' AS reason WHERE p.county_hub IS NOT NULL AND p.county_hub = v_my_county
            UNION ALL
            SELECT 'Shared interests' WHERE p.interests IS NOT NULL
              AND EXISTS (SELECT 1 FROM (SELECT unnest(p.interests) INTERSECT SELECT unnest(COALESCE(v_my_interests, ARRAY[]::text[]))) y)
            UNION ALL
            SELECT 'Likes your posts' WHERE EXISTS (
              SELECT 1 FROM public.likes l WHERE l.user_id = p.id
                AND l.post_id IN (SELECT id FROM public.posts WHERE user_id = v_uid))
            UNION ALL
            SELECT 'You like their posts' WHERE EXISTS (
              SELECT 1 FROM public.likes l WHERE l.post_id IN (SELECT id FROM public.posts WHERE user_id = p.id)
                AND l.user_id = v_uid)
          ) r
      ) AS reason
    FROM public.profiles p
    WHERE p.id <> v_uid
      AND p.is_deactivated = false
      AND p.username IS NOT NULL AND p.username <> ''
      AND NOT EXISTS (
        SELECT 1 FROM public.follows f
        WHERE f.follower_id = v_uid AND f.following_id = p.id
      )
      AND (
           (p.county_hub IS NOT NULL AND p.county_hub = v_my_county)
        OR (p.interests IS NOT NULL AND p.interests && COALESCE(v_my_interests, ARRAY[]::text[]))
        OR EXISTS (
            SELECT 1 FROM public.likes l
            WHERE (l.user_id = p.id AND l.post_id IN (SELECT id FROM public.posts WHERE user_id = v_uid))
               OR (l.post_id IN (SELECT id FROM public.posts WHERE user_id = p.id) AND l.user_id = v_uid))
        OR p.follower_count > 0
      )
    LIMIT 200
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(s) ORDER BY s.score DESC, s.heshima_rating DESC), '[]'::jsonb)
    INTO v_rows
    FROM (SELECT * FROM scored ORDER BY score DESC, heshima_rating DESC LIMIT v_max) s;

  RETURN v_rows;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_recommendations(int) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_recommendations(int) FROM anon, public;

notify pgrst, 'reload schema';