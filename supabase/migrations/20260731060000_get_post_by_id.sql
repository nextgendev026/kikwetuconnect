-- SECURITY DEFINER function for post detail page
-- Bypasses RLS on posts table so that clicking a post in the feed always works
-- (the feed RPC is already SECURITY DEFINER, so this keeps behavior consistent)

create or replace function get_post_by_id(p_post_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'id', p.id,
    'title', p.title,
    'content', p.content,
    'post_type', p.post_type,
    'user_id', p.user_id,
    'media_url', p.media_url,
    'media_type', p.media_type,
    'upvotes_count', p.upvotes_count,
    'answers_count', p.answers_count,
    'bounty_tokens', p.bounty_tokens,
    'county_tag', p.county_tag,
    'is_hidden', p.is_hidden,
    'created_at', p.created_at,
    'profiles', jsonb_build_object(
      'id', pr.id,
      'full_name', pr.full_name,
      'username', pr.username,
      'heshima_rating', pr.heshima_rating,
      'is_verified_expert', pr.is_verified_expert
    )
  )
  into result
  from public.posts p
  left join public.profiles pr on pr.id = p.user_id
  where p.id = p_post_id;

  return result;
end;
$$;
