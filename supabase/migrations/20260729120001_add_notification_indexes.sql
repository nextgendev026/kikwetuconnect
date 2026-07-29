-- Notification improvements: indexes, meta column, RLS for insert

-- Add meta JSONB column for structured data (deep links, action URLs, etc.)
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;

-- Fast unread count lookup
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON public.notifications(user_id, is_read, created_at DESC);

-- Composite index for type-based queries
CREATE INDEX IF NOT EXISTS notifications_type_idx ON public.notifications(user_id, type, created_at DESC);

-- RLS policy for server insert (service_role / anon via API allowed)
DROP POLICY IF EXISTS "Server can insert notifications" ON public.notifications;
CREATE POLICY "Server can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Function to create a notification (usable from server or triggers)
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_actor_id uuid DEFAULT NULL,
  p_type text DEFAULT 'system',
  p_target_id uuid DEFAULT NULL,
  p_target_type text DEFAULT NULL,
  p_content text DEFAULT '',
  p_meta jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.notifications (user_id, actor_id, type, target_id, target_type, content, meta)
  VALUES (p_user_id, p_actor_id, p_type, p_target_id, p_target_type, p_content, p_meta)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
