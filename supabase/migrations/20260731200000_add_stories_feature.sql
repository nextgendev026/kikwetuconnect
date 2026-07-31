-- Stories feature: Facebook-style 24h expiring reels/stories with 15s video max
-- Supports image stories and short video (≤15s) stories that expire after 24 hours.

-- 1. Stories table
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  thumbnail_url text,
  caption text,
  duration int, -- seconds; relevant for videos (≤15)
  view_count bigint default 0,
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for fast feed + expiry cleanup
create index if not exists stories_idx_user_created on public.stories (user_id, created_at desc);
create index if not exists stories_idx_expires on public.stories (expires_at);
create index if not exists stories_idx_media on public.stories (media_url);

-- 2. Story views (who has seen a story)
create table if not exists public.story_views (
  id bigint generated always as identity primary key,
  story_id uuid not null references stories on delete cascade,
  viewer_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (story_id, viewer_id)
);

-- 3. Updated profile stats
create table if not exists public.profile_story_stats (
  user_id uuid primary key references profiles(id) on delete cascade,
  story_count int default 0,
  updated_at timestamptz default now()
);

-- 4. RLS
alter table public.stories enable row level security;
alter table public.story_views enable row level security;

-- Stories are readable by everyone (anonymous) when not expired
drop policy if exists "Anyone can read non-expired stories" on public.stories;
create policy "Anyone can read non-expired stories" on public.stories
  for select using (expires_at > now());

-- Users can insert their own stories (with 24h expiry + 15s video cap enforced server-side)
drop policy if exists "Users can insert own stories" on public.stories;
create policy "Users can insert own stories" on public.stories
  for insert with check (auth.uid() = user_id);

-- Users can update their own stories' view_count / captions before expiry
drop policy if exists "Users can update own stories" on public.stories;
create policy "Users can update own stories" on public.stories
  for update using (auth.uid() = user_id);

-- Users can delete their own stories
drop policy if exists "Users can delete own stories" on public.stories;
create policy "Users can delete own stories" on public.stories
  for delete using (auth.uid() = user_id);

-- Story views: anyone (authenticated) can record a view
drop policy if exists "Authenticated can view stories" on public.story_views;
create policy "Authenticated can view stories" on public.story_views
  for insert with check (auth.role() = 'authenticated');
drop policy if exists "Anyone can read story views" on public.story_views;
create policy "Anyone can read story views" on public.story_views
  for select using (true);

-- 5. Helper RPC: create a story (enforces 15s video cap + 24h expiry + public bucket)
create or replace function public.create_story(
  p_media_url text,
  p_media_type text,
  p_caption text default null,
  p_duration int default null,
  p_thumbnail_url text default null
) returns uuid language plpgsql security definer as $$
declare
  v_user uuid;
  v_story_id uuid;
  v_expires timestamptz;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  if p_media_type not in ('image', 'video') then
    raise exception 'media_type must be image or video';
  end if;
  if p_media_type = 'video' and p_duration is not null and p_duration > 15 then
    raise exception 'Video stories must be 15 seconds or shorter';
  end if;
  v_expires := (now() + interval '24 hours');
  insert into public.stories (user_id, media_url, media_type, thumbnail_url, caption, duration, view_count, expires_at)
  values (v_user, p_media_url, p_media_type, p_thumbnail_url, p_caption, p_duration, 0, v_expires)
  returning id into v_story_id;
  return v_story_id;
end;
$$;
grant execute on function public.create_story(text, text, text, int, text) to authenticated;

-- 6. RPC: increment view count when a story is viewed
create or replace function public.view_story(p_story_id uuid) returns boolean language plpgsql security definer as $$
declare
  v_user uuid;
begin
  v_user := auth.uid();
  if v_user is null then
    return false;
  end if;
  insert into public.story_views (story_id, viewer_id)
  values (p_story_id, v_user)
  on conflict do nothing;
  update public.stories
  set view_count = (select count(*) from public.story_views where story_id = p_story_id)
  where id = p_story_id;
  return true;
end;
$$;
grant execute on function public.view_story(uuid) to authenticated;

-- 7. RPC: delete expired stories (callable by a scheduler / admin)
create or replace function public.purge_expired_stories() returns int language plpgsql security definer as $$
declare
  v_deleted int;
begin
  delete from public.stories where expires_at <= now();
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;
grant execute on function public.purge_expired_stories() to service_role;

-- 8. Realtime publication for stories
DO $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'stories'
  ) then
    alter publication supabase_realtime add table stories;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'story_views'
  ) then
    alter publication supabase_realtime add table story_views;
  end if;
end;
$$;

-- 9. Ensure dedicated storage buckets exist for all app media types
-- profiles/covers already use public-media; add explicit buckets for feed + avatars/covers
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/gif','image/webp','image/svg+xml']),
  ('covers', 'covers', true, 10485760, ARRAY['image/jpeg','image/png','image/gif','image/webp']),
  ('feed-images', 'feed-images', true, 10485760, ARRAY['image/jpeg','image/png','image/gif','image/webp']),
  ('feed-videos', 'feed-videos', true, 104857600, ARRAY['video/mp4','video/webm','video/quicktime','video/ogg']),
  ('stories', 'stories', true, 52428800,
    ARRAY[
      'image/jpeg','image/png','image/gif','image/webp',
      'video/mp4','video/webm','video/quicktime'
    ])
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Shared read policy for all app media buckets
drop policy if exists "Anyone can read app media" on storage.objects;
create policy "Anyone can read app media" on storage.objects
  for select using (
    auth.role() = 'authenticated'
    and bucket_id in ('avatars', 'covers', 'feed-images', 'feed-videos', 'stories', 'media', 'public-media', 'audio', 'video')
  );

-- Authenticated users can upload to the app media buckets
drop policy if exists "Authenticated can upload app media" on storage.objects;
create policy "Authenticated can upload app media" on storage.objects
  for insert with check (
    auth.role() = 'authenticated'
    and bucket_id in ('avatars', 'covers', 'feed-images', 'feed-videos', 'stories', 'media', 'public-media', 'audio', 'video')
    and owner = auth.uid()
  );
