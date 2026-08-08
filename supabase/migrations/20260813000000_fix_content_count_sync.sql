-- ============================================================
-- 20260813000000 — make content counters survive RLS + votes sync
-- Root cause:
--   * sync_post_comments_count() ran as SECURITY INVOKER, so its
--     UPDATE on posts was silently blocked by posts RLS when the
--     caller wasn't the post owner → comments inserted but the
--     counter never moved.
--   * posts.upvotes_count / answers.upvotes_count /
--     comments.upvotes_count were never maintained from the votes
--     table → upvotes recorded but the displayed count never moved.
-- Fix: SECURITY DEFINER triggers that recompute the affected row's
-- count from its source table (idempotent, RLS-proof).
-- ============================================================

-- ---------- 1. Comments count ----------
CREATE OR REPLACE FUNCTION public.sync_post_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.posts
    SET comments_count = (
      SELECT count(*) FROM public.comments c WHERE c.post_id = OLD.post_id
    )
    WHERE id = OLD.post_id;
  ELSE
    UPDATE public.posts
    SET comments_count = (
      SELECT count(*) FROM public.comments c WHERE c.post_id = NEW.post_id
    )
    WHERE id = NEW.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tr_comments_sync_count ON public.comments;
CREATE TRIGGER tr_comments_sync_count
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_post_comments_count();

-- ---------- 2. Answers count ----------
CREATE OR REPLACE FUNCTION public.sync_post_answers_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.posts
    SET answers_count = GREATEST((
      SELECT count(*) FROM public.answers a WHERE a.post_id = OLD.post_id
    ), 0)
    WHERE id = OLD.post_id;
  ELSE
    UPDATE public.posts
    SET answers_count = (
      SELECT count(*) FROM public.answers a WHERE a.post_id = NEW.post_id
    )
    WHERE id = NEW.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tr_answers_sync_count ON public.answers;
CREATE TRIGGER tr_answers_sync_count
  AFTER INSERT OR DELETE ON public.answers
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_post_answers_count();

-- ---------- 3. Vote counts (posts / comments / answers) ----------
CREATE OR REPLACE FUNCTION public.sync_vote_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id uuid;
  v_new_type text;
  v_old_id uuid;
  v_old_type text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old_id := OLD.target_id;
    v_old_type := OLD.target_type;
  ELSE
    v_new_id := NEW.target_id;
    v_new_type := NEW.target_type;
  END IF;

  IF v_new_type IS NOT NULL THEN
    IF v_new_type = 'post' THEN
      UPDATE public.posts
      SET upvotes_count = (
        SELECT count(*) FROM public.votes v
        WHERE v.target_type = 'post' AND v.target_id = v_new_id AND v.vote_type = 1
      )
      WHERE id = v_new_id;
    ELSIF v_new_type = 'comment' THEN
      UPDATE public.comments
      SET upvotes_count = (
        SELECT count(*) FROM public.votes v
        WHERE v.target_type = 'comment' AND v.target_id = v_new_id AND v.vote_type = 1
      )
      WHERE id = v_new_id;
    ELSIF v_new_type = 'answer' THEN
      UPDATE public.answers
      SET upvotes_count = (
        SELECT count(*) FROM public.votes v
        WHERE v.target_type = 'answer' AND v.target_id = v_new_id AND v.vote_type = 1
      )
      WHERE id = v_new_id;
    END IF;
  END IF;

  -- A vote moved to another target: refresh the old target too.
  IF TG_OP = 'UPDATE' AND (v_old_id IS DISTINCT FROM v_new_id OR v_old_type IS DISTINCT FROM v_new_type) THEN
    IF v_old_type = 'post' THEN
      UPDATE public.posts
      SET upvotes_count = (
        SELECT count(*) FROM public.votes v
        WHERE v.target_type = 'post' AND v.target_id = v_old_id AND v.vote_type = 1
      )
      WHERE id = v_old_id;
    ELSIF v_old_type = 'comment' THEN
      UPDATE public.comments
      SET upvotes_count = (
        SELECT count(*) FROM public.votes v
        WHERE v.target_type = 'comment' AND v.target_id = v_old_id AND v.vote_type = 1
      )
      WHERE id = v_old_id;
    ELSIF v_old_type = 'answer' THEN
      UPDATE public.answers
      SET upvotes_count = (
        SELECT count(*) FROM public.votes v
        WHERE v.target_type = 'answer' AND v.target_id = v_old_id AND v.vote_type = 1
      )
      WHERE id = v_old_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tr_votes_sync_count ON public.votes;
CREATE TRIGGER tr_votes_sync_count
  AFTER INSERT OR DELETE OR UPDATE OF vote_type, target_type, target_id ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_vote_counts();

GRANT EXECUTE ON FUNCTION public.sync_post_comments_count() TO postgres, service_role, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.sync_post_answers_count() TO postgres, service_role, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.sync_vote_counts() TO postgres, service_role, authenticated, anon;

-- ---------- 4. Backfill ----------
UPDATE public.posts p SET
  comments_count = (SELECT count(*) FROM public.comments c WHERE c.post_id = p.id),
  answers_count  = (SELECT count(*) FROM public.answers  a WHERE a.post_id = p.id),
  upvotes_count  = (SELECT count(*) FROM public.votes v WHERE v.target_type = 'post' AND v.target_id = p.id AND v.vote_type = 1);

UPDATE public.comments c SET
  upvotes_count = (SELECT count(*) FROM public.votes v WHERE v.target_type = 'comment' AND v.target_id = c.id AND v.vote_type = 1);

UPDATE public.answers a SET
  upvotes_count = (SELECT count(*) FROM public.votes v WHERE v.target_type = 'answer' AND v.target_id = a.id AND v.vote_type = 1);

notify pgrst, 'reload schema';