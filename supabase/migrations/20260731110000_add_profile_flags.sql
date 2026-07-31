-- Add persona + account-status fields to profiles without touching the permission role enum

-- 1. user_type — the user's persona (why they joined), separate from their permission role
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_type text;
ALTER TABLE profiles ADD CONSTRAINT profiles_user_type_check CHECK (user_type IS NULL OR user_type IN ('student', 'professional', 'parent'));

-- 2. is_deactivated — soft-deactivation flag (replaces the old hacky role='deactivated' write)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_deactivated boolean NOT NULL DEFAULT false;

-- 3. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
