CREATE TABLE IF NOT EXISTS barazas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  county text NOT NULL,
  category text NOT NULL DEFAULT 'county',
  cover_url text,
  member_count integer DEFAULT 0,
  post_count integer DEFAULT 0,
  active_member_count integer DEFAULT 0,
  is_default boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER PUBLICATION supabase_realtime ADD TABLE barazas;

CREATE POLICY barazas_read_all ON barazas FOR SELECT USING (true);
CREATE POLICY barazas_insert_all ON barazas FOR INSERT WITH CHECK (true);
CREATE POLICY barazas_update_all ON barazas FOR UPDATE USING (true);

INSERT INTO barazas (name, slug, description, county, category, member_count, post_count, active_member_count) VALUES
('Nairobi Hub', 'nairobi', 'Discover conversations from your region Nairobi - Kenya''s capital and economic hub', 'Nairobi', 'county_hub', 8934, 2450, 8934),
('Mombasa Hub', 'mombasa', 'Discover conversations from Mombasa - Kenya''s coastal city rich in culture and trade', 'Mombasa', 'county_hub', 6234, 1820, 6234),
('Kisumu Hub', 'kisumu', 'Discover conversations from Kisumu - Kenya''s third largest city on Lake Victoria', 'Kisumu', 'county_hub', 4567, 1456, 4567),
('Nakuru Hub', 'nakuru', 'Discover conversations from Nakuru - Kenya''s fourth largest city and Rift Valley hub', 'Nakuru', 'county_hub', 2890, 856, 2890),
('Eldoret Hub', 'eldoret', 'Discover conversations from Eldoret - Kenya''s heartland and agricultural powerhouse', 'Eldoret', 'county_hub', 3245, 987, 3245),
('Kakamega Hub', 'kakamega', 'Discover conversations from Kakamega - Western Kenya''s cultural and political center', 'Kakamega', 'county_hub', 2876, 823, 2876),
('Nyeri Hub', 'nyeri', 'Discover conversations from Nyeri - Central Kenya''s coffee country and historical heart', 'Nyeri', 'county_hub', 2456, 745, 2456),
('Kericho Hub', 'kericho', 'Discover conversations from Kericho - Kenya''s tea capital and scenic highlands', 'Kericho', 'county_hub', 2123, 654, 2123),
('Kisii Hub', 'kisii', 'Discover conversations from Kisii - Kisii Highlands'' agricultural and cultural center', 'Kisii', 'county_hub', 2234, 698, 2234),
('Machakos Hub', 'machakos', 'Discover conversations from Machakos - Kenya''s gateway to the east and growing urban center', 'Machakos', 'county_hub', 1876, 567, 1876)
ON CONFLICT (slug) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='baraza_id') THEN
    ALTER TABLE posts ADD COLUMN baraza_id uuid REFERENCES barazas(id) ON DELETE SET NULL;
  END IF;
END $$;