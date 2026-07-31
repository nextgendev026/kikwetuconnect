-- Capture all signup form data: phone, town/area, notification preference, profile visibility
-- These were collected in the signup UI but never persisted.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS area text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notif_pref text NOT NULL DEFAULT 'important';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';

NOTIFY pgrst, 'reload schema';
