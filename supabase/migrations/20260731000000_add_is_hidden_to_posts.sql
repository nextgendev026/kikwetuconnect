ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_hidden boolean default false;
