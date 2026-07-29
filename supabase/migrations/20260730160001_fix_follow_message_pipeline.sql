-- Fix follow pipeline and message DM access
-- 1. Grant EXECUTE on follow count RPCs (needed by API route)
GRANT EXECUTE ON FUNCTION increment_follower_count TO authenticated, anon;
GRANT EXECUTE ON FUNCTION decrement_follower_count TO authenticated, anon;
GRANT EXECUTE ON FUNCTION increment_following_count TO authenticated, anon;
GRANT EXECUTE ON FUNCTION decrement_following_count TO authenticated, anon;

-- Ensure create_notification is callable from API
GRANT EXECUTE ON FUNCTION create_notification TO authenticated, anon;

-- Ensure send_message is callable from API
GRANT EXECUTE ON FUNCTION send_message TO authenticated, anon;

-- 2. Relax can_dm to allow any authenticated user to message (no mutual follow required)
CREATE OR REPLACE FUNCTION public.can_dm(target_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN false; END IF;
  IF v_user_id = target_user_id THEN RETURN false; END IF;

  -- Any authenticated user can DM (no mutual follow requirement)
  RETURN true;
END;
$$;
