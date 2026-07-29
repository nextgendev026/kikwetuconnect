-- Spaces tables for community groups (Facebook Groups style)

-- 1. Spaces table
CREATE TABLE IF NOT EXISTS spaces (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text DEFAULT '🌍',
  category text NOT NULL DEFAULT 'General',
  cover_url text,
  member_count integer DEFAULT 0,
  post_count integer DEFAULT 0,
  is_public boolean DEFAULT true,
  membership_approval boolean DEFAULT false,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Full-text search support
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS tsv tsvector;
CREATE INDEX IF NOT EXISTS spaces_tsv_idx ON spaces USING gin(tsv);
CREATE INDEX IF NOT EXISTS spaces_category_idx ON spaces(category);
CREATE INDEX IF NOT EXISTS spaces_member_count_idx ON spaces(member_count DESC);

CREATE OR REPLACE FUNCTION spaces_tsv_trigger() RETURNS trigger AS $$
BEGIN
  NEW.tsv := to_tsvector('english', coalesce(NEW.name,'') || ' ' || coalesce(NEW.description,'') || ' ' || coalesce(NEW.category,''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS spaces_tsv_update ON spaces;
CREATE TRIGGER spaces_tsv_update BEFORE INSERT OR UPDATE ON spaces
  FOR EACH ROW EXECUTE FUNCTION spaces_tsv_trigger();

-- 2. Space members with roles
CREATE TABLE IF NOT EXISTS space_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id uuid REFERENCES spaces(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin', 'owner')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(space_id, user_id)
);

CREATE INDEX IF NOT EXISTS space_members_space_idx ON space_members(space_id);
CREATE INDEX IF NOT EXISTS space_members_user_idx ON space_members(user_id);

-- 3. Member count triggers
CREATE OR REPLACE FUNCTION update_space_member_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE spaces SET member_count = coalesce(member_count, 0) + 1 WHERE id = NEW.space_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE spaces SET member_count = greatest(coalesce(member_count, 0) - 1, 0) WHERE id = OLD.space_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS space_members_count_trigger ON space_members;
CREATE TRIGGER space_members_count_trigger AFTER INSERT OR DELETE ON space_members
  FOR EACH ROW EXECUTE FUNCTION update_space_member_count();

-- 4. Post count trigger (add space_id to posts)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS space_id uuid REFERENCES spaces(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS posts_space_id_idx ON posts(space_id, created_at DESC);

CREATE OR REPLACE FUNCTION update_space_post_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.space_id IS NOT NULL THEN
    UPDATE spaces SET post_count = coalesce(post_count, 0) + 1 WHERE id = NEW.space_id;
  ELSIF TG_OP = 'DELETE' AND OLD.space_id IS NOT NULL THEN
    UPDATE spaces SET post_count = greatest(coalesce(post_count, 0) - 1, 0) WHERE id = OLD.space_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.space_id IS DISTINCT FROM NEW.space_id THEN
    IF OLD.space_id IS NOT NULL THEN
      UPDATE spaces SET post_count = greatest(coalesce(post_count, 0) - 1, 0) WHERE id = OLD.space_id;
    END IF;
    IF NEW.space_id IS NOT NULL THEN
      UPDATE spaces SET post_count = coalesce(post_count, 0) + 1 WHERE id = NEW.space_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS posts_space_count_trigger ON posts;
CREATE TRIGGER posts_space_count_trigger AFTER INSERT OR DELETE OR UPDATE OF space_id ON posts
  FOR EACH ROW EXECUTE FUNCTION update_space_post_count();

-- 5. RLS
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_members ENABLE ROW LEVEL SECURITY;

-- Anyone can read public spaces
DROP POLICY IF EXISTS "Anyone can read spaces" ON spaces;
CREATE POLICY "Anyone can read spaces" ON spaces FOR SELECT USING (true);
-- Authenticated users can create spaces
DROP POLICY IF EXISTS "Users can create spaces" ON spaces;
CREATE POLICY "Users can create spaces" ON spaces FOR INSERT WITH CHECK (auth.uid() = created_by);
-- Only admin/owner can update space
DROP POLICY IF EXISTS "Space admins can update" ON spaces;
CREATE POLICY "Space admins can update" ON spaces FOR UPDATE USING (
  EXISTS (SELECT 1 FROM space_members WHERE space_id = id AND user_id = auth.uid() AND role IN ('admin', 'owner'))
);

-- Space members: read own memberships
DROP POLICY IF EXISTS "Members can read space_members" ON space_members;
CREATE POLICY "Members can read space_members" ON space_members FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM space_members sm WHERE sm.space_id = space_id AND sm.user_id = auth.uid() AND sm.role IN ('admin', 'owner', 'moderator'))
);
-- Insert via server RPC only (no client insert policy for safety; use API)
DROP POLICY IF EXISTS "Users can join via API" ON space_members;
CREATE POLICY "Users can join via API" ON space_members FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Delete own membership (leave)
DROP POLICY IF EXISTS "Users can leave" ON space_members;
CREATE POLICY "Users can leave" ON space_members FOR DELETE USING (auth.uid() = user_id);
-- Admin can manage members
DROP POLICY IF EXISTS "Admins can manage members" ON space_members;
CREATE POLICY "Admins can manage members" ON space_members FOR ALL USING (
  EXISTS (SELECT 1 FROM space_members sm WHERE sm.space_id = space_id AND sm.user_id = auth.uid() AND sm.role IN ('admin', 'owner'))
);

-- 6. Realtime (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'spaces') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE spaces;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'space_members') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE space_members;
  END IF;
END;
$$;
