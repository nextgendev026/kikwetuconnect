-- Optimize RLS policies: wrap auth.uid() in subquery to avoid per-row re-evaluation

DROP POLICY IF EXISTS cp_read_own ON conversation_participants;
CREATE POLICY cp_read_own ON conversation_participants
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS messages_read_participant ON messages;
CREATE POLICY messages_read_participant ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
        AND conversation_participants.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS conversations_read_participant ON conversations;
CREATE POLICY conversations_read_participant ON conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
        AND conversation_participants.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS notifications_read_own ON notifications;
CREATE POLICY notifications_read_own ON notifications
  FOR SELECT USING ((select auth.uid()) = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS notifications_update_own ON notifications;
CREATE POLICY notifications_update_own ON notifications
  FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS notifications_insert_server ON notifications;
CREATE POLICY notifications_insert_server ON notifications
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS he_read_own ON heshima_earnings;
CREATE POLICY he_read_own ON heshima_earnings
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS ub_select_own ON user_badges;
CREATE POLICY ub_select_own ON user_badges
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS ul_read_own ON user_locations;
CREATE POLICY ul_read_own ON user_locations
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS qr_read_own ON quiz_results;
CREATE POLICY qr_read_own ON quiz_results
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS qr_insert_own ON quiz_results;
CREATE POLICY qr_insert_own ON quiz_results
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS sa_read_auth ON subject_areas;
CREATE POLICY sa_read_auth ON subject_areas
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS ec_read_auth ON expertise_categories;
CREATE POLICY ec_read_auth ON expertise_categories
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS quizzes_read_auth ON quizzes;
CREATE POLICY quizzes_read_auth ON quizzes
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS qq_read_auth ON quiz_questions;
CREATE POLICY qq_read_auth ON quiz_questions
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);
