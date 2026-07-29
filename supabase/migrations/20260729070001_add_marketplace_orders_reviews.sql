-- Migration: Add marketplace_orders, marketplace_reviews, saved_listings + missing columns


-- 1. Add missing columns to marketplace_listings
alter table public.marketplace_listings
  add column if not exists seller_rating numeric(3,2) default 0,
  add column if not exists orders_count integer default 0,
  add column if not exists stock_quantity integer, -- null = unlimited
  add column if not exists condition text default 'used',
  add column if not exists is_active boolean default true;

-- Add index for is_active lookups
create index if not exists marketplace_listings_is_active_idx on public.marketplace_listings(is_active);
-- Drop old category index to recreate with better name
drop index if exists marketplace_category_idx;
create index if not exists marketplace_listings_category_idx on public.marketplace_listings(category);

-- 2. Create marketplace_orders table
create table if not exists public.marketplace_orders (
  id uuid default gen_random_uuid() primary key,
  listing_id uuid references public.marketplace_listings on delete set null,
  buyer_id uuid references public.profiles on delete set null not null,
  seller_id uuid references public.profiles on delete set null not null,
  quantity integer default 1 check (quantity > 0),
  unit_price numeric(10,2) not null,
  total_price numeric(12,2) not null,
  currency text default 'KES',
  status text not null default 'pending' check (status in ('pending','confirmed','shipped','delivered','cancelled','refunded')),
  payment_provider text,
  payment_reference text,
  delivery_address text,
  contact_phone text,
  delivery_notes text,
  created_at timestamptz default timezone('utc'::text, now()),
  updated_at timestamptz default timezone('utc'::text, now())
);

-- Orders indexes
create index if not exists marketplace_orders_buyer_idx on public.marketplace_orders(buyer_id);
create index if not exists marketplace_orders_seller_idx on public.marketplace_orders(seller_id);
create index if not exists marketplace_orders_status_idx on public.marketplace_orders(status);
create index if not exists marketplace_orders_listing_idx on public.marketplace_orders(listing_id);

-- 3. Create marketplace_reviews table
create table if not exists public.marketplace_reviews (
  id uuid default gen_random_uuid() primary key,
  listing_id uuid references public.marketplace_listings on delete cascade not null,
  order_id uuid references public.marketplace_orders on delete set null,
  reviewer_id uuid references public.profiles on delete cascade not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz default timezone('utc'::text, now())
);

create index if not exists marketplace_reviews_listing_idx on public.marketplace_reviews(listing_id);
create index if not exists marketplace_reviews_reviewer_idx on public.marketplace_reviews(reviewer_id);

-- 4. Create saved_listings table
create table if not exists public.saved_listings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  listing_id uuid references public.marketplace_listings on delete cascade not null,
  created_at timestamptz default timezone('utc'::text, now()),
  unique(user_id, listing_id)
);

create index if not exists saved_listings_user_idx on public.saved_listings(user_id);
create index if not exists saved_listings_listing_idx on public.saved_listings(listing_id);

-- 5. Full-text search support for marketplace_listings
alter table public.marketplace_listings add column if not exists tsv tsvector;

create or replace function public.marketplace_listings_tsv_trigger() returns trigger as $$
begin
  new.tsv := to_tsvector('english', coalesce(new.title, '') || ' ' || coalesce(new.description, ''));
  return new;
end;
$$ language plpgsql;

drop trigger if exists marketplace_listings_tsv_update on public.marketplace_listings;
create trigger marketplace_listings_tsv_update
  before insert or update on public.marketplace_listings
  for each row execute function public.marketplace_listings_tsv_trigger();

update public.marketplace_listings set tsv = to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''));

-- 6. Trigger to update orders_count on marketplace_listings when an order is created
create or replace function public.update_listing_orders_count() returns trigger as $$
begin
  update public.marketplace_listings
  set orders_count = orders_count + 1
  where id = new.listing_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists marketplace_order_insert_update_count on public.marketplace_orders;
create trigger marketplace_order_insert_update_count
  after insert on public.marketplace_orders
  for each row execute function public.update_listing_orders_count();

-- 7. Trigger to update seller_rating when a review is submitted
create or replace function public.update_listing_seller_rating() returns trigger as $$
begin
  update public.marketplace_listings
  set seller_rating = (
    select coalesce(avg(rating::numeric), 0) from public.marketplace_reviews
    where listing_id = new.listing_id
  )
  where id = new.listing_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists marketplace_review_update_rating on public.marketplace_reviews;
create trigger marketplace_review_update_rating
  after insert or update on public.marketplace_reviews
  for each row execute function public.update_listing_seller_rating();

-- 8. RLS policies for marketplace_orders
alter table public.marketplace_orders enable row level security;

drop policy if exists "Buyers can create their orders" on public.marketplace_orders;
create policy "Buyers can create their orders" on public.marketplace_orders
  for insert with check (auth.uid() = buyer_id);

drop policy if exists "Participants can view their orders" on public.marketplace_orders;
create policy "Participants can view their orders" on public.marketplace_orders
  for select using (auth.uid() = buyer_id or auth.uid() = seller_id or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "Sellers can update order status" on public.marketplace_orders;
create policy "Sellers can update order status" on public.marketplace_orders
  for update using (auth.uid() = seller_id or auth.uid() = buyer_id or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- 9. RLS policies for marketplace_reviews
alter table public.marketplace_reviews enable row level security;

drop policy if exists "Reviews are viewable by everyone" on public.marketplace_reviews;
create policy "Reviews are viewable by everyone" on public.marketplace_reviews
  for select using (true);

drop policy if exists "Buyers can create reviews for their delivered orders" on public.marketplace_reviews;
create policy "Buyers can create reviews for their delivered orders" on public.marketplace_reviews
  for insert with check (
    auth.uid() = reviewer_id
    and exists (
      select 1 from public.marketplace_orders
      where id = order_id and buyer_id = auth.uid() and status = 'delivered'
    )
  );

-- 10. RLS policies for saved_listings
alter table public.saved_listings enable row level security;

drop policy if exists "Users can manage their saved listings" on public.saved_listings;
create policy "Users can manage their saved listings" on public.saved_listings
  for all using (auth.uid() = user_id);

-- 11. Add marketplace tables to realtime publication
-- (tables already members of supabase_realtime from prior migration)
