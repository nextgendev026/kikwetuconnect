-- Fix storage public access: make media bucket public so getPublicUrl works
UPDATE storage.buckets SET public = true WHERE id = 'media';

-- Ensure public-media bucket is public (idempotent)
UPDATE storage.buckets SET public = true WHERE id = 'public-media';

-- Grant EXECUTE on all follow RPCs to anon (needed for API route)
GRANT EXECUTE ON FUNCTION increment_follower_count TO authenticated, anon;
GRANT EXECUTE ON FUNCTION decrement_follower_count TO authenticated, anon;
GRANT EXECUTE ON FUNCTION increment_following_count TO authenticated, anon;
GRANT EXECUTE ON FUNCTION decrement_following_count TO authenticated, anon;
GRANT EXECUTE ON FUNCTION create_notification TO authenticated, anon;
