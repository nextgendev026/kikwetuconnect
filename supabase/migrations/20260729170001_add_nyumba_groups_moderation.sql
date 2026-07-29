-- Nyumba Kumi neighbourhood groups and moderation system

-- 1. Neighbourhood groups
CREATE TABLE IF NOT EXISTS nyumba_kumi_groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  county text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  is_public boolean DEFAULT true,
  member_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nyumba_kumi_group_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES nyumba_kumi_groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS nyumba_kumi_invites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES nyumba_kumi_groups(id) ON DELETE CASCADE,
  inviter_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  code text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz DEFAULT now()
);

-- 2. Moderation queue for flagged content
CREATE TABLE IF NOT EXISTS moderation_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  reporter_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reason text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'action_taken')),
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_nkg_slug ON nyumba_kumi_groups(slug);
CREATE INDEX IF NOT EXISTS idx_nkg_county ON nyumba_kumi_groups(county);
CREATE INDEX IF NOT EXISTS idx_nkgm_group ON nyumba_kumi_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_nkgm_user ON nyumba_kumi_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_mq_status ON moderation_queue(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mq_target ON moderation_queue(target_type, target_id);

-- 4. RLS
ALTER TABLE nyumba_kumi_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE nyumba_kumi_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE nyumba_kumi_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nkg_read_all' AND tablename = 'nyumba_kumi_groups') THEN
    CREATE POLICY nkg_read_all ON nyumba_kumi_groups FOR SELECT USING (true);
    CREATE POLICY nkg_insert_auth ON nyumba_kumi_groups FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    CREATE POLICY nkg_update_owner_admin ON nyumba_kumi_groups FOR UPDATE USING (created_by = auth.uid());
    CREATE POLICY nkg_delete_owner ON nyumba_kumi_groups FOR DELETE USING (created_by = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nkgm_read_all' AND tablename = 'nyumba_kumi_group_members') THEN
    CREATE POLICY nkgm_read_all ON nyumba_kumi_group_members FOR SELECT USING (true);
    CREATE POLICY nkgm_insert_auth ON nyumba_kumi_group_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    CREATE POLICY nkgm_delete_own ON nyumba_kumi_group_members FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nki_read_all' AND tablename = 'nyumba_kumi_invites') THEN
    CREATE POLICY nki_read_all ON nyumba_kumi_invites FOR SELECT USING (true);
    CREATE POLICY nki_insert_auth ON nyumba_kumi_invites FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    CREATE POLICY nki_update_invitee ON nyumba_kumi_invites FOR UPDATE USING (invitee_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mq_read_all' AND tablename = 'moderation_queue') THEN
    CREATE POLICY mq_read_all ON moderation_queue FOR SELECT USING (true);
    CREATE POLICY mq_insert_auth ON moderation_queue FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    CREATE POLICY mq_update_admin ON moderation_queue FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- 5. Rate-limit check function
CREATE OR REPLACE FUNCTION check_alert_rate_limit(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  recent_count integer;
  cooldown_seconds integer := 900; -- 15 minutes
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM nyumba_kumi_alerts
  WHERE user_id = p_user_id
    AND created_at > now() - (cooldown_seconds || ' seconds')::interval;

  IF recent_count >= 3 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Rate limit exceeded. Maximum 3 alerts per 15 minutes.',
      'retry_after_seconds', cooldown_seconds
    );
  END IF;

  RETURN jsonb_build_object('allowed', true, 'recent_count', recent_count);
END;
$$;

-- 6. Function to create alert with notifications and logging
CREATE OR REPLACE FUNCTION create_nyumba_alert(
  p_user_id uuid,
  p_alert_type text,
  p_title text,
  p_description text,
  p_location text,
  p_severity text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  alert_id uuid;
  group_record RECORD;
  member_record RECORD;
  notification_count integer := 0;
  rate_check jsonb;
BEGIN
  -- Check rate limit
  rate_check := check_alert_rate_limit(p_user_id);
  IF NOT (rate_check->>'allowed')::boolean THEN
    RETURN jsonb_build_object('error', rate_check->>'reason');
  END IF;

  -- Insert alert
  INSERT INTO nyumba_kumi_alerts (user_id, alert_type, title, description, location, severity, confirmations_count)
  VALUES (p_user_id, p_alert_type, p_title, p_description, p_location, p_severity, 1)
  RETURNING id INTO alert_id;

  -- Auto-confirm by creator
  INSERT INTO nyumba_kumi_confirmations (user_id, alert_id)
  VALUES (p_user_id, alert_id)
  ON CONFLICT DO NOTHING;

  -- Notify all members of groups that match the alert's location/county
  FOR group_record IN
    SELECT g.id, g.name FROM nyumba_kumi_groups g
    WHERE g.county = p_location OR g.county IS NULL
  LOOP
    FOR member_record IN
      SELECT user_id FROM nyumba_kumi_group_members
      WHERE group_id = group_record.id AND user_id != p_user_id
    LOOP
      INSERT INTO notifications (user_id, type, title, body, data)
      VALUES (
        member_record.user_id,
        'nyumba_alert',
        p_title,
        p_description,
        jsonb_build_object(
          'alert_id', alert_id,
          'alert_type', p_alert_type,
          'severity', p_severity,
          'location', p_location,
          'group_name', group_record.name,
          'actor_id', p_user_id
        )
      );
      notification_count := notification_count + 1;
    END LOOP;
  END LOOP;

  -- Also notify trusted neighbours who share the same county
  FOR member_record IN
    SELECT DISTINCT t.user_id FROM nyumba_kumi_trusted t
    JOIN profiles p ON p.id = t.user_id
    WHERE t.trusted_id = p_user_id AND t.user_id != p_user_id
      AND (p.county_hub = p_location OR p.county_hub IS NULL)
  LOOP
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      member_record.user_id,
      'nyumba_alert',
      p_title,
      p_description,
      jsonb_build_object(
        'alert_id', alert_id,
        'alert_type', p_alert_type,
        'severity', p_severity,
        'location', p_location,
        'actor_id', p_user_id
      )
    )
    ON CONFLICT DO NOTHING;
    notification_count := notification_count + 1;
  END LOOP;

  -- Log admin activity
  INSERT INTO admin_activity (admin_id, action, target_type, target_id, details)
  VALUES (p_user_id, 'create_nyumba_alert', 'nyumba_kumi_alert', alert_id::text,
    jsonb_build_object(
      'alert_type', p_alert_type,
      'severity', p_severity,
      'location', p_location,
      'title', p_title,
      'notifications_sent', notification_count
    )
  );

  -- Flag suspicious content for moderation
  IF p_severity IN ('high', 'critical') AND
     (SELECT COUNT(*) FROM nyumba_kumi_alerts
      WHERE user_id = p_user_id AND created_at > now() - interval '1 hour') >= 2
  THEN
    INSERT INTO moderation_queue (target_type, target_id, reporter_id, reason, status)
    VALUES (
      'nyumba_kumi_alert', alert_id, p_user_id,
      'Automated: multiple high-severity alerts in short period',
      'pending'
    );
  END IF;

  RETURN jsonb_build_object('id', alert_id, 'notifications_sent', notification_count);
END;
$$;

-- 7. Enable realtime
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'nyumba_kumi_groups') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE nyumba_kumi_groups;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'nyumba_kumi_group_members') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE nyumba_kumi_group_members;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'nyumba_kumi_invites') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE nyumba_kumi_invites;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'moderation_queue') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE moderation_queue;
  END IF;
END $$;

-- 8. Member count trigger
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE nyumba_kumi_groups SET member_count = member_count + 1 WHERE id = NEW.group_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE nyumba_kumi_groups SET member_count = greatest(member_count - 1, 0) WHERE id = OLD.group_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS nkg_member_count_trigger ON nyumba_kumi_group_members;
CREATE TRIGGER nkg_member_count_trigger
  AFTER INSERT OR DELETE ON nyumba_kumi_group_members
  FOR EACH ROW EXECUTE FUNCTION update_group_member_count();
