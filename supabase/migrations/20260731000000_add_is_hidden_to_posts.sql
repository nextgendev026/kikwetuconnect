ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_hidden boolean default false;

CREATE POLICY "Users can see hidden posts they own" ON public.posts
  FOR SELECT USING (
    is_hidden = false OR user_id = auth.uid()
  );

CREATE POLICY "Post owners can manage their own posts" ON public.posts
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Post owners can delete their own posts" ON public.posts
  FOR DELETE USING (user_id = auth.uid());
