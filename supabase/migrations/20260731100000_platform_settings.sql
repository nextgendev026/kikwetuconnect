-- Platform settings table for admin dashboard
CREATE TABLE IF NOT EXISTS platform_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write settings
CREATE POLICY "admins_read_settings" ON platform_settings FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "admins_write_settings" ON platform_settings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "admins_update_settings" ON platform_settings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "admins_delete_settings" ON platform_settings FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Seed defaults
INSERT INTO platform_settings (key, value) VALUES
  ('allow_public_signup', 'true'),
  ('default_language', 'en'),
  ('require_verification', 'false'),
  ('max_posts_per_day', '10'),
  ('maintenance_mode', 'false'),
  ('maintenance_message', '')
ON CONFLICT (key) DO NOTHING;

-- Function to get a setting value by key
CREATE OR REPLACE FUNCTION get_setting(p_key text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT value FROM platform_settings WHERE key = p_key;
$$;

-- Function to set a setting value
CREATE OR REPLACE FUNCTION set_setting(p_key text, p_value text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO platform_settings (key, value, updated_at)
  VALUES (p_key, p_value, now())
  ON CONFLICT (key) DO UPDATE SET value = p_value, updated_at = now();
END;
$$;

NOTIFY pgrst, 'reload schema';
