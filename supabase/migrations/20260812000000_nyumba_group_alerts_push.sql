-- Nyumba Kumi: post alerts inside a group + device push on publish.
-- 1. Tag alerts with an optional neighbourhood group.
-- 2. create_nyumba_alert accepts p_group_id so alerts can be scoped to a group.
-- 3. A pg_net webhook fires on alert INSERT so group members get a web-push
--    notification even when the app is closed (user's device).

-- Group association
ALTER TABLE public.nyumba_kumi_alerts
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.nyumba_kumi_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_nka_group ON public.nyumba_kumi_alerts(group_id);

-- Recreate the alert RPC: optional group targeting, deduped notifications.
DROP FUNCTION IF EXISTS public.create_nyumba_alert(uuid, text, text, text, text, text);
CREATE OR REPLACE FUNCTION public.create_nyumba_alert(
  p_user_id uuid,
  p_alert_type text,
  p_title text,
  p_description text,
  p_location text,
  p_severity text,
  p_group_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alert_id uuid;
  group_record RECORD;
  member_record RECORD;
  notify_user_id uuid;
  notified_ids uuid[] := '{}';
  notification_count integer := 0;
  rate_check jsonb;
  v_group_name text := 'Neighbourhood';
BEGIN
  rate_check := public.check_alert_rate_limit((select auth.uid()));
  IF NOT (rate_check->>'allowed')::boolean THEN
    RETURN jsonb_build_object('error', rate_check->>'reason');
  END IF;

  -- Optionally scope this alert to a specific group.
  IF p_group_id IS NOT NULL THEN
    SELECT name INTO v_group_name FROM public.nyumba_kumi_groups WHERE id = p_group_id;
  END IF;

  INSERT INTO public.nyumba_kumi_alerts (user_id, type, title, description, county, approximate_location, severity, confirmations, group_id)
  VALUES ((select auth.uid()), p_alert_type, p_title, p_description, p_location, p_location, p_severity, 1, p_group_id)
  RETURNING id INTO alert_id;

  INSERT INTO public.nyumba_kumi_confirmations (user_id, alert_id)
  VALUES ((select auth.uid()), alert_id)
  ON CONFLICT DO NOTHING;

  -- Notify members of the targeted group first.
  IF p_group_id IS NOT NULL THEN
    FOR notify_user_id IN
      SELECT user_id FROM public.nyumba_kumi_group_members
      WHERE group_id = p_group_id AND user_id != (select auth.uid())
    LOOP
      IF NOT (notify_user_id = ANY (notified_ids)) THEN
        notified_ids := notified_ids || notify_user_id;
        INSERT INTO public.notifications (user_id, type, title, body, data)
        VALUES (notify_user_id, 'nyumba_alert', p_title, p_description,
          jsonb_build_object('alert_id', alert_id, 'alert_type', p_alert_type,
            'severity', p_severity, 'location', p_location,
            'group_name', v_group_name, 'group_id', p_group_id,
            'actor_id', (select auth.uid())));
        notification_count := notification_count + 1;
      END IF;
    END LOOP;
  END IF;

  -- Notify members of all groups matching the alert's location/county (unless
  -- already notified via the specific group above).
  FOR group_record IN
    SELECT g.id, g.name FROM public.nyumba_kumi_groups g
    WHERE g.county = p_location OR g.county IS NULL
  LOOP
    FOR member_record IN
      SELECT user_id FROM public.nyumba_kumi_group_members
      WHERE group_id = group_record.id AND user_id != (select auth.uid())
    LOOP
      IF member_record.user_id = ANY (notified_ids) THEN CONTINUE; END IF;
      notified_ids := notified_ids || member_record.user_id;
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (member_record.user_id, 'nyumba_alert', p_title, p_description,
        jsonb_build_object('alert_id', alert_id, 'alert_type', p_alert_type,
          'severity', p_severity, 'location', p_location,
          'group_name', group_record.name, 'group_id', NULL,
          'actor_id', (select auth.uid())));
      notification_count := notification_count + 1;
    END LOOP;
  END LOOP;

  -- Also notify trusted neighbours who share the same county.
  FOR member_record IN
    SELECT DISTINCT t.user_id FROM public.nyumba_kumi_trusted t
    JOIN public.profiles p ON p.id = t.user_id
    WHERE t.trusted_id = (select auth.uid()) AND t.user_id != (select auth.uid())
      AND (p.county_hub = p_location OR p.county_hub IS NULL)
  LOOP
    IF member_record.user_id = ANY (notified_ids) THEN CONTINUE; END IF;
    notified_ids := notified_ids || member_record.user_id;
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (member_record.user_id, 'nyumba_alert', p_title, p_description,
      jsonb_build_object('alert_id', alert_id, 'alert_type', p_alert_type,
        'severity', p_severity, 'location', p_location, 'actor_id', (select auth.uid())))
    ON CONFLICT DO NOTHING;
    notification_count := notification_count + 1;
  END LOOP;

  INSERT INTO public.admin_activity (admin_id, action, target_type, target_id, details)
  VALUES ((select auth.uid()), 'create_nyumba_alert', 'nyumba_kumi_alert', alert_id::text,
    jsonb_build_object('alert_type', p_alert_type, 'severity', p_severity,
      'location', p_location, 'title', p_title, 'group_id', p_group_id,
      'group_name', v_group_name, 'notifications_sent', notification_count));

  IF p_severity IN ('high', 'critical') AND
     (SELECT COUNT(*) FROM public.nyumba_kumi_alerts
      WHERE user_id = (select auth.uid()) AND created_at > now() - interval '1 hour') >= 2
  THEN
    INSERT INTO public.moderation_queue (target_type, target_id, reporter_id, reason, status)
    VALUES ('nyumba_kumi_alert', alert_id, (select auth.uid()),
      'Automated: multiple high-severity alerts in short period', 'pending');
  END IF;

  RETURN jsonb_build_object('id', alert_id, 'notifications_sent', notification_count,
    'group_name', v_group_name);
END;
$$;

-- Fire a web-push webhook whenever an alert is inserted, so members' devices
-- get a push. The webhook reads notifications rows created above to find
-- recipients (async, so it runs after commit).
CREATE OR REPLACE FUNCTION public.notify_nyumba_alert_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  v_secret text;
  v_url text;
  v_body jsonb;
BEGIN
  if new.id is null then
    return new;
  end if;

  select value into v_secret
  from public.app_settings
  where key = 'push_webhook_secret';

  if v_secret is null then
    return new;
  end if;

  v_url := 'https://kikwetuconnect.vercel.app/api/webhooks/supabase';

  v_body := jsonb_build_object(
    'type', 'nyumba_alert',
    'alert_id', new.id,
    'group_id', new.group_id,
    'title', new.title,
    'severity', new.severity
  );

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-kc-secret', v_secret
    ),
    body := v_body
  );

  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists nyumba_alerts_push_notify on public.nyumba_kumi_alerts;

create trigger nyumba_alerts_push_notify
  after insert on public.nyumba_kumi_alerts
  for each row execute function public.notify_nyumba_alert_push();

revoke all on function public.notify_nyumba_alert_push() from public, anon, authenticated;