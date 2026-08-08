-- ============================================================
-- 20260811000000 — comments for posts/articles; answers for questions
-- 1. new `comments` table (flat, mirrors answers shape)
-- 2. migrate existing non-inquiry answers into comments (same ids)
-- 3. posts.comments_count + backfill + maintenance triggers
-- 4. votes support 'comment' target_type; heshima trigger handles it
-- 5. get_post_by_id + get_personalized_feed surface comments_count
-- ============================================================

-- ====== 1. comments table ======
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  language text,
  upvotes_count integer NOT NULL DEFAULT 0,
  is_expert_solution boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comments are public to read" ON public.comments;
CREATE POLICY "Comments are public to read" ON public.comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can comment" ON public.comments;
CREATE POLICY "Authenticated users can comment" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Comment owners update" ON public.comments;
CREATE POLICY "Comment owners update" ON public.comments
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Comment owners delete" ON public.comments;
CREATE POLICY "Comment owners delete" ON public.comments
  FOR DELETE USING (auth.uid() = user_id);

GRANT ALL ON public.comments TO postgres, service_role, authenticated;
GRANT SELECT ON public.comments TO anon;

-- ====== 2. posts.comments_count + backfill ======
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS comments_count integer NOT NULL DEFAULT 0;

-- Backfill from existing answers so every comment keeps its id + upvotes intact.
INSERT INTO public.comments (id, post_id, user_id, content, language, upvotes_count, is_expert_solution, created_at, updated_at)
SELECT
  a.id, a.post_id, a.user_id, a.content, a.language, a.upvotes_count, a.is_expert_solution, a.created_at, a.updated_at
FROM public.answers a
JOIN public.posts p ON p.id = a.post_id
WHERE p.post_type IS DISTINCT FROM 'inquiry';

-- ====== 3. votes + heshima support 'comment' ======
-- Drop/re-add the check constraint BEFORE updating existing votes to 'comment'.
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_target_type_check;
ALTER TABLE public.votes ADD CONSTRAINT votes_target_type_check
  CHECK (target_type IN ('post', 'answer', 'comment', 'profile', 'topic'));

-- Point existing votes that targeted the migrated rows at the comments table.
UPDATE public.votes v SET target_type = 'comment'
WHERE v.target_type = 'answer'
  AND v.target_id IN (SELECT id FROM public.comments);

-- Remove migrated rows from answers (inquiry answers stay).
DELETE FROM public.answers a
WHERE a.id IN (SELECT id FROM public.comments);

UPDATE public.posts p SET
  comments_count = (SELECT count(*) FROM public.comments c WHERE c.post_id = p.id),
  answers_count  = (SELECT count(*) FROM public.answers  a WHERE a.post_id = p.id);

CREATE OR REPLACE FUNCTION public.update_heshima_rating() RETURNS trigger AS $$
declare
  target_author_id uuid;
  current_rating integer;
begin
  if NEW.target_type = 'post' then
    select user_id into target_author_id from public.posts where id = NEW.target_id;
  elsif NEW.target_type = 'answer' then
    select user_id into target_author_id from public.answers where id = NEW.target_id;
  elsif NEW.target_type = 'comment' then
    select user_id into target_author_id from public.comments where id = NEW.target_id;
  end if;

  if target_author_id is null then return null; end if;

  if TG_OP = 'INSERT' then
    if NEW.vote_type = 1 then
      update profiles set
        heshima_rating = least(heshima_rating + 1, 5000),
        heshima_balance = least(heshima_balance + 1, 5000),
        total_contributions = total_contributions + 1
      where id = target_author_id
      returning heshima_rating into current_rating;
      insert into heshima_earnings (user_id, amount, balance_after, source_type, source_id, description)
      values (target_author_id, 1, current_rating, NEW.target_type, NEW.target_id::text, 'Your ' || NEW.target_type || ' received an upvote');
    elsif NEW.vote_type = -1 then
      update profiles set heshima_rating = greatest(heshima_rating - 1, 0) where id = target_author_id;
    end if;
  elsif TG_OP = 'DELETE' then
    if OLD.vote_type = 1 then
      update profiles set
        heshima_rating = greatest(heshima_rating - 1, 0),
        total_contributions = greatest(total_contributions - 1, 0)
      where id = target_author_id;
    elsif OLD.vote_type = -1 then
      update profiles set heshima_rating = least(heshima_rating + 1, 5000) where id = target_author_id;
    end if;
  end if;

  if TG_OP = 'INSERT' and NEW.vote_type = 1 then
    perform check_expert_graduation(target_author_id);
  end if;

  return null;
end;
$$ language plpgsql security definer;

-- ============================================================
-- get_post_by_id: surface comments_count + avatar
-- ============================================================
DROP FUNCTION IF EXISTS public.get_post_by_id(p_post_id uuid);

CREATE OR REPLACE FUNCTION public.get_post_by_id(p_post_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', p.id,
    'title', p.title,
    'content', p.content,
    'post_type', p.post_type,
    'user_id', p.user_id,
    'media_url', p.media_url,
    'media_type', p.media_type,
    'upvotes_count', p.upvotes_count,
    'answers_count', p.answers_count,
    'comments_count', p.comments_count,
    'bounty_tokens', p.bounty_tokens,
    'county_tag', p.county_tag,
    'is_hidden', p.is_hidden,
    'created_at', p.created_at,
    'profiles', jsonb_build_object(
      'id', pr.id,
      'full_name', pr.full_name,
      'username', pr.username,
      'avatar_url', pr.avatar_url,
      'headline', pr.headline,
      'county_hub', pr.county_hub,
      'heshima_rating', pr.heshima_rating,
      'is_verified_expert', pr.is_verified_expert
    )
  )
  INTO result
  FROM public.posts p
  LEFT JOIN public.profiles pr ON pr.id = p.user_id
  WHERE p.id = p_post_id;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_post_by_id(uuid) TO authenticated, anon;

-- ============================================================
-- get_personalized_feed: include comments_count
-- ============================================================
DROP FUNCTION IF EXISTS public.get_personalized_feed(uuid, integer, integer);
CREATE OR REPLACE FUNCTION public.get_personalized_feed(
  p_user_id uuid,
  p_limit integer default 30,
  p_offset integer default 0
) returns table (
  id uuid,
  post_type text,
  title text,
  content text,
  media_url text,
  county_tag text,
  bounty_tokens integer,
  upvotes_count integer,
  answers_count integer,
  comments_count integer,
  created_at timestamptz,
  author_id uuid,
  author_name text,
  author_username text,
  author_avatar text,
  author_heshima integer,
  relevance_score bigint
) as $$
declare
  user_county text;
  user_following_ids uuid[];
  v_user_id uuid;
begin
  v_user_id := (select auth.uid());

  select county_hub into user_county from public.profiles where profiles.id = v_user_id;

  select array_agg(following_id) into user_following_ids
  from public.follows where follower_id = v_user_id;

  return query
  select
    p.id,
    p.post_type,
    p.title,
    p.content,
    p.media_url,
    p.county_tag,
    p.bounty_tokens,
    p.upvotes_count,
    p.answers_count,
    p.comments_count,
    p.created_at,
    pr.id as author_id,
    pr.full_name as author_name,
    pr.username as author_username,
    pr.avatar_url as author_avatar,
    pr.heshima_rating as author_heshima,
    (
      coalesce(
        (select count(*)::integer from unnest(pr.interests) i
         where i in (select topic_id::text from public.post_topics where post_id = p.id)),
        0
      ) * 10 +
      case when p.county_tag = user_county then 30 else 0 end +
      case when p.user_id = any(user_following_ids) then 25 else 0 end +
      least(coalesce(p.upvotes_count, 0), 20) +
      least(coalesce(pr.heshima_rating, 0) / 10, 10) +
      case when p.created_at > now() - interval '24 hours' then 10
           when p.created_at > now() - interval '7 days' then 5
           else 0 end
    )::bigint as relevance_score
  from public.posts p
  join public.profiles pr on pr.id = p.user_id
  where p.space_id is null
    and p.post_type <> 'inquiry'
    and p.created_at > now() - interval '90 days'
  order by relevance_score desc, p.created_at desc
  limit p_limit
  offset p_offset;
end;
$$ language plpgsql stable;

GRANT EXECUTE ON FUNCTION public.get_personalized_feed(uuid, integer, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_personalized_feed(uuid, integer, integer) FROM anon, public;

notify pgrst, 'reload schema';