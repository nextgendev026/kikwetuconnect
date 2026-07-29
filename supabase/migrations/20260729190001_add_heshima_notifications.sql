-- Heshima notifications triggers

CREATE OR REPLACE FUNCTION notify_on_heshima_earnings()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    NEW.user_id,
    'heshima_earning',
    'You earned Heshima points!',
    CONCAT('+', NEW.amount::text, ' Heshima — ', COALESCE(NEW.description, '')),
    jsonb_build_object('earning_id', NEW.id, 'amount', NEW.amount, 'source', NEW.source_type, 'source_id', NEW.source_id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_notify_heshima_earnings ON heshima_earnings;
CREATE TRIGGER tr_notify_heshima_earnings
AFTER INSERT ON heshima_earnings
FOR EACH ROW EXECUTE FUNCTION notify_on_heshima_earnings();

CREATE OR REPLACE FUNCTION notify_on_badge_awarded()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  b RECORD;
BEGIN
  SELECT name, description, icon INTO b FROM badges WHERE id = NEW.badge_id;
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    NEW.user_id,
    'badge_awarded',
    'New badge earned!',
    CONCAT('You earned the "', COALESCE(b.name, 'Badge'), '" badge. ', COALESCE(b.description, '')),
    jsonb_build_object('badge_id', NEW.badge_id, 'badge_name', b.name, 'badge_icon', b.icon)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_notify_user_badges ON user_badges;
CREATE TRIGGER tr_notify_user_badges
AFTER INSERT ON user_badges
FOR EACH ROW EXECUTE FUNCTION notify_on_badge_awarded();
