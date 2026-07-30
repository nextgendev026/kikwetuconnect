-- Fix spend_heshima (remove broken currval on UUID pk), create media bucket, ensure votes trigger

-- ====== 1. Fix spend_heshima — currval() fails because id is UUID (not serial) ======
DROP FUNCTION IF EXISTS public.spend_heshima;

CREATE OR REPLACE FUNCTION public.spend_heshima(
  p_user_id uuid,
  p_amount integer,
  p_source_type text,
  p_source_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current integer;
  v_new_id uuid;
  v_new_balance integer;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  SELECT heshima_points INTO v_current FROM profiles WHERE id = p_user_id;
  IF v_current IS NULL OR v_current < p_amount THEN
    RAISE EXCEPTION 'Insufficient Heshima points';
  END IF;

  INSERT INTO heshima_earnings (user_id, amount, source_type, source_id, description)
  VALUES (p_user_id, -p_amount, p_source_type, p_source_id, p_description)
  RETURNING id INTO v_new_id;

  UPDATE profiles
  SET heshima_points = heshima_points - p_amount, updated_at = now()
  WHERE id = p_user_id
  RETURNING heshima_points INTO v_new_balance;

  RETURN jsonb_build_object('spent', true, 'amount', p_amount, 'total_points', v_new_balance, 'new_earnings_id', v_new_id);
END;
$$;

-- ====== 2. Create 'media' bucket for /api/upload/route.ts ======
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('media', 'media', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf', 'video/mp4', 'audio/mpeg'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf', 'video/mp4', 'audio/mpeg'];

-- RLS: allow anonymous reads, authenticated uploads
DROP POLICY IF EXISTS "Anyone can read media" ON storage.objects;
CREATE POLICY "Anyone can read media" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');

DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
CREATE POLICY "Authenticated users can upload media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Owners can update media" ON storage.objects;
CREATE POLICY "Owners can update media" ON storage.objects
  FOR UPDATE USING (bucket_id = 'media' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Owners can delete media" ON storage.objects;
CREATE POLICY "Owners can delete media" ON storage.objects
  FOR DELETE USING (bucket_id = 'media' AND auth.uid() = owner);

-- ====== 3. Ensure trigger on votes table fires update_heshima_rating() ======
DROP TRIGGER IF EXISTS heshima_rating_trigger ON public.votes;

CREATE TRIGGER heshima_rating_trigger
  AFTER INSERT OR DELETE ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_heshima_rating();

-- ====== 4. Add index for text search to reduce full-table scans ======
-- speeds up ilike queries on posts.content (most common search pattern)
CREATE INDEX IF NOT EXISTS idx_posts_content_gin ON public.posts USING gin (to_tsvector('english', coalesce(content, '')));

-- index for search on profiles.full_name and username
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);
CREATE INDEX IF NOT EXISTS idx_profiles_county_hub ON public.profiles(county_hub);
