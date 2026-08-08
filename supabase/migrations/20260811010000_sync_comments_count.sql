-- ============================================================
-- 20260811010000 — keep posts.comments_count in sync
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_post_comments_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.posts
    SET comments_count = GREATEST(comments_count - 1, 0),
        updated_at = now()
    WHERE id = OLD.post_id;
  ELSE
    UPDATE public.posts
    SET comments_count = comments_count + 1,
        updated_at = now()
    WHERE id = NEW.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS tr_comments_sync_count ON public.comments;
CREATE TRIGGER tr_comments_sync_count
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_post_comments_count();

GRANT EXECUTE ON FUNCTION public.sync_post_comments_count() TO postgres, service_role;

notify pgrst, 'reload schema';