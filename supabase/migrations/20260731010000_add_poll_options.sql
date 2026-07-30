ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS poll_options jsonb default '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.poll_options (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts on delete cascade not null,
  option_text text not null,
  votes integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Poll options are viewable by everyone" ON public.poll_options
  FOR SELECT USING (true);

CREATE POLICY "Users can insert poll options for their own posts" ON public.poll_options
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM posts WHERE id = post_id));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'poll_options'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_options;
  END IF;
END $$;
