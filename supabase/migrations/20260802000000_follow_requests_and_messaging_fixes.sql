-- Follow Requests System
-- ============================================================

-- 1. Create follow_requests table
CREATE TABLE IF NOT EXISTS public.follow_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  target_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(requester_id, target_id)
);

CREATE INDEX IF NOT EXISTS idx_follow_requests_target ON public.follow_requests(target_id, status);
CREATE INDEX IF NOT EXISTS idx_follow_requests_requester ON public.follow_requests(requester_id, status);

-- Add to realtime
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'follow_requests') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE follow_requests;
  END IF;
END $$;

-- RLS policies for follow_requests
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read for all users' AND tablename = 'follow_requests') THEN
    CREATE POLICY "Enable read for all users" ON follow_requests FOR SELECT USING (true);
    CREATE POLICY "Enable insert for authenticated users" ON follow_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);
    CREATE POLICY "Enable update for target user" ON follow_requests FOR UPDATE USING (auth.uid() = target_id);
  END IF;
END $$;

-- 2. Function to create follow request (with notification)
CREATE OR REPLACE FUNCTION public.create_follow_request(
  p_target_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_request_id uuid;
  v_existing_follow boolean;
  v_existing_request jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF v_user_id = p_target_id THEN
    RAISE EXCEPTION 'Cannot follow yourself';
  END IF;

  -- Check if already following
  SELECT EXISTS(
    SELECT 1 FROM public.follows
    WHERE follower_id = v_user_id AND following_id = p_target_id
  ) INTO v_existing_follow;
  
  IF v_existing_follow THEN
    RETURN jsonb_build_object('status', 'already_following', 'message', 'Already following this user');
  END IF;

  -- Check for existing pending request
  SELECT jsonb_build_object('id', id, 'status', status) INTO v_existing_request
  FROM public.follow_requests
  WHERE requester_id = v_user_id AND target_id = p_target_id AND status = 'pending'
  LIMIT 1;

  IF v_existing_request IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'request_pending', 'message', 'Follow request already sent', 'request', v_existing_request);
  END IF;

  -- Create follow request
  INSERT INTO public.follow_requests (requester_id, target_id, status)
  VALUES (v_user_id, p_target_id, 'pending')
  RETURNING id INTO v_request_id;

  -- Create notification for target user
  PERFORM public.create_notification(
    p_user_id := p_target_id,
    p_actor_id := v_user_id,
    p_type := 'follow_request',
    p_target_id := v_request_id,
    p_target_type := 'follow_request',
    p_content := 'wants to follow you',
    p_title := 'New follow request',
    p_body := 'Someone wants to follow you'
  );

  RETURN jsonb_build_object('status', 'request_sent', 'request_id', v_request_id, 'message', 'Follow request sent');
END;
$$;

-- 3. Function to accept follow request
CREATE OR REPLACE FUNCTION public.accept_follow_request(
  p_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_request RECORD;
  v_notif_err text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the request (must be target user)
  SELECT * INTO v_request
  FROM public.follow_requests
  WHERE id = p_request_id AND target_id = v_user_id AND status = 'pending'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;

  -- Create the follow relationship
  INSERT INTO public.follows (follower_id, following_id)
  VALUES (v_request.requester_id, v_request.target_id)
  ON CONFLICT (follower_id, following_id) DO NOTHING;

  -- Update follower/following counts
  PERFORM public.increment_follower_count(v_request.target_id);
  PERFORM public.increment_following_count(v_request.requester_id);

  -- Update request status
  UPDATE public.follow_requests
  SET status = 'accepted', updated_at = now()
  WHERE id = p_request_id;

  -- Create notification for requester
  PERFORM public.create_notification(
    p_user_id := v_request.requester_id,
    p_actor_id := v_user_id,
    p_type := 'follow_accepted',
    p_target_id := v_user_id,
    p_target_type := 'profile',
    p_content := 'accepted your follow request',
    p_title := 'Follow request accepted',
    p_body := 'Your follow request was accepted'
  );

  RETURN jsonb_build_object('status', 'accepted', 'message', 'Follow request accepted');
END;
$$;

-- 4. Function to decline follow request
CREATE OR REPLACE FUNCTION public.decline_follow_request(
  p_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_request RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the request (must be target user)
  SELECT * INTO v_request
  FROM public.follow_requests
  WHERE id = p_request_id AND target_id = v_user_id AND status = 'pending'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;

  -- Update request status
  UPDATE public.follow_requests
  SET status = 'declined', updated_at = now()
  WHERE id = p_request_id;

  -- Create notification for requester (optional, could be silent)
  PERFORM public.create_notification(
    p_user_id := v_request.requester_id,
    p_actor_id := v_user_id,
    p_type := 'follow_declined',
    p_target_id := v_user_id,
    p_target_type := 'profile',
    p_content := 'declined your follow request',
    p_title := 'Follow request declined',
    p_body := 'Your follow request was declined'
  );

  RETURN jsonb_build_object('status', 'declined', 'message', 'Follow request declined');
END;
$$;

-- 5. Function to cancel follow request (by requester)
CREATE OR REPLACE FUNCTION public.cancel_follow_request(
  p_target_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_deleted boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.follow_requests
  WHERE requester_id = v_user_id AND target_id = p_target_id AND status = 'pending';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF NOT v_deleted THEN
    RETURN jsonb_build_object('status', 'not_found', 'message', 'No pending request to cancel');
  END IF;

  RETURN jsonb_build_object('status', 'cancelled', 'message', 'Follow request cancelled');
END;
$$;

-- 6. Function to get pending follow requests for current user
CREATE OR REPLACE FUNCTION public.get_pending_follow_requests()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_requests jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(fr) ORDER BY fr.created_at DESC), '[]'::jsonb) INTO v_requests
  FROM (
    SELECT fr.id, fr.requester_id, fr.created_at,
           p.username, p.full_name, p.avatar_url
    FROM public.follow_requests fr
    JOIN public.profiles p ON p.id = fr.requester_id
    WHERE fr.target_id = v_user_id AND fr.status = 'pending'
  ) fr;

  RETURN jsonb_build_object('requests', v_requests);
END;
$$;

-- 7. Function to get sent follow requests for current user
CREATE OR REPLACE FUNCTION public.get_sent_follow_requests()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_requests jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(fr) ORDER BY fr.created_at DESC), '[]'::jsonb) INTO v_requests
  FROM (
    SELECT fr.id, fr.target_id, fr.status, fr.created_at,
           p.username, p.full_name, p.avatar_url
    FROM public.follow_requests fr
    JOIN public.profiles p ON p.id = fr.target_id
    WHERE fr.requester_id = v_user_id
  ) fr;

  RETURN jsonb_build_object('requests', v_requests);
END;
$$;

-- Messaging System Fixes
-- ============================================================

-- 8. Fix send_message RPC to allow empty content for media messages
DROP FUNCTION IF EXISTS public.send_message(uuid, text, text, jsonb, uuid);

CREATE OR REPLACE FUNCTION public.send_message(
  p_conversation_id uuid,
  p_content text,
  p_message_type text DEFAULT 'text',
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_reply_to uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_msg_id uuid;
  v_created_at timestamptz;
  v_display_content text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Not a member of this conversation';
  END IF;

  -- For media messages, allow empty content if metadata has url
  IF p_message_type IN ('image', 'file', 'voice') THEN
    IF (p_content IS NULL OR trim(p_content) = '') AND (p_metadata->>'url' IS NULL OR p_metadata->>'url' = '') THEN
      RAISE EXCEPTION 'Media message requires content or file URL in metadata';
    END IF;
    v_display_content := COALESCE(trim(p_content), CASE p_message_type WHEN 'image' THEN '📷 Image' WHEN 'file' THEN '📎 File' WHEN 'voice' THEN '🎵 Voice' ELSE 'Media' END);
  ELSE
    IF p_content IS NULL OR trim(p_content) = '' THEN
      RAISE EXCEPTION 'Message content cannot be empty';
    END IF;
    v_display_content := trim(p_content);
  END IF;

  INSERT INTO messages (conversation_id, sender_id, content, message_type, metadata, reply_to)
  VALUES (p_conversation_id, v_user_id, v_display_content, p_message_type, p_metadata, p_reply_to)
  RETURNING id, created_at INTO v_msg_id, v_created_at;

  UPDATE conversations
  SET last_message = left(v_display_content, 100), last_message_at = v_created_at
  WHERE id = p_conversation_id;

  RETURN jsonb_build_object(
    'id', v_msg_id,
    'created_at', v_created_at
  );
END;
$$;

-- 9. Fix create_conversation to be more permissive for DMs (allow messaging followers/following)
DROP FUNCTION IF EXISTS public.create_conversation(text, text, uuid[]);

CREATE OR REPLACE FUNCTION public.create_conversation(
  p_type text DEFAULT 'dm',
  p_title text DEFAULT NULL,
  p_member_ids uuid[] DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_conv_id uuid;
  v_member uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- For DM, check can_dm (mutual follow, session, or professional)
  IF p_type = 'dm' THEN
    IF array_length(p_member_ids, 1) != 1 THEN
      RAISE EXCEPTION 'DM requires exactly one other member';
    END IF;
    IF NOT public.can_dm(p_member_ids[1]) THEN
      RAISE EXCEPTION 'Cannot message this user. You must follow each other, have a session together, or the user must be a professional with open DMs.';
    END IF;

    -- Check for existing DM conversation
    SELECT cp.conversation_id INTO v_conv_id
    FROM conversation_participants cp
    WHERE cp.user_id = v_user_id
      AND cp.conversation_id IN (
        SELECT cp2.conversation_id
        FROM conversation_participants cp2
        WHERE cp2.user_id = p_member_ids[1]
      )
      AND cp.conversation_id IN (
        SELECT cp3.conversation_id
        FROM conversation_participants cp3
        GROUP BY cp3.conversation_id
        HAVING count(*) = 2
      )
    LIMIT 1;

    IF v_conv_id IS NOT NULL THEN RETURN v_conv_id; END IF;
  END IF;

  INSERT INTO conversations (type, title, created_by)
  VALUES (p_type, COALESCE(p_title, p_type), v_user_id)
  RETURNING id INTO v_conv_id;

  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES (v_conv_id, v_user_id);

  FOREACH v_member IN ARRAY p_member_ids
  LOOP
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (v_conv_id, v_member)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END LOOP;

  RETURN v_conv_id;
END;
$$;

-- 10. Add message status update trigger for real-time delivery receipts
DROP FUNCTION IF EXISTS public.update_message_status();
DROP TRIGGER IF EXISTS trigger_update_message_status ON public.messages;

CREATE OR REPLACE FUNCTION public.update_message_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update status to delivered when message is inserted (sent by sender)
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'delivered';
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_message_status
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_message_status();

-- 11. Add conversation participant count check for group creation
DROP FUNCTION IF EXISTS public.get_conversation_participants(uuid);

CREATE OR REPLACE FUNCTION public.get_conversation_participants(p_conversation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_participants jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Not a member of this conversation';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(cp)), '[]'::jsonb) INTO v_participants
  FROM (
    SELECT cp.user_id, p.username, p.full_name, p.avatar_url, cp.joined_at, cp.last_read_at
    FROM conversation_participants cp
    JOIN profiles p ON p.id = cp.user_id
    WHERE cp.conversation_id = p_conversation_id
  ) cp;

  RETURN jsonb_build_object('participants', v_participants);
END;
$$;

-- 12. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_follow_request(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.accept_follow_request(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.decline_follow_request(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.cancel_follow_request(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_pending_follow_requests() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_sent_follow_requests() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.send_message(uuid, text, text, jsonb, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.create_conversation(text, text, uuid[]) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_conversation_participants(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.update_message_status() TO authenticated, anon;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';