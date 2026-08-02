-- Auto-generate badges at every +100 Heshima milestone, up to the 5000 cap.
-- Existing curated badges (100, 500, 1000) are preserved; the milestone engine
-- only fills in the gaps (200, 300, ..., 4900) and awards all reached milestones.

-- ====== 1. Function: ensure milestone badge rows exist ======
CREATE OR REPLACE FUNCTION public.ensure_heshima_milestone_badges() RETURNS void AS $$
BEGIN
  INSERT INTO public.badges (name, description, icon, requirement_type, requirement_value)
  SELECT
    'Heshima ' || gs,
    'Reach ' || gs || ' Heshima rating',
    CASE WHEN gs >= 1000 THEN '👑' WHEN gs >= 500 THEN '🏅' ELSE '⭐' END,
    'heshima_points',
    gs
  FROM generate_series(100, 5000, 100) gs
  WHERE NOT EXISTS (
    SELECT 1 FROM public.badges b
    WHERE b.requirement_type = 'heshima_points' AND b.requirement_value = gs
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====== 2. Function: award any reached heshima milestones ======
CREATE OR REPLACE FUNCTION public.award_heshima_milestone_badges(p_user_id uuid) RETURNS void AS $$
DECLARE
  v_rating integer;
BEGIN
  SELECT heshima_rating INTO v_rating FROM public.profiles WHERE id = p_user_id;
  IF v_rating IS NULL THEN RETURN; END IF;

  PERFORM public.ensure_heshima_milestone_badges();

  INSERT INTO public.user_badges (user_id, badge_id)
  SELECT p_user_id, b.id
  FROM public.badges b
  WHERE b.requirement_type = 'heshima_points'
    AND b.requirement_value BETWEEN 100 AND 5000
    AND b.requirement_value % 100 = 0
    AND b.requirement_value <= v_rating
    AND NOT EXISTS (
      SELECT 1 FROM public.user_badges ub
      WHERE ub.user_id = p_user_id AND ub.badge_id = b.id
    )
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====== 3. Rewrite check_and_award_badges: skip milestone rows, award them separately ======
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id uuid) RETURNS void AS $$
DECLARE
  b RECORD;
  user_heshima integer;
  user_quizzes integer;
  user_posts integer;
  user_answers integer;
  user_streak integer;
  user_sessions integer;
BEGIN
  SELECT heshima_rating, quizzes_completed, streak_days INTO user_heshima, user_quizzes, user_streak FROM profiles WHERE id = p_user_id;
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
$$ LANGUAGE plpgsql;

-- ====== 4. Rewrite vote trigger to award milestone badges on heshima changes ======
CREATE OR REPLACE FUNCTION public.update_heshima_rating() RETURNS trigger AS $$
DECLARE
  target_author_id uuid;
  current_rating integer;
BEGIN
  IF NEW.target_type = 'post' THEN
    SELECT user_id INTO target_author_id FROM public.posts WHERE id = NEW.target_id;
  ELSIF NEW.target_type = 'answer' THEN
    SELECT user_id INTO target_author_id FROM public.answers WHERE id = NEW.target_id;
  END IF;

  IF target_author_id IS NULL THEN RETURN NULL; END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 1 THEN
      UPDATE profiles SET
        heshima_rating = LEAST(heshima_rating + 1, 5000),
        heshima_balance = LEAST(heshima_balance + 1, 5000),
        total_contributions = total_contributions + 1
      WHERE id = target_author_id
      RETURNING heshima_rating INTO current_rating;
      INSERT INTO heshima_earnings (user_id, amount, balance_after, source_type, source_id, description)
      VALUES (target_author_id, 1, current_rating, 'upvote', NEW.target_id::text, 'Your post received an upvote');
      PERFORM public.check_expert_graduation(target_author_id);
      PERFORM public.award_heshima_milestone_badges(target_author_id);
    ELSIF NEW.vote_type = -1 THEN
      UPDATE profiles SET heshima_rating = GREATEST(heshima_rating - 1, 0) WHERE id = target_author_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 1 THEN
      UPDATE profiles SET
        heshima_rating = GREATEST(heshima_rating - 1, 0),
        total_contributions = GREATEST(total_contributions - 1, 0)
      WHERE id = target_author_id;
    ELSIF OLD.vote_type = -1 THEN
      UPDATE profiles SET heshima_rating = LEAST(heshima_rating + 1, 5000) WHERE id = target_author_id;
      PERFORM public.award_heshima_milestone_badges(target_author_id);
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is still wired (recreate idempotently)
DROP TRIGGER IF EXISTS heshima_rating_trigger ON public.votes;
CREATE TRIGGER heshima_rating_trigger
  AFTER INSERT OR DELETE ON public.votes
  FOR EACH ROW EXECUTE FUNCTION public.update_heshima_rating();

-- ====== 5. Backfill: award milestone badges for all existing users ======
DO $$
DECLARE
  r RECORD;
BEGIN
  PERFORM public.ensure_heshima_milestone_badges();
  FOR r IN SELECT id FROM public.profiles LOOP
    PERFORM public.award_heshima_milestone_badges(r.id);
  END LOOP;
END $$;
