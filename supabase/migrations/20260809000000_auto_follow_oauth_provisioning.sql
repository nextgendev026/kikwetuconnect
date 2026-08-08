-- ============================================================
-- Auto-follow + automatic profile provisioning
-- 1. Auto-provision a profile row for every new auth user
--    (covers OAuth sign-ins, which never run the client-side
--    signup upsert). Idempotent + conflict-safe.
-- 2. Replace the follow-request system with a direct
--    follow/unfollow toggle (no manual approval).
-- ============================================================

-- ---------- 1. Auto-create profiles on auth.users insert ----------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username text;
  v_base     text;
  v_full     text;
  v_avatar   text;
  v_n        int := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  v_username := lower(coalesce(NEW.raw_user_meta_data->>'username', ''));
  IF v_username = '' THEN
    v_username := lower(split_part(coalesce(NEW.email, ''), '@', 1));
  END IF;
  v_username := coalesce(nullif(regexp_replace(v_username, '[^a-z0-9_.]', '', 'g'), ''), 'user');
  v_base := v_username;

  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) LOOP
    v_n := v_n + 1;
    v_username := v_base || v_n::text;
  END LOOP;

  v_full   := nullif(coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), '');
  v_avatar := nullif(coalesce(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''), '');

  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (NEW.id, v_username, v_full, v_avatar);

  RETURN NEW;
EXCEPTION WHEN unique_violation THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- 2. Direct follow/unfollow toggle ----------
CREATE OR REPLACE FUNCTION public.toggle_follow(p_target_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      uuid;
  v_is_following boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF v_user_id = p_target_id THEN
    RAISE EXCEPTION 'Cannot follow yourself';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.follows
    WHERE follower_id = v_user_id AND following_id = p_target_id
  ) INTO v_is_following;

  -- Already following -> unfollow
  IF v_is_following THEN
    DELETE FROM public.follows
    WHERE follower_id = v_user_id AND following_id = p_target_id;

    PERFORM public.decrement_follower_count(p_target_id);
    PERFORM public.decrement_following_count(v_user_id);

    RETURN jsonb_build_object('following', false, 'unfollowed', true);
  END IF;

  -- Not following -> follow
  INSERT INTO public.follows (follower_id, following_id)
  VALUES (v_user_id, p_target_id)
  ON CONFLICT (follower_id, following_id) DO NOTHING;

  PERFORM public.increment_follower_count(p_target_id);
  PERFORM public.increment_following_count(v_user_id);

  PERFORM public.create_notification(
    p_user_id    := p_target_id,
    p_actor_id   := v_user_id,
    p_type       := 'follow',
    p_target_id  := v_user_id,
    p_target_type:= 'profile',
    p_content    := 'started following you',
    p_title      := 'New follower',
    p_body       := 'Someone started following you'
  );

  RETURN jsonb_build_object('following', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_follow(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.toggle_follow(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.toggle_follow(uuid) FROM public;

notify pgrst, 'reload schema';