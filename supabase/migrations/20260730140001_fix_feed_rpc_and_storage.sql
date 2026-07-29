-- Fix get_personalized_feed RPC: correct column names
DROP FUNCTION IF EXISTS get_personalized_feed(uuid, int, int);

CREATE FUNCTION get_personalized_feed(p_user_id uuid, p_limit int DEFAULT 30, p_offset int DEFAULT 0)
RETURNS TABLE(
  id uuid,
  title text,
  content text,
  post_type text,
  media_url text,
  media_type text,
  bounty int,
  county_tag text,
  created_at timestamptz,
  upvotes_count int,
  downvotes_count int,
  comments_count int,
  author_id uuid,
  author_name text,
  author_username text,
  author_avatar text,
  author_heshima int
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.title,
    p.content,
    p.post_type,
    p.media_url,
    p.media_type,
    p.bounty_tokens,
    p.county_tag,
    p.created_at,
    p.upvotes_count,
    p.downvotes_count,
    p.answers_count,
    pr.id AS author_id,
    pr.full_name AS author_name,
    pr.username AS author_username,
    pr.avatar_url AS author_avatar,
    pr.heshima_rating AS author_heshima
  FROM posts p
  LEFT JOIN profiles pr ON pr.id = p.user_id
  WHERE
    (p.is_pinned = false OR p.is_pinned IS NULL)
  ORDER BY
    p.created_at DESC, p.upvotes_count DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Ensure storage bucket exists with public read
INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('public-media', 'public-media', true, false)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public read of objects in public-media
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_read_public_media' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY public_read_public_media ON storage.objects
      FOR SELECT USING (bucket_id = 'public-media');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_insert_public_media' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY auth_insert_public_media ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'public-media' AND auth.role() = 'authenticated');
  END IF;
END $$;
