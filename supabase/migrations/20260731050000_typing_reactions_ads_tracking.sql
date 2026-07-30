-- Typing indicators, message reactions, ad tracking, media groups

-- ====== 1. Typing indicators ======
CREATE TABLE IF NOT EXISTS public.user_typing (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  started_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE public.user_typing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can see typing in their conversations" ON public.user_typing
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = user_typing.conversation_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert their own typing status" ON public.user_typing
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own typing status" ON public.user_typing
  FOR DELETE USING (user_id = auth.uid());

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_typing') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.user_typing; END IF; END $$;

-- ====== 2. Message reactions (Facebook/WhatsApp style) ======
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can see message reactions" ON public.message_reactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM messages m JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id WHERE m.id = message_reactions.message_id AND cp.user_id = auth.uid())
  );

CREATE POLICY "Users can manage their own reactions" ON public.message_reactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own reactions" ON public.message_reactions
  FOR DELETE USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON public.message_reactions(user_id);

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'message_reactions') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions; END IF; END $$;

-- ====== 3. Media groups (multiple images/videos per post) ======
CREATE TABLE IF NOT EXISTS public.media_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
  url text NOT NULL,
  thumbnail_url text,
  type text NOT NULL CHECK (type IN ('image', 'video', 'audio', 'file')),
  width integer,
  height integer,
  duration integer DEFAULT 0,
  file_size integer,
  mime_type text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CHECK (post_id IS NOT NULL OR message_id IS NOT NULL)
);

ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Media items are viewable by post viewers" ON public.media_items
  FOR SELECT USING (
    post_id IS NOT NULL OR
    EXISTS (SELECT 1 FROM messages m JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id WHERE m.id = media_items.message_id AND cp.user_id = auth.uid())
  );

CREATE POLICY "Users can insert media on their own posts" ON public.media_items
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM posts WHERE id = post_id) OR auth.uid() IN (SELECT sender_id FROM messages WHERE id = message_id));

CREATE INDEX IF NOT EXISTS idx_media_items_post ON public.media_items(post_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_media_items_message ON public.media_items(message_id, sort_order);

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'media_items') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.media_items; END IF; END $$;

-- ====== 4. Ad impression tracking ======
CREATE TABLE IF NOT EXISTS public.ad_impressions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id uuid REFERENCES public.ads(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('impression', 'click')),
  source text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can see all impressions" ON public.ad_impressions
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Anyone can insert impressions" ON public.ad_impressions
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ad_impressions_ad ON public.ad_impressions(ad_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_user ON public.ad_impressions(user_id);

-- ====== 5. Indexes for message search ======
CREATE INDEX IF NOT EXISTS idx_messages_content_gin ON public.messages USING gin (to_tsvector('english', coalesce(content, '')));

-- ====== 6. Grant execute on new functions ======
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT oid, proname, pg_get_function_identity_arguments(oid) as args
           FROM pg_proc
           WHERE pronamespace = 'public'::regnamespace
             AND proname IN ('create_conversation', 'send_message', 'mark_conversation_read', 'unread_message_count', 'can_dm')
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated, anon', 'public', r.proname, r.args);
  END LOOP;
END $$;
