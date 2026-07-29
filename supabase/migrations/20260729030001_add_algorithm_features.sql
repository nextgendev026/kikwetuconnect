-- Migration: Algorithm features - user interactions, personalized feed, fair heshima
-- Timestamp: 2026-07-29

-- 1. User interactions table (tracks engagement for feed personalization)
create table if not exists public.user_interactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  target_type text not null check (target_type in ('post', 'answer', 'profile', 'topic')),
  target_id uuid not null,
  interaction_type text not null check (interaction_type in ('view', 'upvote', 'downvote', 'save', 'share', 'comment', 'time_spent')),
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index if not exists idx_user_interactions_user on public.user_interactions(user_id);
create index if not exists idx_user_interactions_target on public.user_interactions(target_type, target_id);
create index if not exists idx_user_interactions_type on public.user_interactions(user_id, interaction_type);

-- Enable RLS
alter table public.user_interactions enable row level security;

-- Users can insert their own interactions
create policy "Users can insert their own interactions"
  on public.user_interactions for insert
  with check (auth.uid() = user_id);

-- Users can read their own interactions
create policy "Users can read their own interactions"
  on public.user_interactions for select
  using (auth.uid() = user_id);

-- 2. Fix heshima trigger: upvotes add +1, downvotes subtract -1
create or replace function public.update_heshima_rating() returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.vote_type = 1 then
      update profiles set heshima_rating = heshima_rating + 1 where id = NEW.user_id;
    elsif NEW.vote_type = -1 then
      update profiles set heshima_rating = greatest(heshima_rating - 1, 0) where id = NEW.user_id;
    end if;
  elsif TG_OP = 'DELETE' then
    if OLD.vote_type = 1 then
      update profiles set heshima_rating = greatest(heshima_rating - 1, 0) where id = OLD.user_id;
    elsif OLD.vote_type = -1 then
      update profiles set heshima_rating = heshima_rating + 1 where id = OLD.user_id;
    end if;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- 3. Function: calculate interest score for a user against a set of post topics
create or replace function public.calculate_user_interest_score(
  p_user_id uuid,
  p_post_id uuid
) returns integer as $$
declare
  user_interests text[];
  post_topic_ids uuid[];
  matching_count integer;
begin
  -- Get user's interests from profile
  select interests into user_interests from public.profiles where id = p_user_id;
  
  -- Get post's topic IDs
  select array_agg(topic_id::text) into post_topic_ids 
  from public.post_topics where post_id = p_post_id;
  
  -- Count intersections
  if user_interests is not null and post_topic_ids is not null then
    select count(*) into matching_count
    from unnest(user_interests) ui
    inner join unnest(post_topic_ids) pti on ui = pti;
    return matching_count * 10; -- 10 points per matching interest
  end if;
  
  return 0;
end;
$$ language plpgsql stable;

-- 4. Function: get personalized feed for a user
create or replace function public.get_personalized_feed(
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
begin
  -- Get user's county
  select county_hub into user_county from public.profiles where id = p_user_id;
  
  -- Get followed user IDs
  select array_agg(following_id) into user_following_ids 
  from public.follows where follower_id = p_user_id;

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
    p.created_at,
    pr.id as author_id,
    pr.full_name as author_name,
    pr.username as author_username,
    pr.avatar_url as author_avatar,
    pr.heshima_rating as author_heshima,
    (
      -- Interest match score (up to 40 points)
      coalesce(
        (select count(*)::integer from unnest(pr.interests) i 
         where i in (select topic_id::text from public.post_topics where post_id = p.id)),
        0
      ) * 10 +
      -- County match (30 points if same county)
      case when p.county_tag = user_county then 30 else 0 end +
      -- Following bonus (25 points if from followed user)
      case when p.user_id = any(user_following_ids) then 25 else 0 end +
      -- Engagement score (up to 20 points based on upvotes)
      least(p.upvotes_count, 20) +
      -- Heshima bonus (up to 10 points from author reputation)
      least(pr.heshima_rating / 10, 10) +
      -- Recency bonus (up to 10 points for recent posts)
      case when p.created_at > now() - interval '24 hours' then 10
           when p.created_at > now() - interval '7 days' then 5
           else 0 end
    )::bigint as relevance_score
  from public.posts p
  join public.profiles pr on pr.id = p.user_id
  where p.created_at > now() - interval '90 days'
  order by relevance_score desc, p.created_at desc
  limit p_limit
  offset p_offset;
end;
$$ language plpgsql stable;

-- 5. Function: calculate fair heshima with activity weighting
create or replace function public.recalculate_heshima(p_user_id uuid default null) returns void as $$
begin
  if p_user_id is not null then
    -- Recalculate for a single user
    update public.profiles set heshima_rating = (
      coalesce((select count(*) * 2 from public.votes v 
        join public.posts p on p.id = v.target_id 
        where v.target_type = 'post' and v.vote_type = 1 and p.user_id = p_user_id), 0) +
      coalesce((select count(*) * 3 from public.answers a 
        join public.posts p on p.id = a.post_id 
        where a.user_id = p_user_id and a.is_expert_solution = true), 0) +
      coalesce((select count(*) from public.answers a where a.user_id = p_user_id), 0) +
      coalesce((select count(*) * 5 from public.posts p 
        where p.user_id = p_user_id and p.is_expert_solution = true), 0) -
      coalesce((select count(*) * 2 from public.votes v 
        join public.posts p on p.id = v.target_id 
        where v.target_type = 'post' and v.vote_type = -1 and p.user_id = p_user_id), 0)
    ) where id = p_user_id;
  else
    -- Recalculate for all users
    update public.profiles pr set heshima_rating = (
      coalesce((select count(*) * 2 from public.votes v 
        join public.posts p on p.id = v.target_id 
        where v.target_type = 'post' and v.vote_type = 1 and p.user_id = pr.id), 0) +
      coalesce((select count(*) * 3 from public.answers a 
        join public.posts p on p.id = a.post_id 
        where a.user_id = pr.id and a.is_expert_solution = true), 0) +
      coalesce((select count(*) from public.answers a where a.user_id = pr.id), 0) +
      coalesce((select count(*) * 5 from public.posts p 
        where p.user_id = pr.id and p.is_expert_solution = true), 0) -
      coalesce((select count(*) * 2 from public.votes v 
        join public.posts p on p.id = v.target_id 
        where v.target_type = 'post' and v.vote_type = -1 and p.user_id = pr.id), 0)
    );
  end if;
end;
$$ language plpgsql;
