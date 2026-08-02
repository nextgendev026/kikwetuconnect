-- Fix send_message: use NULLIF so media placeholders apply for empty content,
-- and ensure reply_to column is properly linked.

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
    v_display_content := COALESCE(NULLIF(trim(p_content), ''), CASE p_message_type WHEN 'image' THEN '📷 Image' WHEN 'file' THEN '📎 File' WHEN 'voice' THEN '🎵 Voice' ELSE 'Media' END);
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

GRANT EXECUTE ON FUNCTION public.send_message(uuid, text, text, jsonb, uuid) TO authenticated, anon;

NOTIFY pgrst, 'reload schema';