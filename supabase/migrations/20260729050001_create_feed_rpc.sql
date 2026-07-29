-- Create the get_personalized_feed RPC function for the recommended feed
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
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.title,
    p.content,
    p.post_type,
    p.media_url,
    p.media_type,
    p.bounty,
    p.county_tag,
    p.created_at,
    p.upvotes_count,
    p.downvotes_count,
    p.comments_count,
    pr.id AS author_id,
    pr.full_name AS author_name,
    pr.username AS author_username,
    pr.avatar_url AS author_avatar,
    pr.heshima_rating AS author_heshima
  FROM posts p
  LEFT JOIN profiles pr ON pr.id = p.user_id
  WHERE
    p.is_hidden = false
  ORDER BY
    p.created_at DESC, p.upvotes_count DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
