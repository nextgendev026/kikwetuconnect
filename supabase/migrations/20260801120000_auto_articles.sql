-- Auto-categorize long-form text posts as articles (>100 words)

CREATE OR REPLACE FUNCTION public.categorize_post_type()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_words integer;
BEGIN
  IF NEW.post_type IN ('baraza', 'article') THEN
    v_words := COALESCE(array_length(regexp_split_to_array(trim(NEW.content), '\s+'), 1), 0);
    IF v_words > 100 THEN
      NEW.post_type := 'article';
      NEW.category := 'Article';
    ELSE
      NEW.post_type := 'baraza';
      NEW.category := 'Post';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_posts_article_categorize ON public.posts;
CREATE TRIGGER tr_posts_article_categorize
  BEFORE INSERT OR UPDATE OF content, post_type, category ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.categorize_post_type();

-- Backfill existing text posts so long-form posts become articles
UPDATE public.posts
SET post_type = CASE
      WHEN COALESCE(array_length(regexp_split_to_array(trim(content), '\s+'), 1), 0) > 100 THEN 'article'
      ELSE 'baraza'
    END,
    category = CASE
      WHEN COALESCE(array_length(regexp_split_to_array(trim(content), '\s+'), 1), 0) > 100 THEN 'Article'
      ELSE 'Post'
    END
WHERE post_type IN ('baraza', 'article');
