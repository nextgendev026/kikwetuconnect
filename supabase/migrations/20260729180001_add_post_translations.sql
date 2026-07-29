-- Translation cache for posts and alerts
CREATE TABLE IF NOT EXISTS post_translations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL,
  source_type text NOT NULL DEFAULT 'nyumba_kumi_alerts',
  language varchar(10) NOT NULL DEFAULT 'sw',
  translated_title text,
  translated_text text NOT NULL,
  provider text DEFAULT 'openai',
  provider_response jsonb DEFAULT '{}',
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, source_type, language)
);

CREATE INDEX IF NOT EXISTS idx_post_translations_lookup ON post_translations(post_id, source_type, language);

ALTER TABLE post_translations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pt_read_all' AND tablename = 'post_translations') THEN
    CREATE POLICY pt_read_all ON post_translations FOR SELECT USING (true);
    CREATE POLICY pt_insert_server ON post_translations FOR INSERT WITH CHECK (true);
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE post_translations;
