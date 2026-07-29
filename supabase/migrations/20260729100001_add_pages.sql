-- Pages: Facebook-style page entities for organizations, brands, public figures

-- 1. Pages table
CREATE TABLE IF NOT EXISTS public.pages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  category text NOT NULL DEFAULT 'General',
  description text NOT NULL DEFAULT '',
  cover_url text,
  avatar_url text,
  website text,
  phone text,
  email text,
  address text,
  is_verified boolean DEFAULT false,
  followers_count integer DEFAULT 0,
  posts_count integer DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Full-text search support
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS tsv tsvector;
CREATE INDEX IF NOT EXISTS pages_tsv_idx ON public.pages USING gin(tsv);
CREATE INDEX IF NOT EXISTS pages_category_idx ON public.pages(category);
CREATE INDEX IF NOT EXISTS pages_followers_idx ON public.pages(followers_count DESC);

CREATE OR REPLACE FUNCTION public.pages_tsv_trigger() RETURNS trigger AS $$
BEGIN
  NEW.tsv := to_tsvector('english', coalesce(NEW.name,'') || ' ' || coalesce(NEW.description,'') || ' ' || coalesce(NEW.category,''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pages_tsv_update ON public.pages;
CREATE TRIGGER pages_tsv_update BEFORE INSERT OR UPDATE ON public.pages
  FOR EACH ROW EXECUTE FUNCTION public.pages_tsv_trigger();

-- 2. Page admins with roles
CREATE TABLE IF NOT EXISTS public.page_admins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id uuid REFERENCES public.pages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'admin', 'editor', 'moderator', 'analyst')),
  added_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  added_at timestamptz DEFAULT now(),
  UNIQUE(page_id, user_id)
);

CREATE INDEX IF NOT EXISTS page_admins_page_idx ON public.page_admins(page_id);
CREATE INDEX IF NOT EXISTS page_admins_user_idx ON public.page_admins(user_id);

-- 3. Page followers
CREATE TABLE IF NOT EXISTS public.page_follows (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id uuid REFERENCES public.pages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(page_id, user_id)
);

CREATE INDEX IF NOT EXISTS page_follows_page_idx ON public.page_follows(page_id);
CREATE INDEX IF NOT EXISTS page_follows_user_idx ON public.page_follows(user_id);

-- 4. Add page_id to posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS page_id uuid REFERENCES public.pages(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS posts_page_id_idx ON public.posts(page_id, created_at DESC);

-- 5. Triggers for counters

-- Followers count trigger
CREATE OR REPLACE FUNCTION public.update_page_followers_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.pages SET followers_count = coalesce(followers_count, 0) + 1 WHERE id = NEW.page_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.pages SET followers_count = greatest(coalesce(followers_count, 0) - 1, 0) WHERE id = OLD.page_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS page_followers_count_trigger ON public.page_follows;
CREATE TRIGGER page_followers_count_trigger AFTER INSERT OR DELETE ON public.page_follows
  FOR EACH ROW EXECUTE FUNCTION public.update_page_followers_count();

-- Posts count trigger
CREATE OR REPLACE FUNCTION public.update_page_posts_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.page_id IS NOT NULL THEN
    UPDATE public.pages SET posts_count = coalesce(posts_count, 0) + 1 WHERE id = NEW.page_id;
  ELSIF TG_OP = 'DELETE' AND OLD.page_id IS NOT NULL THEN
    UPDATE public.pages SET posts_count = greatest(coalesce(posts_count, 0) - 1, 0) WHERE id = OLD.page_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.page_id IS DISTINCT FROM NEW.page_id THEN
    IF OLD.page_id IS NOT NULL THEN
      UPDATE public.pages SET posts_count = greatest(coalesce(posts_count, 0) - 1, 0) WHERE id = OLD.page_id;
    END IF;
    IF NEW.page_id IS NOT NULL THEN
      UPDATE public.pages SET posts_count = coalesce(posts_count, 0) + 1 WHERE id = NEW.page_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS page_posts_count_trigger ON public.posts;
CREATE TRIGGER page_posts_count_trigger AFTER INSERT OR DELETE OR UPDATE OF page_id ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_page_posts_count();

-- 6. RLS
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_follows ENABLE ROW LEVEL SECURITY;

-- Anyone can read pages
DROP POLICY IF EXISTS "Anyone can read pages" ON public.pages;
CREATE POLICY "Anyone can read pages" ON public.pages FOR SELECT USING (true);
-- Authenticated users can create pages
DROP POLICY IF EXISTS "Users can create pages" ON public.pages;
CREATE POLICY "Users can create pages" ON public.pages FOR INSERT WITH CHECK (auth.uid() = created_by);
-- Only owner/admin can update page
DROP POLICY IF EXISTS "Page admins can update" ON public.pages;
CREATE POLICY "Page admins can update" ON public.pages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.page_admins WHERE page_id = id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
);

-- Page admins: read own memberships
DROP POLICY IF EXISTS "Anyone can read page_admins" ON public.page_admins;
CREATE POLICY "Anyone can read page_admins" ON public.page_admins FOR SELECT USING (true);
-- Insert via server API only
DROP POLICY IF EXISTS "Admins can manage page admins" ON public.page_admins;
CREATE POLICY "Admins can manage page admins" ON public.page_admins FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.page_admins pa WHERE pa.page_id = page_id AND pa.user_id = auth.uid() AND pa.role IN ('owner', 'admin'))
);
DROP POLICY IF EXISTS "Admins can delete page admins" ON public.page_admins;
CREATE POLICY "Admins can delete page admins" ON public.page_admins FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.page_admins pa WHERE pa.page_id = page_id AND pa.user_id = auth.uid() AND pa.role IN ('owner', 'admin'))
);

-- Page follows: anyone can read
DROP POLICY IF EXISTS "Anyone can read page_follows" ON public.page_follows;
CREATE POLICY "Anyone can read page_follows" ON public.page_follows FOR SELECT USING (true);
-- Users can follow/unfollow via API
DROP POLICY IF EXISTS "Users can follow pages" ON public.page_follows;
CREATE POLICY "Users can follow pages" ON public.page_follows FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can unfollow pages" ON public.page_follows;
CREATE POLICY "Users can unfollow pages" ON public.page_follows FOR DELETE USING (auth.uid() = user_id);

-- 7. Realtime (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'pages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'page_follows') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.page_follows;
  END IF;
END;
$$;
