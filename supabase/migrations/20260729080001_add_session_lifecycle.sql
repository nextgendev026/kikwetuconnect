-- Add granular statuses to student_sessions, tighten RLS for server-only writes

-- 1. Widen student_help_requests status to include in_progress
ALTER TABLE public.student_help_requests DROP CONSTRAINT IF EXISTS student_help_requests_status_check;
ALTER TABLE public.student_help_requests ADD CONSTRAINT student_help_requests_status_check
  CHECK (status IN ('open', 'assigned', 'in_progress', 'completed', 'cancelled'));

-- 2. Widen student_sessions status to include requested, in_progress
ALTER TABLE public.student_sessions DROP CONSTRAINT IF EXISTS student_sessions_status_check;
ALTER TABLE public.student_sessions ADD CONSTRAINT student_sessions_status_check
  CHECK (status IN ('requested', 'active', 'in_progress', 'completed', 'cancelled'));

-- 3. Update trigger to fire for both active→completed and in_progress→completed transitions
DROP TRIGGER IF EXISTS on_session_completed ON student_sessions;
CREATE TRIGGER on_session_completed
  AFTER UPDATE ON student_sessions
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IN ('active', 'in_progress'))
  EXECUTE FUNCTION handle_session_completion();

-- 4. Tighten RLS: remove client-side UPDATE/DELETE on student_sessions (must go through API)
DROP POLICY IF EXISTS "Participants can update" ON student_sessions;
-- SELECT stays for participants + admin
DROP POLICY IF EXISTS "Participants can read sessions" ON student_sessions;
CREATE POLICY "Participants can read sessions" ON student_sessions
  FOR SELECT USING (
    auth.uid() = expert_id OR
    auth.uid() = student_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 5. Tighten student_help_requests: only SELECT and INSERT are OK from client; UPDATE through API
DROP POLICY IF EXISTS "Students can insert" ON student_help_requests;
CREATE POLICY "Students can insert" ON student_help_requests
  FOR INSERT WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Anyone can read help requests" ON student_help_requests;
CREATE POLICY "Anyone can read help requests" ON student_help_requests
  FOR SELECT USING (true);

-- 6. Add realtime for student_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE student_sessions;

-- 7. Reset the trigger status check to handle requested→active transitions too
CREATE OR REPLACE FUNCTION handle_session_completion() RETURNS trigger AS $$
DECLARE
  earned integer;
  current_balance integer;
BEGIN
  IF NEW.status = 'completed' AND OLD.status IN ('active', 'in_progress') THEN
    earned := NEW.duration_minutes * 2;
    earned := LEAST(earned, 200);

    SELECT heshima_balance INTO current_balance FROM profiles WHERE id = NEW.expert_id;

    UPDATE profiles SET
      heshima_balance = LEAST(heshima_balance + earned, 5000),
      heshima_rating = LEAST(heshima_rating + earned, 5000),
      total_contributions = total_contributions + earned
    WHERE id = NEW.expert_id;

    UPDATE student_sessions SET heshima_earned = earned WHERE id = NEW.id;

    INSERT INTO heshima_earnings (user_id, amount, balance_after, source_type, source_id, description)
    VALUES (NEW.expert_id, earned, current_balance + earned, 'session_completion', NEW.id::text, 'Completed tutoring session');

    UPDATE profiles SET heshima_balance = GREATEST(heshima_balance - earned, 0)
    WHERE id = NEW.student_id;

    PERFORM check_and_award_badges(NEW.expert_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
