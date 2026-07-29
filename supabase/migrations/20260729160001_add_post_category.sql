ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Post';

CREATE INDEX IF NOT EXISTS posts_category_idx ON public.posts(category, created_at DESC);
