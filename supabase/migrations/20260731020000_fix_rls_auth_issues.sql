-- Drop old poll_options RLS policy name if it exists, ensure new name
DROP POLICY IF EXISTS "Authenticated users can insert poll options" ON public.poll_options;

-- Ensure the posts table has realtime enabled for live feed updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
  END IF;
END $$;
