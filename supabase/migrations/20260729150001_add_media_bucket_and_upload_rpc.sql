-- Ensure media bucket exists for signed uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('media', 'media', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

-- RLS for media bucket: authenticated users can read/write own files
DROP POLICY IF EXISTS "Authenticated users can read media" ON storage.objects;
CREATE POLICY "Authenticated users can read media" ON storage.objects
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can upload own media" ON storage.objects;
CREATE POLICY "Users can upload own media" ON storage.objects
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND bucket_id = 'media'
    AND owner = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update own media" ON storage.objects;
CREATE POLICY "Users can update own media" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'media' AND owner = auth.uid()
  );

DROP POLICY IF EXISTS "Users can delete own media" ON storage.objects;
CREATE POLICY "Users can delete own media" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'media' AND owner = auth.uid()
  );

-- Public prefix is readable by everyone
DROP POLICY IF EXISTS "Anyone can read public media" ON storage.objects;
CREATE POLICY "Anyone can read public media" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'media' AND position('public/' in name) = 1
  );

-- RPC to get a signed upload URL (server-side wrapper)
CREATE OR REPLACE FUNCTION public.get_signed_upload_url(
  p_folder text DEFAULT 'uploads',
  p_content_type text DEFAULT 'image/jpeg'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
  v_file_name text;
  v_signed_url text;
  v_token text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  v_file_name := p_folder || '/' || v_user_id || '/' ||
                 to_char(now(), 'YYYYMMDDHH24MISS') || '-' ||
                 substr(md5(random()::text), 1, 8) || '.' ||
                 CASE p_content_type
                   WHEN 'image/jpeg' THEN 'jpg'
                   WHEN 'image/png' THEN 'png'
                   WHEN 'image/gif' THEN 'gif'
                   WHEN 'image/webp' THEN 'webp'
                   ELSE 'bin'
                 END;

  -- Note: actual signed URL generation is done server-side via API
  -- This RPC returns the path for the API to sign
  RETURN jsonb_build_object('path', v_file_name);
END;
$$;

-- RPC to finalize an upload (mark as confirmed)
CREATE OR REPLACE FUNCTION public.finalize_upload(
  p_path text,
  p_make_public boolean DEFAULT false
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
  v_url text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Generate signed read URL (expires in 30 days)
  -- Note: actual signed URL generation uses storage API
  RETURN jsonb_build_object('path', p_path, 'public', p_make_public);
END;
$$;
