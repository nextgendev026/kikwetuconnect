-- Enhance conversations with type/title, extend messages, add toggle_save RPC

-- 1. Add type/title to conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS type text DEFAULT 'dm' CHECK (type IN ('dm', 'group', 'session', 'support'));
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. Extend messages with message_type, metadata, reply_to
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'voice', 'system'));
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to uuid REFERENCES messages(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS status text DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read'));

-- 3. Indexes for conversation queries
CREATE INDEX IF NOT EXISTS messages_conversation_id_created_at_idx ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON messages(sender_id);
CREATE INDEX IF NOT EXISTS conversations_last_message_at_idx ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS conversation_participants_user_id_idx ON conversation_participants(user_id, last_read_at);

-- 4. toggle_save RPC — idempotent, race-safe, returns canonical state + count
CREATE OR REPLACE FUNCTION public.toggle_save(p_target_type text, p_target_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
  v_deleted boolean := false;
  v_total integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.saves
  WHERE user_id = v_user_id AND target_type = p_target_type AND target_id = p_target_id;

  IF FOUND THEN
    v_deleted := true;
  ELSE
    BEGIN
      INSERT INTO public.saves (user_id, target_type, target_id)
      VALUES (v_user_id, p_target_type, p_target_id);
    EXCEPTION WHEN unique_violation THEN
      v_deleted := true;
    END;
  END IF;

  SELECT count(*) INTO v_total
  FROM public.saves
  WHERE target_type = p_target_type AND target_id = p_target_id;

  RETURN jsonb_build_object('saved', NOT v_deleted, 'total', v_total);
END;
$$;

-- 5. RPC to check if a user can DM another (mutual follow or session relation)
CREATE OR REPLACE FUNCTION public.can_dm(target_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN false; END IF;
  IF v_user_id = target_user_id THEN RETURN false; END IF;

  -- Mutual follow check
  IF EXISTS (
    SELECT 1 FROM public.follows f1
    JOIN public.follows f2 ON f1.following_id = f2.follower_id AND f2.following_id = f1.follower_id
    WHERE f1.follower_id = v_user_id AND f1.following_id = target_user_id
  ) THEN
    RETURN true;
  END IF;

  -- Session participant check
  IF EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE (s.student_id = v_user_id AND s.professional_id = target_user_id)
       OR (s.student_id = target_user_id AND s.professional_id = v_user_id)
  ) THEN
    RETURN true;
  END IF;

  -- Professional open DMs (target is a professional and has opted in)
  IF EXISTS (
    SELECT 1 FROM public.professionals p WHERE p.user_id = target_user_id AND p.status = 'approved'
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 6. RPC to create a conversation (with DM access check)
CREATE OR REPLACE FUNCTION public.create_conversation(
  p_type text DEFAULT 'dm',
  p_title text DEFAULT NULL,
  p_member_ids uuid[] DEFAULT '{}'
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
  v_conv_id uuid;
  v_member uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- For DM, check can_dm
  IF p_type = 'dm' THEN
    IF array_length(p_member_ids, 1) != 1 THEN
      RAISE EXCEPTION 'DM requires exactly one other member';
    END IF;
    IF NOT public.can_dm(p_member_ids[1]) THEN
      RAISE EXCEPTION 'Cannot message this user';
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

-- 7. RPC to send a message (validates membership)
CREATE OR REPLACE FUNCTION public.send_message(
  p_conversation_id uuid,
  p_content text,
  p_message_type text DEFAULT 'text',
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_reply_to uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
  v_msg_id uuid;
  v_created_at timestamptz;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Not a member of this conversation';
  END IF;

  IF p_content IS NULL OR trim(p_content) = '' THEN
    RAISE EXCEPTION 'Message content cannot be empty';
  END IF;

  INSERT INTO messages (conversation_id, sender_id, content, message_type, metadata, reply_to)
  VALUES (p_conversation_id, v_user_id, trim(p_content), p_message_type, p_metadata, p_reply_to)
  RETURNING id, created_at INTO v_msg_id, v_created_at;

  UPDATE conversations
  SET last_message = left(trim(p_content), 100), last_message_at = v_created_at
  WHERE id = p_conversation_id;

  RETURN jsonb_build_object(
    'id', v_msg_id,
    'created_at', v_created_at
  );
END;
$$;

-- 8. RPC to mark messages as read in a conversation
CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  UPDATE conversation_participants
  SET last_read_at = now()
  WHERE conversation_id = p_conversation_id AND user_id = v_user_id;

  UPDATE messages
  SET status = 'read', read_at = now()
  WHERE conversation_id = p_conversation_id
    AND sender_id != v_user_id
    AND status != 'read';
END;
$$;

-- 9. RPC to get unread message count
CREATE OR REPLACE FUNCTION public.unread_message_count()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
  v_count integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN 0; END IF;

  SELECT count(*) INTO v_count
  FROM messages m
  JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id AND cp.user_id = v_user_id
  WHERE m.sender_id != v_user_id
    AND (m.created_at > cp.last_read_at OR cp.last_read_at IS NULL);

  RETURN v_count;
END;
$$;
