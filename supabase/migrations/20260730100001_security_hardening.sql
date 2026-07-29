-- Security hardening: RLS, policies, audit RPCs
-- 1. Enable RLS on unprotected tables
-- 2. Replace permissive policies with least-privilege
-- 3. Create atomic admin RPCs (suspend, moderate, bulk actions)
-- 4. Create moderation notification trigger

-- ============================================================
-- PART 1: Enable RLS on tables that were created without it
-- ============================================================

ALTER TABLE IF EXISTS heshima_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quiz_results ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 2: Fix overly permissive RLS policies
-- ============================================================

-- --- notifications: users see own, server inserts ---
DROP POLICY IF EXISTS notifications_read_all ON notifications;
DROP POLICY IF EXISTS notifications_insert_all ON notifications;
DROP POLICY IF EXISTS notifications_update_all ON notifications;

CREATE POLICY notifications_read_own ON notifications
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY notifications_insert_server ON notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY notifications_update_own ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- --- admin_activity: admins read, server inserts ---
DROP POLICY IF EXISTS aa_read_all ON admin_activity;
DROP POLICY IF EXISTS aa_insert_all ON admin_activity;

CREATE POLICY aa_read_admin ON admin_activity
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY aa_insert_server ON admin_activity
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- --- moderation_queue: restrict read to admins ---
DROP POLICY IF EXISTS mq_read_all ON moderation_queue;

CREATE POLICY mq_read_admin ON moderation_queue
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- --- messages: only conversation participants ---
DROP POLICY IF EXISTS messages_read_all ON messages;

CREATE POLICY messages_read_participant ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
  );

-- --- conversations: only participants ---
DROP POLICY IF EXISTS conversations_read_all ON conversations;

CREATE POLICY conversations_read_participant ON conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = conversations.id AND user_id = auth.uid()
    )
  );

-- --- conversation_participants: only own entries ---
DROP POLICY IF EXISTS cp_read_all ON conversation_participants;

CREATE POLICY cp_read_own ON conversation_participants
  FOR SELECT USING (user_id = auth.uid());

-- --- user_locations: only own location, or admins ---
DROP POLICY IF EXISTS ul_read_all ON user_locations;

CREATE POLICY ul_read_own ON user_locations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY ul_read_admin ON user_locations
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- --- heshima_earnings: users see own ---
CREATE POLICY he_read_own ON heshima_earnings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY he_read_admin ON heshima_earnings
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- RPC-only insert (no client-side INSERT policy)
CREATE POLICY he_insert_rpc_only ON heshima_earnings
  FOR INSERT WITH CHECK (false);

-- --- user_badges: users see own ---
CREATE POLICY ub_select_own ON user_badges
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY ub_select_admin ON user_badges
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY ub_insert_rpc_only ON user_badges
  FOR INSERT WITH CHECK (false);

-- --- quizzes: anyone can read authenticated ---
CREATE POLICY quizzes_read_auth ON quizzes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY quizzes_insert_admin ON quizzes
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY quizzes_update_admin ON quizzes
  FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- --- quiz_questions: anyone can read ---
CREATE POLICY qq_read_auth ON quiz_questions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY qq_insert_admin ON quiz_questions
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY qq_update_admin ON quiz_questions
  FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- --- quiz_results: users see own ---
CREATE POLICY qr_read_own ON quiz_results
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY qr_read_admin ON quiz_results
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY qr_insert_own ON quiz_results
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- --- post_translations: anyone can read, RPC-only insert ---
DROP POLICY IF EXISTS pt_read_all ON post_translations;
DROP POLICY IF EXISTS pt_insert_server ON post_translations;

CREATE POLICY pt_read_all ON post_translations
  FOR SELECT USING (true);

CREATE POLICY pt_insert_server ON post_translations
  FOR INSERT WITH CHECK (false);

-- ============================================================
-- PART 3: Admin RPCs (atomic + audited)
-- ============================================================

-- Suspend a user (atomic: update profile + log + notify)
CREATE OR REPLACE FUNCTION admin_suspend_user(p_admin_id uuid, p_user_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can suspend users';
  END IF;

  UPDATE profiles SET suspended = true, updated_at = now() WHERE id = p_user_id;

  INSERT INTO admin_activity (admin_id, action, target_type, target_id, details, created_at)
  VALUES (p_admin_id, 'suspend_user', 'profile', p_user_id::text, jsonb_build_object('reason', p_reason), now());

  INSERT INTO notifications (user_id, type, title, body, data, created_at)
  VALUES (p_user_id, 'account_suspended', 'Account suspended', p_reason, jsonb_build_object('by', p_admin_id), now());
END;
$$;

-- Reinstate a user
CREATE OR REPLACE FUNCTION admin_reinstate_user(p_admin_id uuid, p_user_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can reinstate users';
  END IF;

  UPDATE profiles SET suspended = false, updated_at = now() WHERE id = p_user_id;

  INSERT INTO admin_activity (admin_id, action, target_type, target_id, details, created_at)
  VALUES (p_admin_id, 'reinstate_user', 'profile', p_user_id::text, jsonb_build_object('reason', p_reason), now());

  INSERT INTO notifications (user_id, type, title, body, data, created_at)
  VALUES (p_user_id, 'account_reinstated', 'Account reinstated', p_reason, jsonb_build_object('by', p_admin_id), now());
END;
$$;

-- Moderate an item (dismiss / action_taken)
CREATE OR REPLACE FUNCTION admin_moderate_item(p_admin_id uuid, p_item_id uuid, p_status text, p_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can moderate items';
  END IF;

  IF p_status NOT IN ('dismissed', 'action_taken', 'reviewed') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;

  UPDATE moderation_queue
  SET status = p_status, reviewed_by = p_admin_id, notes = COALESCE(p_notes, notes), reviewed_at = now()
  WHERE id = p_item_id;

  INSERT INTO admin_activity (admin_id, action, target_type, target_id, details, created_at)
  VALUES (p_admin_id, 'moderate_' || p_status, 'moderation_queue', p_item_id::text, jsonb_build_object('notes', p_notes), now());
END;
$$;

-- Bulk moderate items
CREATE OR REPLACE FUNCTION admin_bulk_moderate(p_admin_id uuid, p_item_ids uuid[], p_status text, p_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can moderate items';
  END IF;

  FOREACH item_id IN ARRAY p_item_ids
  LOOP
    PERFORM admin_moderate_item(p_admin_id, item_id, p_status, p_notes);
  END LOOP;
END;
$$;

-- ============================================================
-- PART 4: Moderation notification trigger
-- ============================================================

CREATE OR REPLACE FUNCTION notify_admins_of_moderation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, body, data, created_at)
  VALUES (NULL, 'moderation_request', 'New moderation item', NEW.reason, jsonb_build_object('id', NEW.id, 'target_type', NEW.target_type, 'target_id', NEW.target_id), now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_moderation_notify ON moderation_queue;
CREATE TRIGGER tr_moderation_notify
  AFTER INSERT ON moderation_queue
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_of_moderation();

-- ============================================================
-- PART 5: Indexes for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_created ON moderation_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_target ON moderation_queue(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_heshima_earnings_user ON heshima_earnings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_heshima_earnings_source ON heshima_earnings(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_admin ON admin_activity(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_action ON admin_activity(action, created_at DESC);
