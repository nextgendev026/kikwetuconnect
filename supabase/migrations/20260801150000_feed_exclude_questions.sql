-- Questions now live in the Students area, not the main feed. Both the
-- client-side feed and get_personalized_feed (used by the "For You" tab)
-- must exclude post_type = 'inquiry'.
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
  -- Actor identity ALWAYS comes from the session, never the parameter.
  v_user_id := (select auth.uid());

  -- Get user's county
  select county_hub into user_county from public.profiles where id = v_user_id;

  -- Get followed user IDs
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
  where p.space_id is null
    and p.post_type <> 'inquiry'
    and p.created_at > now() - interval '90 days'
  order by relevance_score desc, p.created_at desc
  limit p_limit
  offset p_offset;
end;
$$ language plpgsql stable;

notify pgrst, 'reload schema';
