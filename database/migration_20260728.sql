-- Migration: Add missing updated_at triggers and RLS policies

-- Helper function
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at to tables that have created_at but no updated_at
DO $$
DECLARE
  tables_to_update text[] := ARRAY[
    'audit_logs', 'badges', 'follows', 'messages', 'moderation',
    'notifications', 'parent_links', 'payouts', 'quiz_questions',
    'quizzes', 'saves', 'tips', 'tokens', 'topics',
    'translations', 'user_topics', 'votes'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY tables_to_update
  LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW()', t);
    EXECUTE format('DROP TRIGGER IF EXISTS %I_updated_at ON %I', t, t);
    EXECUTE format(
      'CREATE TRIGGER %I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION handle_updated_at()',
      t, t
    );
  END LOOP;
END;
$$;

-- Add created_at + updated_at to tables that have neither
DO $$
DECLARE
  tables_to_update text[] := ARRAY['post_topics', 'quiz_results', 'space_members', 'user_badges'];
  t text;
BEGIN
  FOREACH t IN ARRAY tables_to_update
  LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT NOW()', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW()', t);
    EXECUTE format('DROP TRIGGER IF EXISTS %I_updated_at ON %I', t, t);
    EXECUTE format(
      'CREATE TRIGGER %I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION handle_updated_at()',
      t, t
    );
  END LOOP;
END;
$$;

-- Enable RLS on tables that don't have it
DO $$
DECLARE
  tables_to_enable text[] := ARRAY[
    'audit_logs', 'badges', 'follows', 'marketplace_listings', 'moderation',
    'notifications', 'parent_links', 'payouts', 'post_topics',
    'quiz_questions', 'quiz_results', 'quizzes', 'saves', 'sessions',
    'space_members', 'spaces', 'tips', 'tokens', 'translations',
    'user_badges', 'user_topics', 'votes'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY tables_to_enable
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END;
$$;

-- ====== RLS POLICIES for tables missing them ======

-- audit_logs: only admins can view, system inserts
CREATE POLICY "Admins can view audit logs" ON audit_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "System can insert audit logs" ON audit_logs FOR INSERT
  WITH CHECK (true);

-- badges: viewable by everyone, only admins can manage
CREATE POLICY "Badges are viewable by everyone" ON badges FOR SELECT USING (true);

-- tokens: users see their own tokens
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own tokens" ON tokens FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "System can manage tokens" ON tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- post_topics: viewable by everyone
ALTER TABLE post_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Post topics are viewable by everyone" ON post_topics FOR SELECT USING (true);
CREATE POLICY "Users can create post topics" ON post_topics FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM posts WHERE id = post_id AND user_id = auth.uid()));

-- user_topics: users see and manage their own
CREATE POLICY "Users can view their own topic follows" ON user_topics FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can follow topics" ON user_topics FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unfollow topics" ON user_topics FOR DELETE
  USING (auth.uid() = user_id);

-- user_badges: viewable by everyone
CREATE POLICY "User badges are viewable by everyone" ON user_badges FOR SELECT USING (true);

-- translations: viewable by everyone
CREATE POLICY "Translations are viewable by everyone" ON translations FOR SELECT USING (true);

-- payouts: viewable by the professional
CREATE POLICY "Users can view their own payouts" ON payouts FOR SELECT
  USING (auth.uid() = professional_id);

-- parent_links: viewable by the parent or child
CREATE POLICY "Parent links are viewable by participants" ON parent_links FOR SELECT
  USING (auth.uid() = parent_id OR auth.uid() = child_id);

-- ====== INDEXES for performance ======
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_post_type ON posts(post_type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_county_hub ON profiles(county_hub);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_votes_target_id ON votes(target_id);
CREATE INDEX IF NOT EXISTS idx_saves_user_id ON saves(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_tips_professional_id ON tips(professional_id);
CREATE INDEX IF NOT EXISTS idx_sessions_professional_id ON sessions(professional_id);
CREATE INDEX IF NOT EXISTS idx_sessions_student_id ON sessions(student_id);
