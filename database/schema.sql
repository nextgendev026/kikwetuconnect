-- KikwetuConnect Complete Database Schema
-- Supabase PostgreSQL

create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null,
  username text unique not null,
  full_name text,
  avatar_url text,
  county_hub text,
  bio text,
  preferred_language text default 'en',
  interests text[] default '{}',
  role text default 'general',
  heshima_rating integer default 0,
  is_verified_expert boolean default false,
  follower_count integer default 0,
  following_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  primary key (id)
);

-- Posts table (baraza, inquiry, article, poll, alert)
create table public.posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  post_type text check (post_type in ('baraza', 'inquiry', 'article', 'poll', 'alert')) not null,
  title text,
  content text not null,
  media_url text,
  media_type text,
  county_tag text,
  bounty_tokens integer default 0,
  upvotes_count integer default 0,
  downvotes_count integer default 0,
  answers_count integer default 0,
  is_pinned boolean default false,
  is_expert_solution boolean default false,
  language text default 'en',
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
  language text default 'en',
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
  icon text default '📌',
  follower_count integer default 0,
  post_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Spaces table
create table public.spaces (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text unique not null,
  description text not null,
  icon text default '📁',
  cover_url text,
  category text default 'general',
  language text default 'en',
  is_private boolean default false,
  member_count integer default 0,
  post_count integer default 0,
  created_by uuid references public.profiles on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Space Members table
create table public.space_members (
  space_id uuid references public.spaces on delete cascade not null,
  user_id uuid references public.profiles on delete cascade not null,
  role text check (role in ('member', 'moderator', 'admin')) default 'member',
  joined_at timestamp with time zone default timezone('utc'::text, now()),
  primary key (space_id, user_id)
);

-- Notifications table
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  actor_id uuid references public.profiles on delete set null,
  type text not null,
  target_id uuid,
  target_type text,
  content text not null,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Follows table
create table public.follows (
  follower_id uuid references public.profiles on delete cascade not null,
  following_id uuid references public.profiles on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  primary key (follower_id, following_id)
);

-- Saves table
create table public.saves (
  user_id uuid references public.profiles on delete cascade not null,
  target_type text check (target_type in ('post', 'answer')) not null,
  target_id uuid not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id, target_type, target_id)
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
  target_type text not null,
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
  type text not null,
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

-- Professionals table
create table public.professionals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null unique,
  title text not null,
  bio text not null,
  qualifications text not null,
  qualification_doc text,
  expertise text[] default '{}',
  teaching_levels text[] default '{}',
  languages text[] default '{English}',
  county text,
  availability text default 'weekdays',
  session_format text default 'video',
  rate integer default 0,
  currency text default 'KES',
  mpesa_number text,
  status text default 'pending',
  heshima_rating integer default 0,
  session_count integer default 0,
  rating numeric(2,1) default 0.0,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Sessions table
create table public.sessions (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.profiles on delete cascade not null,
  professional_id uuid references public.profiles on delete cascade not null,
  post_id uuid references public.posts on delete set null,
  status text default 'requested',
  topic text not null,
  goal text,
  scheduled_at timestamp with time zone,
  duration_minutes integer default 30,
  format text default 'video',
  language text default 'en',
  notes text,
  student_rating integer,
  student_review text,
  tip_amount numeric(10,2),
  tip_status text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Messages table
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.sessions on delete set null,
  sender_id uuid references public.profiles on delete cascade not null,
  receiver_id uuid references public.profiles on delete cascade not null,
  content text not null,
  file_url text,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Tips table
create table public.tips (
  id uuid default uuid_generate_v4() primary key,
  sender_id uuid references public.profiles on delete cascade not null,
  professional_id uuid references public.profiles on delete cascade not null,
  session_id uuid references public.sessions on delete cascade not null,
  amount numeric(10,2) not null,
  fee numeric(10,2) not null,
  net_amount numeric(10,2) not null,
  currency text default 'KES',
  mpesa_reference text,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Payouts table
create table public.payouts (
  id uuid default uuid_generate_v4() primary key,
  professional_id uuid references public.profiles on delete cascade not null,
  amount numeric(10,2) not null,
  fee numeric(10,2) not null,
  net_amount numeric(10,2) not null,
  currency text default 'KES',
  mpesa_number text not null,
  mpesa_reference text,
  status text default 'pending',
  period_start date not null,
  period_end date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  processed_at timestamp with time zone
);

-- Marketplace Listings table
create table public.marketplace_listings (
  id uuid default uuid_generate_v4() primary key,
  seller_id uuid references public.profiles on delete cascade not null,
  title text not null,
  description text not null,
  category text not null,
  price numeric(10,2) not null,
  currency text default 'KES',
  county text not null,
  location text,
  images text[] default '{}',
  status text default 'active',
  views_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Nyumba Kumi Alerts table
create table public.nyumba_kumi_alerts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  type text not null,
  title text not null,
  description text not null,
  county text not null,
  approximate_location text,
  severity text default 'medium',
  confirmations integer default 0,
  is_urgent boolean default false,
  status text default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Quizzes table
create table public.quizzes (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  slug text unique not null,
  description text not null,
  category text not null,
  difficulty text check (difficulty in ('easy', 'medium', 'hard')) not null,
  question_count integer default 0,
  estimated_time_minutes integer default 10,
  heshima_reward integer default 10,
  language text default 'en',
  county text,
  space_id uuid references public.spaces on delete set null,
  created_by uuid references public.profiles on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Quiz Questions table
create table public.quiz_questions (
  id uuid default uuid_generate_v4() primary key,
  quiz_id uuid references public.quizzes on delete cascade not null,
  question text not null,
  options text[] not null,
  correct_index integer not null,
  explanation text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Quiz Results table
create table public.quiz_results (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  quiz_id uuid references public.quizzes on delete cascade not null,
  score integer not null,
  total integer not null,
  completed_at timestamp with time zone default timezone('utc'::text, now())
);

-- Parent Links table
create table public.parent_links (
  id uuid default uuid_generate_v4() primary key,
  parent_id uuid references public.profiles on delete cascade not null,
  child_id uuid references public.profiles on delete cascade not null,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(parent_id, child_id)
);

-- Audit Logs table
create table public.audit_logs (
  id uuid default uuid_generate_v4() primary key,
  actor_id uuid references public.profiles on delete cascade not null,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  reason text,
  previous_state jsonb,
  new_state jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Indexes
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
create index messages_session_id_idx on messages(session_id);
create index messages_sender_receiver_idx on messages(sender_id, receiver_id);
create index sessions_student_idx on sessions(student_id);
create index sessions_professional_idx on sessions(professional_id);
create index sessions_status_idx on sessions(status);
create index marketplace_county_idx on marketplace_listings(county);
create index marketplace_category_idx on marketplace_listings(category);
create index marketplace_status_idx on marketplace_listings(status);
create index nyumba_alerts_county_idx on nyumba_kumi_alerts(county);
create index nyumba_alerts_status_idx on nyumba_kumi_alerts(status);
create index quizzes_category_idx on quizzes(category);
create index quiz_results_user_idx on quiz_results(user_id);

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.answers enable row level security;
alter table public.votes enable row level security;
alter table public.topics enable row level security;
alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.post_topics enable row level security;
alter table public.user_topics enable row level security;
alter table public.notifications enable row level security;
alter table public.follows enable row level security;
alter table public.saves enable row level security;
alter table public.translations enable row level security;
alter table public.moderation enable row level security;
alter table public.tokens enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.professionals enable row level security;
alter table public.sessions enable row level security;
alter table public.messages enable row level security;
alter table public.tips enable row level security;
alter table public.payouts enable row level security;
alter table public.marketplace_listings enable row level security;
alter table public.nyumba_kumi_alerts enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_results enable row level security;
alter table public.parent_links enable row level security;
alter table public.audit_logs enable row level security;

-- Basic RLS policies
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);

create policy "Posts are viewable by everyone" on public.posts for select using (true);
create policy "Users can create posts" on public.posts for insert with check (auth.uid() = user_id);
create policy "Users can update their own posts" on public.posts for update using (auth.uid() = user_id);
create policy "Users can delete their own posts" on public.posts for delete using (auth.uid() = user_id);

create policy "Answers are viewable by everyone" on public.answers for select using (true);
create policy "Users can create answers" on public.answers for insert with check (auth.uid() = user_id);
create policy "Users can update their own answers" on public.answers for update using (auth.uid() = user_id);
create policy "Users can delete their own answers" on public.answers for delete using (auth.uid() = user_id);

create policy "Votes are viewable by the user" on public.votes for select using (auth.uid() = user_id);
create policy "Users can create votes" on public.votes for insert with check (auth.uid() = user_id);
create policy "Users can delete their own votes" on public.votes for delete using (auth.uid() = user_id);

create policy "Topics are viewable by everyone" on public.topics for select using (true);

create policy "Spaces are viewable by everyone" on public.spaces for select using (true);
create policy "Users can create spaces" on public.spaces for insert with check (auth.uid() = created_by);
create policy "Space members are viewable by everyone" on public.space_members for select using (true);
create policy "Users can join spaces" on public.space_members for insert with check (auth.uid() = user_id);
create policy "Users can leave spaces" on public.space_members for delete using (auth.uid() = user_id);

create policy "Notifications are viewable by the user" on public.notifications for select using (auth.uid() = user_id);
create policy "Users can update their own notifications" on public.notifications for update using (auth.uid() = user_id);

create policy "Follows are viewable by everyone" on public.follows for select using (true);
create policy "Users can follow" on public.follows for insert with check (auth.uid() = follower_id);
create policy "Users can unfollow" on public.follows for delete using (auth.uid() = follower_id);

create policy "Saves are viewable by the user" on public.saves for select using (auth.uid() = user_id);
create policy "Users can save" on public.saves for insert with check (auth.uid() = user_id);
create policy "Users can unsave" on public.saves for delete using (auth.uid() = user_id);

create policy "Professionals are viewable by everyone" on public.professionals for select using (true);
create policy "Users can apply as professional" on public.professionals for insert with check (auth.uid() = user_id);
create policy "Users can update their own professional profile" on public.professionals for update using (auth.uid() = user_id);

create policy "Sessions are viewable by participants" on public.sessions for select using (auth.uid() = student_id or auth.uid() = professional_id);
create policy "Users can request sessions" on public.sessions for insert with check (auth.uid() = student_id);
create policy "Users can update their sessions" on public.sessions for update using (auth.uid() = student_id or auth.uid() = professional_id);

create policy "Messages are viewable by participants" on public.messages for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "Users can send messages" on public.messages for insert with check (auth.uid() = sender_id);
create policy "Users can mark messages as read" on public.messages for update using (auth.uid() = receiver_id);

create policy "Tips are viewable by participants" on public.tips for select using (auth.uid() = sender_id or auth.uid() = professional_id);
create policy "Users can send tips" on public.tips for insert with check (auth.uid() = sender_id);

create policy "Marketplace listings are viewable by everyone" on public.marketplace_listings for select using (true);
create policy "Users can create listings" on public.marketplace_listings for insert with check (auth.uid() = seller_id);
create policy "Sellers can update their listings" on public.marketplace_listings for update using (auth.uid() = seller_id);

create policy "Nyumba Kumi alerts are viewable by everyone" on public.nyumba_kumi_alerts for select using (true);
create policy "Users can create alerts" on public.nyumba_kumi_alerts for insert with check (auth.uid() = user_id);

create policy "Quizzes are viewable by everyone" on public.quizzes for select using (true);
create policy "Quiz questions are viewable by everyone" on public.quiz_questions for select using (true);
create policy "Quiz results are viewable by the user" on public.quiz_results for select using (auth.uid() = user_id);
create policy "Users can submit quiz results" on public.quiz_results for insert with check (auth.uid() = user_id);

create policy "Moderation reports are viewable by reporter and admin" on public.moderation for select using (auth.uid() = reporter_id or auth.uid() = reviewer_id or exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Users can create moderation reports" on public.moderation for insert with check (auth.uid() = reporter_id);

-- Triggers for updated_at
create or replace function public.handle_updated_at() returns trigger as $$ begin new.updated_at = timezone('utc'::text, now()); return new; end; $$ language plpgsql security definer;
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.handle_updated_at();
create trigger posts_updated_at before update on public.posts for each row execute procedure public.handle_updated_at();
create trigger answers_updated_at before update on public.answers for each row execute procedure public.handle_updated_at();
create trigger spaces_updated_at before update on public.spaces for each row execute procedure public.handle_updated_at();
create trigger professionals_updated_at before update on public.professionals for each row execute procedure public.handle_updated_at();
create trigger sessions_updated_at before update on public.sessions for each row execute procedure public.handle_updated_at();
create trigger marketplace_listings_updated_at before update on public.marketplace_listings for each row execute procedure public.handle_updated_at();
create trigger nyumba_kumi_alerts_updated_at before update on public.nyumba_kumi_alerts for each row execute procedure public.handle_updated_at();

-- Trigger to create profile on signup
create or replace function public.handle_new_user() returns trigger as $$ begin
  insert into public.profiles (id, username, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)), new.raw_user_meta_data->>'full_name');
  return new;
end; $$ language plpgsql security definer;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- Trigger to update answer counts
create or replace function public.update_post_counts() returns trigger as $$
begin
  if TG_OP = 'INSERT' then update posts set answers_count = answers_count + 1 where id = NEW.post_id;
  elsif TG_OP = 'DELETE' then update posts set answers_count = answers_count - 1 where id = OLD.post_id;
  end if;
  return NULL;
end; $$ language plpgsql security definer;
create trigger answers_count_trigger after insert or delete on public.answers for each row execute procedure public.update_post_counts();

-- Trigger to update vote counts
create or replace function public.update_vote_counts() returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.vote_type = 1 then
      if NEW.target_type = 'post' then update posts set upvotes_count = upvotes_count + 1 where id = NEW.target_id;
      elsif NEW.target_type = 'answer' then update answers set upvotes_count = upvotes_count + 1 where id = NEW.target_id;
      end if;
    else
      if NEW.target_type = 'post' then update posts set downvotes_count = downvotes_count + 1 where id = NEW.target_id;
      end if;
    end if;
  elsif TG_OP = 'DELETE' then
    if OLD.vote_type = 1 then
      if OLD.target_type = 'post' then update posts set upvotes_count = upvotes_count - 1 where id = OLD.target_id;
      elsif OLD.target_type = 'answer' then update answers set upvotes_count = upvotes_count - 1 where id = OLD.target_id;
      end if;
    else
      if OLD.target_type = 'post' then update posts set downvotes_count = downvotes_count - 1 where id = OLD.target_id;
      end if;
    end if;
  end if;
  return NULL;
end; $$ language plpgsql security definer;
create trigger vote_count_trigger after insert or delete on public.votes for each row execute procedure public.update_vote_counts();

-- Trigger to update Heshima rating
create or replace function public.update_heshima_rating() returns trigger as $$ begin
  if TG_OP = 'INSERT' then
    update profiles set heshima_rating = heshima_rating + 1 where id = NEW.user_id;
  elsif TG_OP = 'DELETE' then
    update profiles set heshima_rating = greatest(heshima_rating - 1, 0) where id = OLD.user_id;
  end if;
  return NULL;
end; $$ language plpgsql security definer;
create trigger heshima_rating_trigger after insert or delete on public.votes for each row execute procedure public.update_heshima_rating();

-- Seed data for topics
insert into public.topics (name, slug, description, color, icon) values
  ('Tech & Startups', 'tech-startups', 'Builders, funding, M-Pesa, dev life', 'green', '💻'),
  ('Agriculture & Farming', 'agriculture', 'Markets, crops, climate-smart farming', 'brown', '🌾'),
  ('Biashara & Hustles', 'biashara', 'SMEs, side hustles, practical money tips', 'gold', '🧺'),
  ('Legal & Hustler Rights', 'legal-rights', 'Know your rights, access local help', 'blue', '⚖️'),
  ('Culture & Entertainment', 'culture', 'Music, film, art, sport, identity', 'red', '🎭'),
  ('Education', 'education', 'Learning, schools, scholarships, skills', 'green', '🎓'),
  ('Health', 'health', 'Wellness, healthcare, nutrition', 'gold', '🏥'),
  ('County Politics', 'county-politics', 'Local governance, county news', 'blue', '🏛️');

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

-- Seed data for spaces
insert into public.spaces (name, slug, description, icon, category) values
  ('#KilimoSmart', 'kilimo-smart', 'Practical farming for a changing climate', '🌾', 'Agriculture'),
  ('Nairobi Tech', 'nairobi-tech', 'Build, ship, and grow in Nairobi', '💻', 'Technology'),
  ('Mombasa Trade', 'mombasa-trade', 'Coastal commerce and opportunity', '🌊', 'Biashara'),
  ('Learn Together', 'learn-together', 'Study support without the pressure', '🎓', 'Education'),
  ('Swahili Folklore', 'swahili-folklore', 'Stories, proverbs, and coastal heritage', '📖', 'Culture'),
  ('Nyumba Kumi', 'nyumba-kumi', 'Neighbourhood safety and community watch', '🛡️', 'Community'),
  ('Biashara & Hustles', 'biashara-hustles', 'SMEs, side hustles, and practical money tips', '🧺', 'Biashara'),
  ('County Politics', 'county-politics', 'Local governance and county news', '🏛️', 'Politics');

-- Seed data for quizzes
insert into public.quizzes (title, slug, description, category, difficulty, question_count, estimated_time_minutes, heshima_reward) values
  ('Kenyan Counties', 'kenyan-counties', 'How well do you know Kenya''s 47 counties?', 'Counties', 'easy', 10, 5, 20),
  ('Agriculture Basics', 'agriculture-basics', 'Test your knowledge of Kenyan farming', 'Agriculture', 'easy', 8, 4, 15),
  ('Swahili Proverbs', 'swahili-proverbs', 'Match the proverb to its meaning', 'Culture', 'medium', 10, 8, 25),
  ('Know Your Rights', 'know-your-rights', 'Kenyan constitutional rights quiz', 'Rights', 'medium', 12, 10, 30),
  ('Biashara Tips', 'biashara-tips', 'Practical business knowledge for Kenyan entrepreneurs', 'Biashara', 'easy', 8, 5, 15),
  ('Tech in Kenya', 'tech-in-kenya', 'Kenya''s tech ecosystem and innovation', 'Tech', 'medium', 10, 8, 25),
  ('Health & Nutrition', 'health-nutrition', 'Wellness knowledge for Kenyan families', 'Health', 'easy', 8, 4, 15),
  ('Environmental Conservation', 'environmental-conservation', 'Kenya''s environment and conservation efforts', 'Environment', 'medium', 10, 8, 25);

-- Seed quiz questions
insert into public.quiz_questions (quiz_id, question, options, correct_index) values
  ((select id from quizzes where slug = 'kenyan-counties' limit 1), 'Which is the smallest county in Kenya by area?', '{"Mombasa", "Nairobi", "Kiambu", "Kisumu"}', 0),
  ((select id from quizzes where slug = 'kenyan-counties' limit 1), 'Which county is known as the "Green City in the Sun"?', '{"Nairobi", "Nakuru", "Eldoret", "Kitale"}', 0);
