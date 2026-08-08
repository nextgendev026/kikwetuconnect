-- Fix quiz progress + result persistence.
--
-- Root cause 1: quiz_attempts inserts rolled back because the AFTER INSERT
-- trigger handle_quiz_completion (and its badge helper check_and_award_badges)
-- ran as the invoking authenticated role, but they write to heshima_earnings /
-- user_badges whose only INSERT policies are RPC-only denials
-- (he_insert_rpc_only / ub_insert_rpc_only WITH CHECK (false)). The write raised
-- an error, so the entire attempt was rolled back — results were never saved,
-- heshima never awarded, leaderboard/stats never updated.
-- Fix: run them SECURITY DEFINER (like update_heshima_rating) and guard against
-- NULL quiz_id.
--
-- Root cause 2: Random AI quizzes submitted quiz_id = 'random' (invalid uuid),
-- failing before the trigger even ran. quiz_id is now nullable so ephemeral
-- random attempts can persist their score.
--
-- Root cause 3: quiz_attempts RLS only allowed reading own attempts, so the
-- leaderboard query (which reads everyone's scores) returned only the caller.

-- ====== 1. handle_quiz_completion: SECURITY DEFINER + NULL-safe ======
CREATE OR REPLACE FUNCTION public.handle_quiz_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reward integer;
BEGIN
  v_reward := 10;
  IF NEW.quiz_id IS NOT NULL THEN
    SELECT COALESCE(quizzes.heshima_reward, 10) INTO v_reward
    FROM public.quizzes WHERE id = NEW.quiz_id;
    v_reward := COALESCE(v_reward, 10);
  END IF;

  UPDATE public.profiles SET
    heshima_rating = LEAST(COALESCE(heshima_rating, 0) + v_reward, 5000),
    heshima_balance = LEAST(COALESCE(heshima_balance, 0) + v_reward, 5000),
    quizzes_completed = COALESCE(quizzes_completed, 0) + 1,
    total_contributions = COALESCE(total_contributions, 0) + v_reward
  WHERE id = NEW.user_id;

  INSERT INTO public.heshima_earnings (user_id, amount, balance_after, source_type, source_id, description)
  SELECT NEW.user_id, v_reward, COALESCE(heshima_rating, 0), 'quiz_completion', NEW.quiz_id::text, 'Completed quiz'
  FROM public.profiles WHERE id = NEW.user_id;

  PERFORM public.check_and_award_badges(NEW.user_id);
  RETURN NEW;
END;
$$;

-- ====== 2. check_and_award_badges: SECURITY DEFINER ======
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b RECORD;
  user_heshima integer;
  user_quizzes integer;
  user_posts integer;
  user_answers integer;
  user_streak integer;
  user_sessions integer;
BEGIN
  SELECT heshima_rating, quizzes_completed, streak_days INTO user_heshima, user_quizzes, user_streak
  FROM profiles WHERE id = p_user_id;
  SELECT count(*) INTO user_posts FROM posts WHERE user_id = p_user_id;
  SELECT count(*) INTO user_answers FROM answers WHERE user_id = p_user_id;
  SELECT count(*) INTO user_sessions FROM student_sessions WHERE expert_id = p_user_id AND status = 'completed';

  FOR b IN SELECT * FROM badges LOOP
    IF b.requirement_type = 'heshima_points'
       AND b.requirement_value BETWEEN 100 AND 5000
       AND b.requirement_value % 100 = 0 THEN
      CONTINUE;
    END IF;
    IF EXISTS (SELECT 1 FROM user_badges WHERE user_id = p_user_id AND badge_id = b.id) THEN
      CONTINUE;
    END IF;
    CASE b.requirement_type
      WHEN 'heshima_points' THEN
        IF user_heshima >= b.requirement_value THEN
          INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, b.id);
          INSERT INTO heshima_earnings (user_id, amount, balance_after, source_type, source_id, description)
          VALUES (p_user_id, 50, user_heshima + 50, 'achievement_badge', b.id::text, 'Earned badge: ' || b.name);
          UPDATE profiles SET heshima_balance = LEAST(heshima_balance + 50, 5000) WHERE id = p_user_id;
        END IF;
      WHEN 'quizzes_completed' THEN
        IF user_quizzes >= b.requirement_value THEN
          INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, b.id);
        END IF;
      WHEN 'posts_created' THEN
        IF user_posts >= b.requirement_value THEN
          INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, b.id);
        END IF;
      WHEN 'answers_given' THEN
        IF user_answers >= b.requirement_value THEN
          INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, b.id);
        END IF;
      WHEN 'streak_days' THEN
        IF user_streak >= b.requirement_value THEN
          INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, b.id);
        END IF;
      WHEN 'sessions_completed' THEN
        IF user_sessions >= b.requirement_value THEN
          INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, b.id);
        END IF;
    END CASE;
  END LOOP;

  PERFORM public.award_heshima_milestone_badges(p_user_id);
END;
$$;

-- ====== 3. Allow ephemeral (random/AI) quiz attempts ======
ALTER TABLE public.quiz_attempts ALTER COLUMN quiz_id DROP NOT NULL;

-- ====== 4. Leaderboard: authenticated users may read all attempts' scores ======
DROP POLICY IF EXISTS "Authenticated can read attempts" ON public.quiz_attempts;
CREATE POLICY "Authenticated can read attempts" ON public.quiz_attempts
  FOR SELECT USING (auth.role() = 'authenticated');

-- ====== 5. quiz_progress upsert must pass the UPDATE policy's WITH CHECK ======
-- INSERT ... ON CONFLICT DO UPDATE (used by the client for real-time saves)
-- is evaluated against both policies; without a WITH CHECK the update branch
-- is denied and per-answer progress never persisted.
DROP POLICY IF EXISTS qp_update_own ON public.quiz_progress;
CREATE POLICY qp_update_own ON public.quiz_progress
  FOR UPDATE USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

NOTIFY pgrst, 'reload schema';
