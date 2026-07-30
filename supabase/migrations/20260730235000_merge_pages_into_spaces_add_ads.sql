-- ============================================================
-- Merge Pages into Spaces + Ads system + Presence metadata
-- ============================================================

-- ============================================================
-- PART 1: Add missing columns from `pages` to `spaces`
-- Pages had avatar_url, website, phone, email, address,
-- is_verified. Spaces gets these now.
-- ============================================================
ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;

-- Add page_id references on posts to also point at spaces via space_id
-- (posts already has space_id, we'll just use that going forward)

-- ============================================================
-- PART 2: Migrate data from pages → spaces
-- page_admins → space_members with role preserved
-- page_follows → space_members as member role
-- posts.page_id → posts.space_id mapping
-- ============================================================

-- Insert pages as spaces with all metadata
INSERT INTO public.spaces (name, slug, description, category, cover_url, avatar_url, website, phone, email, address, is_verified, member_count, post_count, created_by, created_at, updated_at)
SELECT
  p.name, p.slug, p.description,
  COALESCE(p.category, 'General'),
  p.cover_url, p.avatar_url, p.website, p.phone, p.email, p.address,
  p.is_verified,
  COALESCE(p.followers_count, 0),
  COALESCE(p.posts_count, 0),
  p.created_by,
  p.created_at,
  COALESCE(p.updated_at, p.created_at)
FROM public.pages p
WHERE NOT EXISTS (SELECT 1 FROM public.spaces s WHERE s.slug = p.slug)
ON CONFLICT (slug) DO NOTHING;

-- Helper: get space id for a page slug
DO $$
DECLARE
  p RECORD;
  v_space_id uuid;
BEGIN
  FOR p IN SELECT * FROM public.pages LOOP
    SELECT id INTO v_space_id FROM public.spaces WHERE slug = p.slug;
    IF v_space_id IS NULL THEN CONTINUE; END IF;

    -- Migrate page_admins → space_members
    INSERT INTO public.space_members (space_id, user_id, role, joined_at)
    SELECT v_space_id, pa.user_id,
      CASE pa.role WHEN 'owner' THEN 'admin' WHEN 'admin' THEN 'admin' WHEN 'editor' THEN 'moderator' ELSE 'member' END,
      COALESCE(pa.added_at, now())
    FROM public.page_admins pa
    WHERE pa.page_id = p.id
    ON CONFLICT (space_id, user_id) DO NOTHING;

    -- Migrate page_follows → space_members
    INSERT INTO public.space_members (space_id, user_id, role, joined_at)
    SELECT v_space_id, pf.user_id, 'member', pf.created_at
    FROM public.page_follows pf
    WHERE pf.page_id = p.id
    ON CONFLICT (space_id, user_id) DO NOTHING;

    -- Update posts to point at the new space instead of page
    UPDATE public.posts SET space_id = v_space_id
    WHERE page_id = p.id AND (space_id IS NULL OR space_id != v_space_id);
  END LOOP;
END $$;

-- ============================================================
-- PART 3: Create ads system
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  image_url text,
  link_url text NOT NULL,
  placement text NOT NULL CHECK (placement IN ('sidebar', 'feed', 'banner', 'spaces')),
  is_active boolean DEFAULT true,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  starts_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- Anyone can read active ads
CREATE POLICY ads_read_active ON public.ads
  FOR SELECT USING (is_active = true AND (ends_at IS NULL OR ends_at > now()));

-- Only admins can manage ads
CREATE POLICY ads_insert_admin ON public.ads
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY ads_update_admin ON public.ads
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY ads_delete_admin ON public.ads
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Add to realtime
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'ads') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ads;
  END IF;
END $$;

-- ============================================================
-- PART 4: Add presence metadata to profiles for live sidebar
-- (last_seen is already a trigger-updated column)
-- ============================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen timestamptz DEFAULT now();

-- ============================================================
-- PART 5: Add updated_at trigger to ads
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_ads_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_ads_updated_at ON public.ads;
CREATE TRIGGER tr_ads_updated_at
  BEFORE UPDATE ON public.ads
  FOR EACH ROW
  EXECUTE FUNCTION update_ads_timestamp();

-- ============================================================
-- PART 6: Spaces stats for admin dashboard
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'users', (SELECT count(*) FROM public.profiles),
    'posts', (SELECT count(*) FROM public.posts),
    'spaces', (SELECT count(*) FROM public.spaces),
    'reports', (SELECT count(*) FROM public.moderation_queue WHERE status = 'pending'),
    'quizzes', (SELECT count(*) FROM public.quizzes),
    'listings', (SELECT count(*) FROM public.marketplace_listings),
    'topics', (SELECT count(*) FROM public.topics),
    'quiz_taken', (SELECT count(*) FROM public.quiz_results),
    'online_now', (SELECT count(*) FROM public.profiles WHERE is_online = true)
  ) INTO v_result;
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_stats TO authenticated, anon;
