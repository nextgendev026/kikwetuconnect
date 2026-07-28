ALTER TABLE barazas ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'barazas_read_all' AND tablename = 'barazas') THEN
    CREATE POLICY barazas_read_all ON barazas FOR SELECT USING (true);
    CREATE POLICY barazas_insert_all ON barazas FOR INSERT WITH CHECK (true);
    CREATE POLICY barazas_update_all ON barazas FOR UPDATE USING (true);
  END IF;
END $$;