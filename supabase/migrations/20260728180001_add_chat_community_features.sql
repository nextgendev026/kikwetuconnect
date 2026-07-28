-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_message text,
  last_message_at timestamptz
);

-- Create conversation_participants table
CREATE TABLE IF NOT EXISTS conversation_participants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  last_read_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Add columns to messages if not exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='sender_id') THEN
    ALTER TABLE messages ADD COLUMN sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='conversation_id') THEN
    ALTER TABLE messages ADD COLUMN conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='content') THEN
    ALTER TABLE messages ADD COLUMN content text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='created_at') THEN
    ALTER TABLE messages ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='read_at') THEN
    ALTER TABLE messages ADD COLUMN read_at timestamptz;
  END IF;
END $$;

-- Follows table
CREATE TABLE IF NOT EXISTS follows (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Communities table
CREATE TABLE IF NOT EXISTS communities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  avatar_url text,
  cover_url text,
  category text,
  is_public boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  member_count integer DEFAULT 0,
  post_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Community members
CREATE TABLE IF NOT EXISTS community_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id uuid REFERENCES communities(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('member','moderator','admin')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(community_id, user_id)
);

-- Community invites
CREATE TABLE IF NOT EXISTS community_invites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id uuid REFERENCES communities(id) ON DELETE CASCADE,
  invited_by uuid REFERENCES profiles(id) ON DELETE CASCADE,
  invited_user uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(community_id, invited_user)
);

-- Add columns to notifications
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='user_id') THEN
    ALTER TABLE notifications ADD COLUMN user_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='type') THEN
    ALTER TABLE notifications ADD COLUMN type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='title') THEN
    ALTER TABLE notifications ADD COLUMN title text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='body') THEN
    ALTER TABLE notifications ADD COLUMN body text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='data') THEN
    ALTER TABLE notifications ADD COLUMN data jsonb DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='is_read') THEN
    ALTER TABLE notifications ADD COLUMN is_read boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='created_at') THEN
    ALTER TABLE notifications ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END $$;

-- User locations
CREATE TABLE IF NOT EXISTS user_locations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  latitude double precision,
  longitude double precision,
  county text,
  last_updated timestamptz DEFAULT now()
);

-- Admin activity log
CREATE TABLE IF NOT EXISTS admin_activity (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Likes table
CREATE TABLE IF NOT EXISTS likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Seed communities
INSERT INTO communities (name, slug, description, category, is_public) VALUES
  ('Kilimo Smart', 'kilimo-smart', 'Modern farming techniques, tips, and market linkages for Kenyan farmers', 'Agriculture', true),
  ('Nairobi Tech Hub', 'nairobi-tech-hub', 'Kenya''s largest tech community — coding, startups, AI, and digital innovation', 'Technology', true),
  ('Biashara Connect', 'biashara-connect', 'Business networking, funding opportunities, and entrepreneurship in Kenya', 'Business', true),
  ('Mama na Mtoto', 'mama-na-mtoto', 'Parenting, maternal health, and child wellness support group', 'Health', true),
  ('Elimu Bora', 'elimu-bora', 'Education resources, scholarship info, and academic discussion', 'Education', true),
  ('Sheria kwa Wote', 'sheria-kwa-wote', 'Legal rights awareness, pro-bono advice, and justice access', 'Legal', true),
  ('Sanaa na Utamaduni', 'sanaa-na-utamaduni', 'Kenyan music, film, literature, fashion, and cultural heritage', 'Culture', true),
  ('Mazingira Yetu', 'mazingiraYetu', 'Environmental conservation, climate action, and green living', 'Environment', true),
  ('Vijana na Talanta', 'vijana-na-talanta', 'Youth empowerment, skills training, and talent showcase', 'Youth', true),
  ('Nyumba na Makazi', 'nyumba-na-makazi', 'Housing, real estate, rentals, and home improvement tips', 'Real Estate', true)
ON CONFLICT (slug) DO NOTHING;

-- Enable RLS on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- RLS policies (public read, authenticated write)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'conversations_read_all' AND tablename = 'conversations') THEN
    CREATE POLICY conversations_read_all ON conversations FOR SELECT USING (true);
    CREATE POLICY conversations_insert_all ON conversations FOR INSERT WITH CHECK (true);
    CREATE POLICY conversations_update_all ON conversations FOR UPDATE USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cp_read_all' AND tablename = 'conversation_participants') THEN
    CREATE POLICY cp_read_all ON conversation_participants FOR SELECT USING (true);
    CREATE POLICY cp_insert_all ON conversation_participants FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'messages_read_all' AND tablename = 'messages') THEN
    CREATE POLICY messages_read_all ON messages FOR SELECT USING (true);
    CREATE POLICY messages_insert_all ON messages FOR INSERT WITH CHECK (true);
    CREATE POLICY messages_update_all ON messages FOR UPDATE USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'follows_read_all' AND tablename = 'follows') THEN
    CREATE POLICY follows_read_all ON follows FOR SELECT USING (true);
    CREATE POLICY follows_insert_all ON follows FOR INSERT WITH CHECK (true);
    CREATE POLICY follows_delete_all ON follows FOR DELETE USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'communities_read_all' AND tablename = 'communities') THEN
    CREATE POLICY communities_read_all ON communities FOR SELECT USING (true);
    CREATE POLICY communities_insert_all ON communities FOR INSERT WITH CHECK (true);
    CREATE POLICY communities_update_all ON communities FOR UPDATE USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cm_read_all' AND tablename = 'community_members') THEN
    CREATE POLICY cm_read_all ON community_members FOR SELECT USING (true);
    CREATE POLICY cm_insert_all ON community_members FOR INSERT WITH CHECK (true);
    CREATE POLICY cm_delete_all ON community_members FOR DELETE USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ci_read_all' AND tablename = 'community_invites') THEN
    CREATE POLICY ci_read_all ON community_invites FOR SELECT USING (true);
    CREATE POLICY ci_insert_all ON community_invites FOR INSERT WITH CHECK (true);
    CREATE POLICY ci_update_all ON community_invites FOR UPDATE USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notifications_read_all' AND tablename = 'notifications') THEN
    CREATE POLICY notifications_read_all ON notifications FOR SELECT USING (true);
    CREATE POLICY notifications_insert_all ON notifications FOR INSERT WITH CHECK (true);
    CREATE POLICY notifications_update_all ON notifications FOR UPDATE USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ul_read_all' AND tablename = 'user_locations') THEN
    CREATE POLICY ul_read_all ON user_locations FOR SELECT USING (true);
    CREATE POLICY ul_insert_all ON user_locations FOR INSERT WITH CHECK (true);
    CREATE POLICY ul_update_all ON user_locations FOR UPDATE USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'aa_read_all' AND tablename = 'admin_activity') THEN
    CREATE POLICY aa_read_all ON admin_activity FOR SELECT USING (true);
    CREATE POLICY aa_insert_all ON admin_activity FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'likes_read_all' AND tablename = 'likes') THEN
    CREATE POLICY likes_read_all ON likes FOR SELECT USING (true);
    CREATE POLICY likes_insert_all ON likes FOR INSERT WITH CHECK (true);
    CREATE POLICY likes_delete_all ON likes FOR DELETE USING (true);
  END IF;
END $$;

-- Enable realtime on all tables
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE follows;
ALTER PUBLICATION supabase_realtime ADD TABLE communities;
ALTER PUBLICATION supabase_realtime ADD TABLE community_members;
ALTER PUBLICATION supabase_realtime ADD TABLE community_invites;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE user_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE admin_activity;
ALTER PUBLICATION supabase_realtime ADD TABLE likes;
