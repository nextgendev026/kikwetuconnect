-- KikwetuConnect Database Schema
-- Supabase PostgreSQL

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null,
  username text unique not null,
  full_name text,
  avatar_url text,
  county_hub text,
  heshima_rating integer default 0,
  is_verified_expert boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  primary key (id)
);

-- Posts table (baraza, inquiry, article)
create table public.posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  post_type text check (post_type in ('baraza', 'inquiry', 'article')) not null,
  title text,
  content text not null,
  media_url text,
  county_tag text,
  bounty_tokens integer default 0,
  upvotes_count integer default 0,
  answers_count integer default 0,
  is_pinned boolean default false,
  is_expert_solution boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Answers table
create table public.answers (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts on delete cascade not null,
  user_id uuid references public.profiles on delete cascade not null,
  content text not null,
  upvotes_count integer default 0,
  is_expert_solution boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Votes table
create table public.votes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  target_type text check (target_type in ('post', 'answer')) not null,
  target_id uuid not null,
  vote_type integer check (vote_type in (1, -1)) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id, target_type, target_id)
);

-- Topics table
create table public.topics (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text unique not null,
  description text,
  color text default 'green',
  follower_count integer default 0,
  post_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Post-Topic relationship (many-to-many)
create table public.post_topics (
  post_id uuid references public.posts on delete cascade not null,
  topic_id uuid references public.topics on delete cascade not null,
  primary key (post_id, topic_id)
);

-- User-Topic relationship (many-to-many - followed topics)
create table public.user_topics (
  user_id uuid references public.profiles on delete cascade not null,
  topic_id uuid references public.topics on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  primary key (user_id, topic_id)
);

-- Notifications table
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  actor_id uuid references public.profiles on delete set null,
  type text check (type in ('upvote', 'answer', 'mention', 'token', 'follow', 'expert')) not null,
  target_id uuid,
  target_type text check (target_type in ('post', 'answer', 'profile')),
  content text not null,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Translations table
create table public.translations (
  id uuid default uuid_generate_v4() primary key,
  source_content text not null,
  source_language text not null,
  target_language text not null,
  translated_content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(source_content, source_language, target_language)
);

-- Moderation table
create table public.moderation (
  id uuid default uuid_generate_v4() primary key,
  target_type text check (target_type in ('post', 'answer', 'profile')) not null,
  target_id uuid not null,
  reporter_id uuid references public.profiles on delete cascade not null,
  reason text not null,
  evidence text,
  status text check (status in ('pending', 'reviewed', 'resolved', 'dismissed')) default 'pending',
  reviewer_id uuid references public.profiles on delete set null,
  action_taken text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  resolved_at timestamp with time zone
);

-- Tokens table (wallet/ledger)
create table public.tokens (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  amount integer not null,
  type text check (type in ('earned', 'spent', 'bounty', 'award')) not null,
  reference text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Badges table
create table public.badges (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text not null,
  icon text not null,
  criteria text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- User-Badge relationship (many-to-many)
create table public.user_badges (
  user_id uuid references public.profiles on delete cascade not null,
  badge_id uuid references public.badges on delete cascade not null,
  awarded_at timestamp with time zone default timezone('utc'::text, now()),
  primary key (user_id, badge_id)
);

-- Indexes for performance
create index posts_user_id_idx on posts(user_id);
create index posts_created_at_idx on posts(created_at desc);
create index posts_county_tag_idx on posts(county_tag);
create index posts_post_type_idx on posts(post_type);
create index answers_post_id_idx on answers(post_id);
create index answers_user_id_idx on answers(user_id);
create index votes_user_id_idx on votes(user_id);
create index votes_target_idx on votes(target_type, target_id);
create index notifications_user_id_idx on notifications(user_id);
create index notifications_created_at_idx on notifications(created_at desc);
create index moderation_status_idx on moderation(status);
create index tokens_user_id_idx on tokens(user_id);

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.answers enable row level security;
alter table public.votes enable row level security;
alter table public.topics enable row level security;
alter table public.post_topics enable row level security;
alter table public.user_topics enable row level security;
alter table public.notifications enable row level security;
alter table public.translations enable row level security;
alter table public.moderation enable row level security;
alter table public.tokens enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Posts policies
create policy "Posts are viewable by everyone"
  on public.posts for select
  using (true);

create policy "Users can create posts"
  on public.posts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own posts"
  on public.posts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own posts"
  on public.posts for delete
  using (auth.uid() = user_id);

-- Answers policies
create policy "Answers are viewable by everyone"
  on public.answers for select
  using (true);

create policy "Users can create answers"
  on public.answers for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own answers"
  on public.answers for update
  using (auth.uid() = user_id);

create policy "Users can delete their own answers"
  on public.answers for delete
  using (auth.uid() = user_id);

-- Votes policies
create policy "Votes are viewable by the user"
  on public.votes for select
  using (auth.uid() = user_id);

create policy "Users can create votes"
  on public.votes for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own votes"
  on public.votes for delete
  using (auth.uid() = user_id);

-- Topics policies
create policy "Topics are viewable by everyone"
  on public.topics for select
  using (true);

create policy "Topics are insertable by authenticated users"
  on public.topics for insert
  with check (auth.uid() is not null);

-- Post-Topic policies
create policy "Post-Topic relationships are viewable by everyone"
  on public.post_topics for select
  using (true);

create policy "Post-Topic relationships are manageable by post author"
  on public.post_topics for insert
  with check (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_topics.post_id
      AND posts.user_id = auth.uid()
    )
  );

-- User-Topic policies
create policy "User-Topic relationships are viewable by the user"
  on public.user_topics for select
  using (auth.uid() = user_id);

create policy "Users can follow topics"
  on public.user_topics for insert
  with check (auth.uid() = user_id);

create policy "Users can unfollow topics"
  on public.user_topics for delete
  using (auth.uid() = user_id);

-- Notifications policies
create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update their own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

create policy "Notifications are insertable by the system"
  on public.notifications for insert
  with check (auth.uid() = user_id);

-- Translations policies
create policy "Translations are viewable by everyone"
  on public.translations for select
  using (true);

-- Moderation policies
create policy "Moderation records are viewable by reporter and reviewer"
  on public.moderation for select
  using (
    auth.uid() = reporter_id
    OR auth.uid() = reviewer_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_verified_expert = true
    )
  );

create policy "Users can create moderation reports"
  on public.moderation for insert
  with check (auth.uid() = reporter_id);

create policy "Verified experts can update moderation records"
  on public.moderation for update
  using (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_verified_expert = true
    )
  );

-- Tokens policies
create policy "Users can view their own tokens"
  on public.tokens for select
  using (auth.uid() = user_id);

create policy "Tokens are insertable by the system"
  on public.tokens for insert
  with check (auth.uid() = user_id);

-- Badges policies
create policy "Badges are viewable by everyone"
  on public.badges for select
  using (true);

-- User-Badge policies
create policy "User-Badge relationships are viewable by the user"
  on public.user_badges for select
  using (auth.uid() = user_id);

create policy "User-Badge relationships are insertable by the system"
  on public.user_badges for insert
  with check (auth.uid() = user_id);

-- Triggers for updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql security definer;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger posts_updated_at
  before update on public.posts
  for each row execute procedure public.handle_updated_at();

create trigger answers_updated_at
  before update on public.answers
  for each row execute procedure public.handle_updated_at();

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger to update counts on posts
create or replace function public.update_post_counts()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update posts set answers_count = answers_count + 1
    where id = NEW.post_id;
  elsif TG_OP = 'DELETE' then
    update posts set answers_count = answers_count - 1
    where id = OLD.post_id;
  end if;
  return NULL;
end;
$$ language plpgsql security definer;

create trigger answers_count_trigger
  after insert or delete on public.answers
  for each row execute procedure public.update_post_counts();

-- Trigger to update vote counts
create or replace function public.update_vote_counts()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.target_type = 'post' then
      update posts set upvotes_count = upvotes_count + NEW.vote_type
      where id = NEW.target_id;
    elsif NEW.target_type = 'answer' then
      update answers set upvotes_count = upvotes_count + NEW.vote_type
      where id = NEW.target_id;
    end if;
  elsif TG_OP = 'DELETE' then
    if OLD.target_type = 'post' then
      update posts set upvotes_count = upvotes_count - OLD.vote_type
      where id = OLD.target_id;
    elsif OLD.target_type = 'answer' then
      update answers set upvotes_count = upvotes_count - OLD.vote_type
      where id = OLD.target_id;
    end if;
  end if;
  return NULL;
end;
$$ language plpgsql security definer;

create trigger vote_count_trigger
  after insert or delete on public.votes
  for each row execute procedure public.update_vote_counts();

-- Trigger to update Heshima rating
create or replace function public.update_heshima_rating()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update profiles set heshima_rating = heshima_rating + 1
    where id = NEW.user_id;
  elsif TG_OP = 'DELETE' then
    update profiles set heshima_rating = heshima_rating - 1
    where id = OLD.user_id;
  end if;
  return NULL;
end;
$$ language plpgsql security definer;

create trigger heshima_rating_trigger
  after insert or delete on public.votes
  for each row execute procedure public.update_heshima_rating();

-- Seed data for topics
insert into public.topics (name, slug, description, color) values
  ('Tech & Startups', 'tech-startups', 'Builders, funding, M-Pesa, dev life', 'green'),
  ('Agriculture & Farming', 'agriculture', 'Markets, crops, climate-smart farming', 'brown'),
  ('Biashara & Hustles', 'biashara', 'SMEs, side hustles, practical money tips', 'gold'),
  ('Legal & Hustler Rights', 'legal-rights', 'Know your rights, access local help', 'blue'),
  ('Culture & Entertainment', 'culture', 'Music, film, art, sport, identity', 'red'),
  ('Education', 'education', 'Learning, schools, scholarships, skills', 'green'),
  ('Health', 'health', 'Wellness, healthcare, nutrition', 'gold'),
  ('County Politics', 'county-politics', 'Local governance, county news', 'blue');

-- Seed data for badges
insert into public.badges (name, description, icon, criteria) values
  ('First Post', 'Published your first post', '📝', 'published_first_post'),
  ('Helpful', 'Received 10 upvotes', '👍', 'received_10_upvotes'),
  ('Verified Expert', 'Profile verified as expert', '✓', 'is_verified_expert'),
  ('Community Hero', 'Reviewed 50 moderation reports', '🛡️', 'reviewed_50_reports'),
  ('Bounty Hunter', 'Earned 500 tokens from bounties', '🏆', 'earned_500_tokens'),
  ('Local Guide', 'Posted in 5 different county hubs', '📍', 'posted_in_5_counties'),
  ('Translator', 'Contributed 10 translations', '🌐', 'contributed_10_translations'),
  ('Night Owl', 'Posted between 2-4 AM', '🦉', 'posted_at_night'),
  ('Early Bird', 'Posted before 6 AM', '🌅', 'posted_early_morning'),
  ('Top Contributor', 'Top 1% contributor this month', '💎', 'top_1_percent_monthly');