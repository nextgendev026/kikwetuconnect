-- Enforce valid role values at the database level to prevent data spelling errors

-- 1. profiles.role — platform-level role
UPDATE profiles SET role = 'general' WHERE role IS NULL OR role = '';
ALTER TABLE profiles ALTER COLUMN role SET NOT NULL;
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'general';
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('general', 'member', 'moderator', 'admin'));

-- 2. space_members.role — space-level permissions
ALTER TABLE space_members DROP CONSTRAINT IF EXISTS space_members_role_check;
ALTER TABLE space_members ADD CONSTRAINT space_members_role_check CHECK (role IN ('member', 'moderator', 'admin', 'owner'));
ALTER TABLE space_members ALTER COLUMN role SET NOT NULL;
ALTER TABLE space_members ALTER COLUMN role SET DEFAULT 'member';

-- 3. nyumba_kumi_group_members.role — neighbourhood group permissions
ALTER TABLE nyumba_kumi_group_members DROP CONSTRAINT IF EXISTS nyumba_kumi_group_members_role_check;
ALTER TABLE nyumba_kumi_group_members ADD CONSTRAINT nyumba_kumi_group_members_role_check CHECK (role IN ('member', 'moderator', 'admin'));
ALTER TABLE nyumba_kumi_group_members ALTER COLUMN role SET NOT NULL;
ALTER TABLE nyumba_kumi_group_members ALTER COLUMN role SET DEFAULT 'member';

-- 4. Update admin-checking RPCs to use the constrained values (they already use 'admin', verified)
-- 5. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
