-- Fix runtime errors observed in the browser console:
--   1. quiz_attempts insert -> 400 "column reference heshima_reward is ambiguous"
--   2. nyumba_kumi_saved select -> 404 (table never created)
--   3. user_typing upsert -> 403 (missing UPDATE policy; upsert requires it)
--   4. message_reactions upsert -> may 403 for same reason
--   5. send_message RPC -> 400 (defensive recreation with current signature)

-- ====== 1. Fix handle_quiz_completion ambiguity ======
-- The local variable heshima_reward collides with quizzes.heshima_reward column.
CREATE OR REPLACE FUNCTION public.handle_quiz_completion() RETURNS trigger AS $$
DECLARE
  heshima_reward integer;
BEGIN
  SELECT COALESCE(quizzes.heshima_reward, 10) INTO heshima_reward FROM public.quizzes WHERE id = NEW.quiz_id;

  UPDATE public.profiles SET
    heshima_rating = LEAST(heshima_rating + heshima_reward, 5000),
    heshima_balance = LEAST(heshima_balance + heshima_reward, 5000),
    quizzes_completed = quizzes_completed + 1,
    total_contributions = total_contributions + heshima_reward
  WHERE id = NEW.user_id;

  INSERT INTO public.heshima_earnings (user_id, amount, balance_after, source_type, source_id, description)
  SELECT NEW.user_id, heshima_reward, heshima_rating + heshima_reward, 'quiz_completion', NEW.quiz_id::text, 'Completed quiz'
  FROM public.profiles WHERE id = NEW.user_id;

  PERFORM public.check_and_award_badges(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_quiz_completed ON public.quiz_attempts;
CREATE TRIGGER on_quiz_completed
  AFTER INSERT ON public.quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION public.handle_quiz_completion();

-- ====== 2. Create nyumba_kumi_saved table (referenced by app, never created) ======
CREATE TABLE IF NOT EXISTS public.nyumba_kumi_saved (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  alert_id uuid REFERENCES public.nyumba_kumi_alerts(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, alert_id)
);

ALTER TABLE public.nyumba_kumi_saved ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nks_select_own ON public.nyumba_kumi_saved;
CREATE POLICY nks_select_own ON public.nyumba_kumi_saved
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS nks_insert_own ON public.nyumba_kumi_saved;
CREATE POLICY nks_insert_own ON public.nyumba_kumi_saved
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS nks_delete_own ON public.nyumba_kumi_saved;
CREATE POLICY nks_delete_own ON public.nyumba_kumi_saved
  FOR DELETE USING (user_id = auth.uid());

-- ====== 3. user_typing: add UPDATE policy so upsert (on_conflict) works ======
DROP POLICY IF EXISTS "Users can update their own typing status" ON public.user_typing;
CREATE POLICY "Users can update their own typing status" ON public.user_typing
  FOR UPDATE USING (user_id = auth.uid());

-- ====== 4. message_reactions: add UPDATE policy for upsert (message_id,user_id,emoji) ======
DROP POLICY IF EXISTS "Users can update their own reactions" ON public.message_reactions;
CREATE POLICY "Users can update their own reactions" ON public.message_reactions
  FOR UPDATE USING (user_id = auth.uid());

-- ====== 5. send_message: ensure current signature (p_reply_to) is deployed ======
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

  INSERT INTO public.messages (conversation_id, sender_id, content, message_type, metadata, reply_to)
  VALUES (p_conversation_id, v_user_id, v_display_content, p_message_type, p_metadata, p_reply_to)
  RETURNING id, created_at INTO v_msg_id, v_created_at;

  UPDATE public.conversations
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
