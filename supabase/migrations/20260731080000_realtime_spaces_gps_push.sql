-- Add space_members to realtime publication for live member updates
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'space_members') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE space_members;
  END IF;
END
$$;

-- Create notification_preferences table for per-user push/email settings
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  push_enabled boolean DEFAULT true,
  email_enabled boolean DEFAULT true,
  types jsonb DEFAULT '{"upvote":true,"answer":true,"reply":true,"mention":true,"follow":true,"session_request":true,"tip":true,"payout":true,"badge":true,"alert":true,"system":true}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add GPS location columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_updated_at timestamptz;

-- RPC to update user location
CREATE OR REPLACE FUNCTION public.update_user_location(p_lat double precision, p_lng double precision)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET latitude = p_lat, longitude = p_lng, location_updated_at = now()
  WHERE id = auth.uid();
END;
$$;

-- Add profiles to realtime publication (for location sync, if not already added)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
  END IF;
END
$$;

-- Notification preferences publication
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notification_preferences') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notification_preferences;
  END IF;
END
$$;
