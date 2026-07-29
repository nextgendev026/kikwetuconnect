-- Comprehensive migration: Heshima points cap, badges, expert pipeline, marketplace orders, student sessions

-- Drop existing tables from any previous partial run to avoid schema conflicts
DROP TABLE IF EXISTS user_badges CASCADE;
DROP TABLE IF EXISTS badges CASCADE;
DROP TABLE IF EXISTS heshima_earnings CASCADE;

-- ====== 1. Add columns to profiles for heshima system ======
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS heshima_balance integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS heshima_cap integer DEFAULT 5000;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_expert boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS expert_since timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak_days integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active_date date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS quizzes_completed integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_contributions integer DEFAULT 0;

-- ====== 2. Badges system ======
CREATE TABLE IF NOT EXISTS badges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  icon text,
  requirement_type text NOT NULL CHECK (requirement_type IN ('heshima_points', 'quizzes_completed', 'posts_created', 'answers_given', 'streak_days', 'sessions_completed')),
  requirement_value integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_badges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id uuid REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at timestamptz DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Insert default badges
INSERT INTO badges (name, description, icon, requirement_type, requirement_value) VALUES
  ('Rising Star', 'Earn 100 Heshima points', '⭐', 'heshima_points', 100),
  ('Knowledge Seeker', 'Earn 500 Heshima points', '📚', 'heshima_points', 500),
  ('Community Sage', 'Earn 1000 Heshima points — Expert status unlocked!', '🧠', 'heshima_points', 1000),
  ('Quiz Champion', 'Complete 10 quizzes', '🏆', 'quizzes_completed', 10),
  ('Quiz Master', 'Complete 50 quizzes', '🎯', 'quizzes_completed', 50),
  ('Conversation Starter', 'Create 10 posts', '💬', 'posts_created', 10),
  ('Helpful Neighbour', 'Answer 25 questions', '🤝', 'answers_given', 25),
  ('Dedicated Learner', '7-day streak', '🔥', 'streak_days', 7),
  ('Mentor Spirit', 'Complete 5 mentoring sessions', '🎓', 'sessions_completed', 5)
ON CONFLICT DO NOTHING;

-- ====== 3. Heshima earnings log ======
CREATE TABLE IF NOT EXISTS heshima_earnings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount integer NOT NULL,
  balance_after integer NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('upvote', 'quiz_completion', 'session_completion', 'daily_bonus', 'achievement_badge', 'contribution_bonus')),
  source_id text,
  description text,
  created_at timestamptz DEFAULT now()
);

-- ====== 4. Expertise categories ======
CREATE TABLE IF NOT EXISTS expertise_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  icon text,
  created_at timestamptz DEFAULT now()
);

INSERT INTO expertise_categories (name, description, icon) VALUES
  ('Agriculture', 'Farming, crop management, livestock, agribusiness', '🌾'),
  ('Technology', 'Software, hardware, IT support, digital skills', '💻'),
  ('Business & Finance', 'Entrepreneurship, accounting, investments, SACCOs', '📈'),
  ('Health & Wellness', 'Medical advice, nutrition, mental health, fitness', '🏥'),
  ('Education', 'Tutoring, academic guidance, career counseling', '📖'),
  ('Legal', 'Legal rights, contracts, land issues, family law', '⚖️'),
  ('Engineering & Construction', 'Civil, mechanical, electrical, building plans', '🔧'),
  ('Arts & Culture', 'Music, film, literature, fashion, design', '🎨'),
  ('Environment', 'Conservation, climate action, renewable energy', '🌿'),
  ('Youth & Sports', 'Talent development, sports coaching, youth mentorship', '⚽')
ON CONFLICT DO NOTHING;

-- ====== 5. Expert applications ======
CREATE TABLE IF NOT EXISTS expert_applications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES expertise_categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  qualifications text NOT NULL,
  experience text NOT NULL,
  certification_urls text[],
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expert_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own applications" ON expert_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own applications" ON expert_applications FOR SELECT USING (auth.uid() = user_id OR auth.uid() = reviewed_by);
CREATE POLICY "Admins can read all" ON expert_applications FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_expert = true));
CREATE POLICY "Admins can update" ON expert_applications FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_expert = true));

-- ====== 6. Marketplace orders ======
CREATE TABLE IF NOT EXISTS marketplace_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid REFERENCES marketplace_listings(id) ON DELETE CASCADE NOT NULL,
  buyer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  seller_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  quantity integer DEFAULT 1,
  total_price numeric(12,2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded')),
  delivery_address text,
  delivery_notes text,
  contact_phone text,
  payment_method text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE marketplace_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyer can read own orders" ON marketplace_orders FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Buyer can insert orders" ON marketplace_orders FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Seller can update orders" ON marketplace_orders FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Buyer can cancel own orders" ON marketplace_orders FOR DELETE USING (auth.uid() = buyer_id AND status = 'pending');

-- ====== 7. Marketplace reviews ======
CREATE TABLE IF NOT EXISTS marketplace_reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES marketplace_orders(id) ON DELETE CASCADE NOT NULL,
  reviewer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  listing_id uuid REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(order_id, reviewer_id)
);

ALTER TABLE marketplace_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read reviews" ON marketplace_reviews FOR SELECT USING (true);
CREATE POLICY "Buyers can insert reviews" ON marketplace_reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- ====== 8. Student help requests ======
CREATE TABLE IF NOT EXISTS student_help_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  subject text,
  budget_heshima integer DEFAULT 0,
  status text DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'completed', 'cancelled')),
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE student_help_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read help requests" ON student_help_requests FOR SELECT USING (true);
CREATE POLICY "Students can insert" ON student_help_requests FOR INSERT WITH CHECK (auth.uid() = student_id);

-- ====== 9. Student sessions (time-tracked tutoring) ======
CREATE TABLE IF NOT EXISTS student_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid REFERENCES student_help_requests(id) ON DELETE SET NULL,
  expert_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  duration_minutes integer,
  heshima_earned integer DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  expert_notes text,
  student_rating integer CHECK (student_rating >= 1 AND student_rating <= 5),
  student_feedback text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE student_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can read sessions" ON student_sessions FOR SELECT USING (auth.uid() = expert_id OR auth.uid() = student_id);
CREATE POLICY "Participants can update" ON student_sessions FOR UPDATE USING (auth.uid() = expert_id OR auth.uid() = student_id);

-- ====== 10. Modified heshima trigger with cap ======
CREATE OR REPLACE FUNCTION update_heshima_rating() RETURNS trigger AS $$
DECLARE
  current_rating integer;
  new_rating integer;
BEGIN
  SELECT heshima_rating INTO current_rating FROM profiles WHERE id = 
    CASE WHEN TG_OP = 'INSERT' THEN NEW.user_id ELSE OLD.user_id END;

  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 1 THEN
      new_rating := LEAST(current_rating + 1, 5000);
      UPDATE profiles SET 
        heshima_rating = new_rating,
        heshima_balance = LEAST(heshima_balance + 1, 5000),
        total_contributions = total_contributions + 1
      WHERE id = NEW.user_id;
      INSERT INTO heshima_earnings (user_id, amount, balance_after, source_type, source_id, description)
      VALUES (NEW.user_id, 1, new_rating, 'upvote', NEW.target_id::text, 'Received an upvote');
    ELSIF NEW.vote_type = -1 THEN
      UPDATE profiles SET heshima_rating = GREATEST(heshima_rating - 1, 0) WHERE id = NEW.user_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 1 THEN
      UPDATE profiles SET 
        heshima_rating = GREATEST(heshima_rating - 1, 0),
        total_contributions = GREATEST(total_contributions - 1, 0)
      WHERE id = OLD.user_id;
    ELSIF OLD.vote_type = -1 THEN
      UPDATE profiles SET heshima_rating = LEAST(heshima_rating + 1, 5000) WHERE id = OLD.user_id;
    END IF;
  END IF;

  -- Check for expert graduation at 1000 points
  IF TG_OP = 'INSERT' AND NEW.vote_type = 1 THEN
    PERFORM check_expert_graduation(NEW.user_id);
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====== 11. Expert graduation function ======
CREATE OR REPLACE FUNCTION check_expert_graduation(p_user_id uuid) RETURNS void AS $$
DECLARE
  rating integer;
BEGIN
  SELECT heshima_rating INTO rating FROM profiles WHERE id = p_user_id;
  IF rating >= 1000 AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND is_expert = true) THEN
    UPDATE profiles SET 
      is_expert = true,
      expert_since = now(),
      is_verified_expert = true
    WHERE id = p_user_id;
    -- Auto-award Community Sage badge
    INSERT INTO user_badges (user_id, badge_id)
    SELECT p_user_id, id FROM badges WHERE requirement_type = 'heshima_points' AND requirement_value = 1000
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ====== 12. Badge award check function ======
CREATE OR REPLACE FUNCTION check_and_award_badges(p_user_id uuid) RETURNS void AS $$
DECLARE
  b RECORD;
  user_heshima integer;
  user_quizzes integer;
  user_posts integer;
  user_answers integer;
  user_streak integer;
  user_sessions integer;
BEGIN
  SELECT heshima_rating, quizzes_completed, streak_days INTO user_heshima, user_quizzes, user_streak FROM profiles WHERE id = p_user_id;
  SELECT count(*) INTO user_posts FROM posts WHERE user_id = p_user_id;
  SELECT count(*) INTO user_answers FROM answers WHERE user_id = p_user_id;
  SELECT count(*) INTO user_sessions FROM student_sessions WHERE expert_id = p_user_id AND status = 'completed';

  FOR b IN SELECT * FROM badges LOOP
    IF EXISTS (SELECT 1 FROM user_badges WHERE user_id = p_user_id AND badge_id = b.id) THEN
      CONTINUE;
    END IF;
    CASE b.requirement_type
      WHEN 'heshima_points' THEN
        IF user_heshima >= b.requirement_value THEN
          INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, b.id);
          INSERT INTO heshima_earnings (user_id, amount, balance_after, source_type, source_id, description)
          VALUES (p_user_id, 50, user_heshima + 50, 'achievement_badge', b.id::text, 'Earned badge: ' || b.name);
          UPDATE profiles SET heshima_balance = LEAST(heshima_balance + 50, 5000) WHERE id = p_user_id;
        END IF;
      WHEN 'quizzes_completed' THEN
        IF user_quizzes >= b.requirement_value THEN
          INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, b.id);
        END IF;
      WHEN 'posts_created' THEN
        IF user_posts >= b.requirement_value THEN
          INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, b.id);
        END IF;
      WHEN 'answers_given' THEN
        IF user_answers >= b.requirement_value THEN
          INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, b.id);
        END IF;
      WHEN 'streak_days' THEN
        IF user_streak >= b.requirement_value THEN
          INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, b.id);
        END IF;
      WHEN 'sessions_completed' THEN
        IF user_sessions >= b.requirement_value THEN
          INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, b.id);
        END IF;
    END CASE;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ====== 13. Quiz completion handler ======
CREATE OR REPLACE FUNCTION handle_quiz_completion() RETURNS trigger AS $$
DECLARE
  heshima_reward integer;
BEGIN
  SELECT COALESCE(heshima_reward, 10) INTO heshima_reward FROM quizzes WHERE id = NEW.quiz_id;
  
  UPDATE profiles SET 
    heshima_rating = LEAST(heshima_rating + heshima_reward, 5000),
    heshima_balance = LEAST(heshima_balance + heshima_reward, 5000),
    quizzes_completed = quizzes_completed + 1,
    total_contributions = total_contributions + heshima_reward
  WHERE id = NEW.user_id;

  INSERT INTO heshima_earnings (user_id, amount, balance_after, source_type, source_id, description)
  SELECT NEW.user_id, heshima_reward, heshima_rating + heshima_reward, 'quiz_completion', NEW.quiz_id::text, 'Completed quiz'
  FROM profiles WHERE id = NEW.user_id;

  PERFORM check_and_award_badges(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====== 14. Session completion handler ======
CREATE OR REPLACE FUNCTION handle_session_completion() RETURNS trigger AS $$
DECLARE
  earned integer;
  current_balance integer;
BEGIN
  IF NEW.status = 'completed' AND OLD.status = 'active' THEN
    earned := NEW.duration_minutes * 2; -- 2 heshima per minute
    earned := LEAST(earned, 200); -- max 200 per session
    
    SELECT heshima_balance INTO current_balance FROM profiles WHERE id = NEW.expert_id;
    
    UPDATE profiles SET 
      heshima_balance = LEAST(heshima_balance + earned, 5000),
      heshima_rating = LEAST(heshima_rating + earned, 5000),
      total_contributions = total_contributions + earned
    WHERE id = NEW.expert_id;

    UPDATE student_sessions SET heshima_earned = earned WHERE id = NEW.id;

    INSERT INTO heshima_earnings (user_id, amount, balance_after, source_type, source_id, description)
    VALUES (NEW.expert_id, earned, current_balance + earned, 'session_completion', NEW.id::text, 'Completed tutoring session');

    -- Deduct from student's heshima balance
    UPDATE profiles SET heshima_balance = GREATEST(heshima_balance - earned, 0)
    WHERE id = NEW.student_id;

    PERFORM check_and_award_badges(NEW.expert_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====== 15. Daily streak function ======
CREATE OR REPLACE FUNCTION update_daily_streak(p_user_id uuid) RETURNS void AS $$
DECLARE
  last_date date;
  today_date date := CURRENT_DATE;
BEGIN
  SELECT last_active_date INTO last_date FROM profiles WHERE id = p_user_id;
  
  IF last_date IS NULL OR last_date < today_date - 1 THEN
    UPDATE profiles SET last_active_date = today_date, streak_days = 1 WHERE id = p_user_id;
  ELSIF last_date = today_date - 1 THEN
    UPDATE profiles SET last_active_date = today_date, streak_days = streak_days + 1 WHERE id = p_user_id;
    -- Daily bonus
    UPDATE profiles SET 
      heshima_balance = LEAST(heshima_balance + 5, 5000),
      heshima_rating = LEAST(heshima_rating + 5, 5000)
    WHERE id = p_user_id;
    INSERT INTO heshima_earnings (user_id, amount, balance_after, source_type, source_id, description)
    VALUES (p_user_id, 5, (SELECT heshima_balance FROM profiles WHERE id = p_user_id), 'daily_bonus', NULL, 'Daily login streak bonus');
  ELSIF last_date = today_date THEN
    -- Already logged in today, do nothing
    NULL;
  END IF;
  
  PERFORM check_and_award_badges(p_user_id);
END;
$$ LANGUAGE plpgsql;

-- ====== 16. Contribution bonus function (weekly) ======
CREATE OR REPLACE FUNCTION award_weekly_contribution_bonus() RETURNS void AS $$
BEGIN
  UPDATE profiles SET
    heshima_balance = LEAST(heshima_balance + 20, 5000),
    heshima_rating = LEAST(heshima_rating + 20, 5000)
  WHERE total_contributions > 0;
  -- This would be called by a cron job
END;
$$ LANGUAGE plpgsql;

-- ====== 17. Recalculate heshima with cap ======
CREATE OR REPLACE FUNCTION recalculate_heshima(p_user_id uuid DEFAULT NULL) RETURNS void AS $$
BEGIN
  IF p_user_id IS NOT NULL THEN
    UPDATE profiles SET heshima_rating = LEAST((
      COALESCE((SELECT COUNT(*) * 2 FROM votes v JOIN posts p ON p.id = v.target_id WHERE v.target_type = 'post' AND v.vote_type = 1 AND p.user_id = p_user_id), 0) +
      COALESCE((SELECT COUNT(*) * 3 FROM answers a JOIN posts p ON p.id = a.post_id WHERE a.user_id = p_user_id AND a.is_expert_solution = TRUE), 0) +
      COALESCE((SELECT COUNT(*) FROM answers a WHERE a.user_id = p_user_id), 0) +
      COALESCE((SELECT COUNT(*) * 5 FROM posts p WHERE p.user_id = p_user_id AND p.is_expert_solution = TRUE), 0) -
      COALESCE((SELECT COUNT(*) * 2 FROM votes v JOIN posts p ON p.id = v.target_id WHERE v.target_type = 'post' AND v.vote_type = -1 AND p.user_id = p_user_id), 0)
    , 0), 5000)
    WHERE id = p_user_id;
  ELSE
    UPDATE profiles pr SET heshima_rating = LEAST((
      COALESCE((SELECT COUNT(*) * 2 FROM votes v JOIN posts p ON p.id = v.target_id WHERE v.target_type = 'post' AND v.vote_type = 1 AND p.user_id = pr.id), 0) +
      COALESCE((SELECT COUNT(*) * 3 FROM answers a JOIN posts p ON p.id = a.post_id WHERE a.user_id = pr.id AND a.is_expert_solution = TRUE), 0) +
      COALESCE((SELECT COUNT(*) FROM answers a WHERE a.user_id = pr.id), 0) +
      COALESCE((SELECT COUNT(*) * 5 FROM posts p WHERE p.user_id = pr.id AND p.is_expert_solution = TRUE), 0) -
      COALESCE((SELECT COUNT(*) * 2 FROM votes v JOIN posts p ON p.id = v.target_id WHERE v.target_type = 'post' AND v.vote_type = -1 AND p.user_id = pr.id), 0)
    , 0), 5000);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ====== 18. Add quiz_attempts table if not exists ======
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  quiz_id uuid REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  score integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  answers jsonb DEFAULT '[]',
  completed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, quiz_id, completed_at)
);

ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own attempts" ON quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own attempts" ON quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ====== 19. Add trigger for quiz completion ======
DROP TRIGGER IF EXISTS on_quiz_completed ON quiz_attempts;
CREATE TRIGGER on_quiz_completed
  AFTER INSERT ON quiz_attempts
  FOR EACH ROW
  EXECUTE FUNCTION handle_quiz_completion();

-- ====== 20. Add trigger for session completion ======
DROP TRIGGER IF EXISTS on_session_completed ON student_sessions;
CREATE TRIGGER on_session_completed
  AFTER UPDATE ON student_sessions
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status = 'active')
  EXECUTE FUNCTION handle_session_completion();

-- ====== 21. Add marketplace_listings increment_views if not exists ======
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'marketplace_listings' AND column_name = 'seller_rating') THEN
    ALTER TABLE marketplace_listings ADD COLUMN seller_rating numeric(2,1) DEFAULT 0;
    ALTER TABLE marketplace_listings ADD COLUMN orders_count integer DEFAULT 0;
    ALTER TABLE marketplace_listings ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;

-- ====== 22. Add marketplace messages table ======
CREATE TABLE IF NOT EXISTS marketplace_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES marketplace_orders(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE marketplace_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can read messages" ON marketplace_messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can insert messages" ON marketplace_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- ====== 23. Add student subject areas ======
CREATE TABLE IF NOT EXISTS subject_areas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  icon text,
  created_at timestamptz DEFAULT now()
);

INSERT INTO subject_areas (name, description, icon) VALUES
  ('Mathematics', 'Algebra, geometry, calculus, statistics', '📐'),
  ('English', 'Grammar, literature, composition, oral skills', '📝'),
  ('Kiswahili', 'Sarufi, fasihi, insha, ufahamu', '📖'),
  ('Sciences', 'Biology, chemistry, physics, general science', '🔬'),
  ('History & Government', 'World history, Kenyan history, civics', '📜'),
  ('Geography', 'Physical geography, human geography, map reading', '🌍'),
  ('Business Studies', 'Accounting, commerce, entrepreneurship', '💼'),
  ('Computer Studies', 'Programming, ICT, digital literacy', '💻'),
  ('Religious Education', 'CRE, Islamic studies, Hindu studies', '🕊️'),
  ('Agriculture', 'Farming, livestock, soil science', '🌾'),
  ('Home Science', 'Foods, clothing, home management', '🍳'),
  ('Art & Design', 'Drawing, painting, graphic design, photography', '🎨')
ON CONFLICT DO NOTHING;

-- ====== 24. Enable realtime for new tables ======
ALTER PUBLICATION supabase_realtime ADD TABLE heshima_earnings;
ALTER PUBLICATION supabase_realtime ADD TABLE user_badges;
ALTER PUBLICATION supabase_realtime ADD TABLE expert_applications;
ALTER PUBLICATION supabase_realtime ADD TABLE marketplace_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE marketplace_reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE student_help_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE student_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_attempts;
ALTER PUBLICATION supabase_realtime ADD TABLE marketplace_messages;
