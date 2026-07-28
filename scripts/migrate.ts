import pg from 'pg'
const { Client } = pg

const SQL = `
-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_message text,
  last_message_at timestamptz
);

ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS conversations;

-- Conversation participants
CREATE TABLE IF NOT EXISTS conversation_participants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  last_read_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS conversation_participants;

-- Add sender_id to messages if not exists
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

ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS messages;

-- Follows
CREATE TABLE IF NOT EXISTS follows (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS follows;

-- Communities
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

ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS communities;

-- Community members
CREATE TABLE IF NOT EXISTS community_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id uuid REFERENCES communities(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('member','moderator','admin')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(community_id, user_id)
);

ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS community_members;

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

ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS community_invites;

-- Notifications (already exists, add columns if needed)
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

ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS notifications;

-- User locations
CREATE TABLE IF NOT EXISTS user_locations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  latitude double precision,
  longitude double precision,
  county text,
  last_updated timestamptz DEFAULT now()
);

ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS user_locations;

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

ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS admin_activity;

-- Likes
CREATE TABLE IF NOT EXISTS likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS likes;

-- Seed communities
INSERT INTO communities (name, slug, description, category, is_public, created_at) VALUES
  ('Kilimo Smart', 'kilimo-smart', 'Modern farming techniques, tips, and market linkages for Kenyan farmers', 'Agriculture', true, now()),
  ('Nairobi Tech Hub', 'nairobi-tech-hub', 'Kenya''s largest tech community — coding, startups, AI, and digital innovation', 'Technology', true, now()),
  ('Biashara Connect', 'biashara-connect', 'Business networking, funding opportunities, and entrepreneurship in Kenya', 'Business', true, now()),
  ('Mama na Mtoto', 'mama-na-mtoto', 'Parenting, maternal health, and child wellness support group', 'Health', true, now()),
  ('Elimu Bora', 'elimu-bora', 'Education resources, scholarship info, and academic discussion', 'Education', true, now()),
  ('Sheria kwa Wote', 'sheria-kwa-wote', 'Legal rights awareness, pro-bono advice, and justice access', 'Legal', true, now()),
  ('Sanaa na Utamaduni', 'sanaa-na-utamaduni', 'Kenyan music, film, literature, fashion, and cultural heritage', 'Culture', true, now()),
  ('Mazingira Yetu', 'mazingiraYetu', 'Environmental conservation, climate action, and green living', 'Environment', true, now()),
  ('Vijana na Talanta', 'vijana-na-talanta', 'Youth empowerment, skills training, and talent showcase', 'Youth', true, now()),
  ('Nyumba na Makazi', 'nyumba-na-makazi', 'Housing, real estate, rentals, and home improvement tips', 'Real Estate', true, now())
ON CONFLICT (slug) DO NOTHING;

-- RLS policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read for all users' AND tablename = 'conversations') THEN
    CREATE POLICY "Enable read for all users" ON conversations FOR SELECT USING (true);
    CREATE POLICY "Enable insert for all users" ON conversations FOR INSERT WITH CHECK (true);
    CREATE POLICY "Enable update for all users" ON conversations FOR UPDATE USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read for all users' AND tablename = 'conversation_participants') THEN
    CREATE POLICY "Enable read for all users" ON conversation_participants FOR SELECT USING (true);
    CREATE POLICY "Enable insert for all users" ON conversation_participants FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read for all users' AND tablename = 'messages') THEN
    CREATE POLICY "Enable read for all users" ON messages FOR SELECT USING (true);
    CREATE POLICY "Enable insert for all users" ON messages FOR INSERT WITH CHECK (true);
    CREATE POLICY "Enable update for all users" ON messages FOR UPDATE USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read for all users' AND tablename = 'follows') THEN
    CREATE POLICY "Enable read for all users" ON follows FOR SELECT USING (true);
    CREATE POLICY "Enable insert for all users" ON follows FOR INSERT WITH CHECK (true);
    CREATE POLICY "Enable delete for all users" ON follows FOR DELETE USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read for all users' AND tablename = 'communities') THEN
    CREATE POLICY "Enable read for all users" ON communities FOR SELECT USING (true);
    CREATE POLICY "Enable insert for all users" ON communities FOR INSERT WITH CHECK (true);
    CREATE POLICY "Enable update for all users" ON communities FOR UPDATE USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read for all users' AND tablename = 'community_members') THEN
    CREATE POLICY "Enable read for all users" ON community_members FOR SELECT USING (true);
    CREATE POLICY "Enable insert for all users" ON community_members FOR INSERT WITH CHECK (true);
    CREATE POLICY "Enable delete for all users" ON community_members FOR DELETE USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read for all users' AND tablename = 'community_invites') THEN
    CREATE POLICY "Enable read for all users" ON community_invites FOR SELECT USING (true);
    CREATE POLICY "Enable insert for all users" ON community_invites FOR INSERT WITH CHECK (true);
    CREATE POLICY "Enable update for all users" ON community_invites FOR UPDATE USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read for all users' AND tablename = 'notifications') THEN
    CREATE POLICY "Enable read for all users" ON notifications FOR SELECT USING (true);
    CREATE POLICY "Enable insert for all users" ON notifications FOR INSERT WITH CHECK (true);
    CREATE POLICY "Enable update for all users" ON notifications FOR UPDATE USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read for all users' AND tablename = 'user_locations') THEN
    CREATE POLICY "Enable read for all users" ON user_locations FOR SELECT USING (true);
    CREATE POLICY "Enable insert for all users" ON user_locations FOR INSERT WITH CHECK (true);
    CREATE POLICY "Enable update for all users" ON user_locations FOR UPDATE USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read for all users' AND tablename = 'admin_activity') THEN
    CREATE POLICY "Enable read for all users" ON admin_activity FOR SELECT USING (true);
    CREATE POLICY "Enable insert for all users" ON admin_activity FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read for all users' AND tablename = 'likes') THEN
    CREATE POLICY "Enable read for all users" ON likes FOR SELECT USING (true);
    CREATE POLICY "Enable insert for all users" ON likes FOR INSERT WITH CHECK (true);
    CREATE POLICY "Enable delete for all users" ON likes FOR DELETE USING (true);
  END IF;
END $$;

-- Enable realtime on all new tables
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS communities;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS community_members;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS community_invites;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS user_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS admin_activity;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS likes;
`

async function main() {
  const client = new Client({
    connectionString: process.env.DB_URL
  })
  await client.connect()
  console.log('Connected. Running migration...')
  const statements = SQL.split(';').filter(s => s.trim().length > 0)
  for (const stmt of statements) {
    try {
      await client.query(stmt + ';')
      console.log('  OK:', stmt.trim().slice(0, 80))
    } catch (err: any) {
      console.error('  FAIL:', err.message)
    }
  }
  await client.end()
  console.log('Done.')
}

main().catch(console.error)
