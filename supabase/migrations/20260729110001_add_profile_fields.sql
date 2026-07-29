-- Profile enhancements for modern social-media profile (cover, headline, social, featured post)

-- Add new columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS headline text,
  ADD COLUMN IF NOT EXISTS languages text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS social_handles jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS featured_post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL;

-- Index for featured post lookup
CREATE INDEX IF NOT EXISTS profiles_featured_post_idx ON public.profiles(featured_post_id) WHERE featured_post_id IS NOT NULL;

-- RLS: only owner or admin can update profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users or admins can update profiles" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.uid() = id OR auth.jwt() ->> 'role' = 'admin');

-- RPC to increment follower/following counts (used by server API)
CREATE OR REPLACE FUNCTION public.increment_follower_count(user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles SET follower_count = coalesce(follower_count, 0) + 1 WHERE id = user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_following_count(user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles SET following_count = coalesce(following_count, 0) + 1 WHERE id = user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_follower_count(user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles SET follower_count = greatest(coalesce(follower_count, 0) - 1, 0) WHERE id = user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_following_count(user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles SET following_count = greatest(coalesce(following_count, 0) - 1, 0) WHERE id = user_id;
END;
$$;
