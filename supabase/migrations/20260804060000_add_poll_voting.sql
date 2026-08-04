CREATE OR REPLACE FUNCTION public.vote_on_poll_option(
  p_user_id uuid,
  p_post_id uuid,
  p_option_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Remove any existing vote by this user on this poll
  DELETE FROM public.poll_votes WHERE user_id = p_user_id AND post_id = p_post_id;

  -- Insert the new vote
  INSERT INTO public.poll_votes (user_id, post_id, option_id)
  VALUES (p_user_id, p_post_id, p_option_id);

  -- Update the vote counts on each poll option
  UPDATE public.poll_options
  SET votes = (
    SELECT COUNT(*) FROM public.poll_votes WHERE poll_votes.option_id = poll_options.id
  )
  WHERE post_id = p_post_id;
END;
$$;

CREATE TABLE IF NOT EXISTS public.poll_votes (
  user_id uuid REFERENCES auth.users NOT NULL,
  post_id uuid REFERENCES public.posts NOT NULL,
  option_id uuid REFERENCES public.poll_options NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS poll_votes_read ON public.poll_votes;
DROP POLICY IF EXISTS poll_votes_insert_own ON public.poll_votes;
DROP POLICY IF EXISTS poll_votes_delete_own ON public.poll_votes;
CREATE POLICY poll_votes_read ON public.poll_votes FOR SELECT USING (true);
CREATE POLICY poll_votes_insert_own ON public.poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY poll_votes_delete_own ON public.poll_votes FOR DELETE USING (auth.uid() = user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'poll_votes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
  END IF;
END $$;
