-- Quiz save/bookmark, in-progress resume, and persistence of AI-generated quizzes.

-- ====== 1. Saved quizzes (bookmarks) ======
CREATE TABLE IF NOT EXISTS public.saved_quizzes (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, quiz_id)
);

ALTER TABLE public.saved_quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY sq_read_own ON public.saved_quizzes
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY sq_insert_own ON public.saved_quizzes
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY sq_delete_own ON public.saved_quizzes
  FOR DELETE USING (user_id = (select auth.uid()));

-- ====== 2. In-progress quiz resume ======
CREATE TABLE IF NOT EXISTS public.quiz_progress (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  current_question integer DEFAULT 0,
  selected_answers jsonb DEFAULT '[]'::jsonb,
  started_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, quiz_id)
);

ALTER TABLE public.quiz_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY qp_read_own ON public.quiz_progress
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY qp_upsert_own ON public.quiz_progress
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY qp_update_own ON public.quiz_progress
  FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY qp_delete_own ON public.quiz_progress
  FOR DELETE USING (user_id = (select auth.uid()));

-- ====== 3. RPC: persist an AI-generated quiz (security definer, bypasses admin-only insert RLS) ======
CREATE OR REPLACE FUNCTION public.save_ai_quiz(
  p_title text,
  p_description text,
  p_category text,
  p_difficulty text DEFAULT 'medium',
  p_questions jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_quiz_id uuid;
  q RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  INSERT INTO quizzes (title, slug, description, category, difficulty, question_count, estimated_time_minutes, heshima_reward, created_by)
  VALUES (
    p_title,
    'ai-' || replace(lower(p_title), ' ', '-') || '-' || substr(md5(random()::text), 1, 8),
    COALESCE(p_description, 'AI-generated quiz'),
    p_category,
    p_difficulty,
    0,
    5,
    10,
    v_user_id
  )
  RETURNING id INTO v_quiz_id;

  FOR q IN SELECT value FROM jsonb_array_elements(p_questions) AS value
  LOOP
    INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation)
    VALUES (
      v_quiz_id,
      q.value->>'question',
      ARRAY(SELECT jsonb_array_elements_text(q.value->'options')),
      (q.value->>'correct_index')::integer,
      q.value->>'explanation'
    );
  END LOOP;

  UPDATE quizzes SET question_count = (
    SELECT count(*) FROM quiz_questions WHERE quiz_id = v_quiz_id
  ) WHERE id = v_quiz_id;

  RETURN v_quiz_id;
END;
$$;

-- ====== 4. Realtime for live progress + saved state ======
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE saved_quizzes;

GRANT EXECUTE ON FUNCTION public.save_ai_quiz(text, text, text, text, jsonb) TO authenticated, anon;

NOTIFY pgrst, 'reload schema';
