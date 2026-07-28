-- Add embed_active column to posts if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='embed_active') THEN
    ALTER TABLE posts ADD COLUMN embed_active boolean DEFAULT true;
  END IF;
END $$;

-- Add media_duration column for video shots
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='media_duration') THEN
    ALTER TABLE posts ADD COLUMN media_duration integer DEFAULT 0;
  END IF;
END $$;

-- Add thumbnail_url for video shots
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='thumbnail_url') THEN
    ALTER TABLE posts ADD COLUMN thumbnail_url text;
  END IF;
END $$;

-- Function to validate embed URLs (admin-only active URLs)
CREATE OR REPLACE FUNCTION validate_embed_url(
  p_url text,
  p_user_id uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_host text;
  v_is_valid boolean;
  v_embed_data jsonb;
BEGIN
  -- Check if user is admin
  SELECT role = 'admin' INTO v_is_admin FROM profiles WHERE id = p_user_id;
  
  -- Always return valid for admin posts
  IF v_is_admin THEN
    -- Validate URL format
    v_host := substring(p_url from 'https?://([^/]+)');
    IF v_host IS NOT NULL THEN
      RETURN json_build_object(
        'valid', true,
        'is_admin', true,
        'embed_html', '<iframe src="' || p_url || '" width="560" height="315" frameborder="0" allowfullscreen></iframe>',
        'title', p_url,
        'description', 'Embedded content from ' || v_host
      );
    END IF;
  END IF;
  
  -- Non-admin users cannot embed URL links
  RETURN json_build_object(
    'valid', false,
    'is_admin', false,
    'error', 'Only admin posts can embed URL links. Attach media files instead.'
  );
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION validate_embed_url TO anon, authenticated;

-- Function to create post with media
CREATE OR REPLACE FUNCTION create_post_with_media(
  p_user_id uuid,
  p_post_type text,
  p_content text,
  p_title text DEFAULT NULL,
  p_county_tag text DEFAULT NULL,
  p_language text DEFAULT 'en',
  p_media_urls text[] DEFAULT '{}',
  p_media_types text[] DEFAULT '{}',
  p_embed_url text DEFAULT NULL,
  p_bounty_tokens integer DEFAULT 0
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_id uuid;
  v_is_admin boolean;
  v_embed_valid boolean;
  v_result json;
BEGIN
  -- Check if user is admin
  SELECT role = 'admin' INTO v_is_admin FROM profiles WHERE id = p_user_id;
  
  -- If embed_url provided and user is not admin, reject
  IF p_embed_url IS NOT NULL AND NOT v_is_admin THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only admin posts can embed URL links'
    );
  END IF;
  
  -- Validate embed URL if provided
  IF p_embed_url IS NOT NULL AND v_is_admin THEN
    SELECT validate_embed_url(p_embed_url, p_user_id) INTO v_result;
    v_embed_valid := v_result->>'valid' = 'true';
    IF NOT v_embed_valid THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Invalid embed URL'
      );
    END IF;
  END IF;
  
  -- Create post
  INSERT INTO posts (user_id, post_type, content, title, county_tag, language, media_urls, media_types, embed_url, embed_active, bounty_tokens)
  VALUES (p_user_id, p_post_type, p_content, p_title, p_county_tag, p_language, p_media_urls, p_media_types, p_embed_url, true, p_bounty_tokens)
  RETURNING id INTO v_post_id;
  
  RETURN json_build_object(
    'success', true,
    'post_id', v_post_id,
    'message', 'Post created successfully'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION create_post_with_media TO anon, authenticated;

-- Function to upload media (generate signed URL)
CREATE OR REPLACE FUNCTION upload_media(
  p_user_id uuid,
  p_file_name text,
  p_file_path text,
  p_media_type text,
  p_bucket text DEFAULT 'public-media'
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signed_url text;
  v_public_url text;
BEGIN
  -- Generate signed URL for upload
  SELECT generate_signed_url(
    p_bucket,
    p_file_path,
    'POST',
    300
  ) INTO v_signed_url;
  
  -- Return signed URL for client upload
  RETURN json_build_object(
    'success', true,
    'signed_url', v_signed_url,
    'public_url', p_bucket || '/' || p_file_path,
    'media_type', p_media_type,
    'file_path', p_file_path
  );
END;
$$;

GRANT EXECUTE ON FUNCTION upload_media TO anon, authenticated;

-- Create storage policy for public-media bucket
CREATE POLICY "Public media can be read by all"
ON storage.objects FOR SELECT
USING (bucket_id = 'public-media');

CREATE POLICY "Authenticated users can upload media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'public-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update their own media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'public-media' AND owner = auth.uid());

-- Create storage policy for private-guidance bucket
CREATE POLICY "Private guidance can be read by owner"
ON storage.objects FOR SELECT
USING (bucket_id = 'private-guidance' AND owner = auth.uid());

CREATE POLICY "Authenticated users can upload guidance files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'private-guidance' AND auth.uid() IS NOT NULL);

-- Create storage policy for avatar uploads
CREATE POLICY "Avatars can be read by all"
ON storage.objects FOR SELECT
USING (bucket_id = 'public' AND name LIKE 'avatars/%');

CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'public' AND name LIKE 'avatars/%' AND owner = auth.uid());

-- Create storage policy for post media
CREATE POLICY "Post media can be read by all"
ON storage.objects FOR SELECT
USING (bucket_id = 'public-media' AND name LIKE 'posts/%');

CREATE POLICY "Users can upload post media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'public-media' AND name LIKE 'posts/%' AND auth.uid() IS NOT NULL);

-- Function to generate 15-sec video thumbnail from post media
CREATE OR REPLACE FUNCTION generate_video_thumbnail(
  p_file_path text,
  p_bucket text DEFAULT 'public-media'
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return placeholder thumbnail URL
  -- In production this would use a edge function to generate actual thumbnail
  RETURN p_bucket || '/' || p_file_path || '?thumbnail=1';
END;
$$;

GRANT EXECUTE ON FUNCTION generate_video_thumbnail TO anon, authenticated;