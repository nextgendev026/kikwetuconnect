-- Lower expert graduation threshold from 1000 to 500 Heshima points.
-- When a user reaches 500 Heshima, they get is_expert = true and
-- is_verified_expert = true, and an admin notification is created.

CREATE OR REPLACE FUNCTION check_expert_graduation(p_user_id uuid) RETURNS void AS $$
DECLARE
  rating integer;
  admin_id uuid;
BEGIN
  SELECT heshima_rating INTO rating FROM profiles WHERE id = p_user_id;
  IF rating IS NULL THEN RETURN; END IF;

  IF rating >= 500 AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND is_expert = true) THEN
    -- Find an admin to notify
    SELECT id INTO admin_id FROM profiles WHERE role = 'admin' LIMIT 1;

    UPDATE profiles SET
      is_expert = true,
      expert_since = now(),
      is_verified_expert = true
    WHERE id = p_user_id;

    -- Auto-award the milestone badge for 500 Heshima
    INSERT INTO user_badges (user_id, badge_id)
    SELECT p_user_id, id FROM badges
    WHERE requirement_type = 'heshima_points' AND requirement_value = 500
    ON CONFLICT DO NOTHING;

    -- Notify the user
    INSERT INTO notifications (user_id, type, title, body, data, created_at)
    VALUES (
      p_user_id,
      'badge_earned',
      '🎓 Expert Status Achieved',
      'Congratulations! You have graduated to Verified Expert at 500 Heshima points.',
      jsonb_build_object('badge_id', (SELECT id FROM badges WHERE requirement_type = 'heshima_points' AND requirement_value = 500), 'heshima_rating', rating),
      now()
    );

    -- Notify admins to review the auto-graduation
    IF admin_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, body, data, created_at)
      VALUES (
        admin_id,
        'system_alert',
        '🆕 New Auto-Graded Expert',
        (SELECT full_name FROM profiles WHERE id = p_user_id) || ' has been auto-graduated to Expert at ' || rating || ' Heshima points. Please review.',
        jsonb_build_object('user_id', p_user_id, 'heshima_rating', rating),
        now()
      );
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing badge thresholds to include 500 if missing
INSERT INTO badges (name, description, icon, requirement_type, requirement_value)
VALUES ('Savannah Scholar', 'Reach 500 Heshima points — you are now a Verified Expert!', '🦏', 'heshima_points', 500)
ON CONFLICT DO NOTHING;

-- Backfill: auto-graduate existing users who already have 500+ Heshima
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM profiles WHERE heshima_rating >= 500 AND is_expert = false
  LOOP
    PERFORM check_expert_graduation(r.id);
  END LOOP;
END $$;
