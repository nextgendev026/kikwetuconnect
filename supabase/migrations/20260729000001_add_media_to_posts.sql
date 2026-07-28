-- Add media columns to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_urls text[] DEFAULT '{}';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_types text[] DEFAULT '{}';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS embed_url text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS embed_title text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS embed_description text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS embed_image text;

-- Enable realtime for media changes
ALTER PUBLICATION supabase_realtime ADD TABLE posts;