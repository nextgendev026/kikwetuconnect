-- Enable RLS on tables missed by initial security hardening
ALTER TABLE IF EXISTS subject_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS expertise_categories ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read
DROP POLICY IF EXISTS sa_read_auth ON subject_areas;
CREATE POLICY sa_read_auth ON subject_areas
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS ec_read_auth ON expertise_categories;
CREATE POLICY ec_read_auth ON expertise_categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admins can modify
DROP POLICY IF EXISTS sa_insert_admin ON subject_areas;
CREATE POLICY sa_insert_admin ON subject_areas
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS sa_update_admin ON subject_areas;
CREATE POLICY sa_update_admin ON subject_areas
  FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS ec_insert_admin ON expertise_categories;
CREATE POLICY ec_insert_admin ON expertise_categories
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS ec_update_admin ON expertise_categories;
CREATE POLICY ec_update_admin ON expertise_categories
  FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
