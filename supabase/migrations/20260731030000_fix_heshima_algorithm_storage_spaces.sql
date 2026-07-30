-- Fix heshima: award points to POST AUTHOR (not voter) when their post receives upvotes
-- Also adds storage buckets for audio/video + spaces RLS privacy

-- ====== 1. Fix heshima trigger: award to post/answer author, not voter ======
create or replace function public.update_heshima_rating() returns trigger as $$
declare
  target_author_id uuid;
  current_rating integer;
begin
  -- Find the author of the target post or answer
  if NEW.target_type = 'post' then
    select user_id into target_author_id from public.posts where id = NEW.target_id;
  elsif NEW.target_type = 'answer' then
    select user_id into target_author_id from public.answers where id = NEW.target_id;
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
      values (target_author_id, 1, current_rating, 'upvote', NEW.target_id::text, 'Your post received an upvote');
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

  -- Check for expert graduation at 1000 points
  if TG_OP = 'INSERT' and NEW.vote_type = 1 then
    perform check_expert_graduation(target_author_id);
  end if;

  return null;
end;
$$ language plpgsql security definer;

-- ====== 2. Comprehensive heshima algorithm ======
create or replace function public.recalculate_comprehensive_heshima(p_user_id uuid default null) returns void as $$
begin
  if p_user_id is not null then
    update profiles set heshima_rating = least((
      -- Upvotes received on posts (1 point each)
      coalesce((select count(*) from votes v join posts p on p.id = v.target_id where v.target_type = 'post' and v.vote_type = 1 and p.user_id = p_user_id), 0) +
      -- Upvotes received on answers (1 point each)
      coalesce((select count(*) from votes v join answers a on a.id = v.target_id where v.target_type = 'answer' and v.vote_type = 1 and a.user_id = p_user_id), 0) +
      -- Quiz completion bonus (sum of all heshima_reward from completed quizzes)
      coalesce((select sum(qr.score * 2) from quiz_results qr where qr.user_id = p_user_id), 0) +
      -- Daily streak bonus (5 per streak day)
      coalesce((select streak_days * 5 from profiles where id = p_user_id), 0) +
      -- Answers given (1 point each)
      coalesce((select count(*) from answers where user_id = p_user_id), 0) +
      -- Sessions completed as expert (10 per session)
      coalesce((select count(*) * 10 from student_sessions where expert_id = p_user_id and status = 'completed'), 0) +
      -- Posts created that are expert solutions (5 each)
      coalesce((select count(*) * 5 from posts where user_id = p_user_id and is_expert_solution = true), 0) -
      -- Downvotes received (-1 each)
      coalesce((select count(*) from votes v join posts p on p.id = v.target_id where v.target_type = 'post' and v.vote_type = -1 and p.user_id = p_user_id), 0)
    , 0), 5000)
    where id = p_user_id;
  else
    update profiles pr set heshima_rating = least((
      coalesce((select count(*) from votes v join posts p on p.id = v.target_id where v.target_type = 'post' and v.vote_type = 1 and p.user_id = pr.id), 0) +
      coalesce((select count(*) from votes v join answers a on a.id = v.target_id where v.target_type = 'answer' and v.vote_type = 1 and a.user_id = pr.id), 0) +
      coalesce((select sum(qr.score * 2) from quiz_results qr where qr.user_id = pr.id), 0) +
      coalesce((select streak_days * 5 from profiles where id = pr.id), 0) +
      coalesce((select count(*) from answers where user_id = pr.id), 0) +
      coalesce((select count(*) * 10 from student_sessions where expert_id = pr.id and status = 'completed'), 0) +
      coalesce((select count(*) * 5 from posts where user_id = pr.id and is_expert_solution = true), 0) -
      coalesce((select count(*) from votes v join posts p on p.id = v.target_id where v.target_type = 'post' and v.vote_type = -1 and p.user_id = pr.id), 0)
    , 0), 5000);
  end if;
end;
$$ language plpgsql;

-- ====== 3. Storage buckets for audio and short-form video ======
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('audio', 'audio', true, 52428800, array['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/flac', 'audio/webm'])
on conflict (id) do update set public = true, file_size_limit = 52428800, allowed_mime_types = array['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/flac', 'audio/webm'];

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('video', 'video', true, 104857600, array['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/3gpp'])
on conflict (id) do update set public = true, file_size_limit = 104857600, allowed_mime_types = array['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/3gpp'];

-- RLS policies for audio bucket
create policy "Anyone can read audio" on storage.objects for select using (bucket_id = 'audio');
create policy "Authenticated users can upload audio" on storage.objects for insert with check (bucket_id = 'audio' and auth.role() = 'authenticated');
create policy "Owners can update audio" on storage.objects for update using (bucket_id = 'audio' and auth.uid() = owner);
create policy "Owners can delete audio" on storage.objects for delete using (bucket_id = 'audio' and auth.uid() = owner);

-- RLS policies for video bucket
create policy "Anyone can read video" on storage.objects for select using (bucket_id = 'video');
create policy "Authenticated users can upload video" on storage.objects for insert with check (bucket_id = 'video' and auth.role() = 'authenticated');
create policy "Owners can update video" on storage.objects for update using (bucket_id = 'video' and auth.uid() = owner);
create policy "Owners can delete video" on storage.objects for delete using (bucket_id = 'video' and auth.uid() = owner);

-- ====== 4. Spaces RLS: ensure space posts are only visible to members ======
-- Enable RLS on posts table
alter table public.posts enable row level security;

-- Drop any existing conflicting policies
drop policy if exists "Posts are viewable by everyone" on public.posts;
drop policy if exists "Users can create posts" on public.posts;
drop policy if exists "Users can update own posts" on public.posts;
drop policy if exists "Users can delete own posts" on public.posts;

-- Public posts (no space_id) are viewable by everyone
create policy "Public posts are viewable by everyone" on public.posts
  for select using (space_id is null);

-- Space posts are viewable by members of that space (or the author)
create policy "Space posts are viewable by members" on public.posts
  for select using (
    space_id is not null and (
      user_id = auth.uid() or
      exists (select 1 from space_members where space_id = posts.space_id and user_id = auth.uid())
    )
  );

-- Authenticated users can create public posts
create policy "Authenticated users can create posts" on public.posts
  for insert with check (auth.uid() = user_id);

-- Users can update their own posts
create policy "Users can update own posts" on public.posts
  for update using (auth.uid() = user_id);

-- Users can delete their own posts
create policy "Users can delete own posts" on public.posts
  for delete using (auth.uid() = user_id);
