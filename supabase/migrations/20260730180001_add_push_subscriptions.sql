-- Push notification subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  endpoint text NOT NULL,
  p256dh_key text NOT NULL,
  auth_key text NOT NULL,
  device_type text DEFAULT 'unknown',
  user_agent text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscriptions
DROP POLICY IF EXISTS "Users read own push subs" ON public.push_subscriptions;
CREATE POLICY "Users read own push subs" ON public.push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Server can insert/delete via API (SECURITY DEFINER function)
DROP POLICY IF EXISTS "Server manages push subs" ON public.push_subscriptions;
CREATE POLICY "Server manages push subs" ON public.push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own push subs" ON public.push_subscriptions;
CREATE POLICY "Users delete own push subs" ON public.push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Index for finding a user's subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON public.push_subscriptions(user_id);
