-- Fix space_members RLS infinite recursion (42P17) and missing saves.id column (42703)

-- 1. SECURITY DEFINER helper that bypasses RLS to check space membership
create or replace function is_space_member(p_space_id uuid, p_user_id uuid, p_roles text[] default '{}')
returns boolean
language sql security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from space_members
    where space_id = p_space_id
      and user_id = p_user_id
      and (p_roles = '{}' or role = any(p_roles))
  )
$$;

grant execute on function is_space_member to authenticated, anon;

-- 2. Fix space_members policies — use the helper instead of recursive subqueries
drop policy if exists "Members can read space_members" on space_members;
create policy "Members can read space_members" on space_members for select using (
  user_id = auth.uid()
  or is_space_member(space_id, auth.uid(), '{admin,owner,moderator}')
);

drop policy if exists "Admins can manage members" on space_members;
create policy "Admins can manage members" on space_members for all using (
  is_space_member(space_id, auth.uid(), '{admin,owner}')
);

-- 3. Fix space update policy to use the helper too
drop policy if exists "Space admins can update" on spaces;
create policy "Space admins can update" on spaces for update using (
  is_space_member(id, auth.uid(), '{admin,owner}')
);

-- 4. Add id column to saves (was created without one, frontend selects it)
alter table public.saves add column if not exists id uuid default gen_random_uuid();
-- Make it the primary key if no PK exists (safe to run multiple times)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conrelid = 'public.saves'::regclass and contype = 'p'
  ) then
    alter table public.saves add primary key (id);
  end if;
end;
$$;

-- 5. Add RLS policy for user_locations (allow users to upsert their own location)
drop policy if exists "Users can upsert own location" on user_locations;
create policy "Users can upsert own location" on user_locations for insert
  with check (auth.uid() = user_id);
create policy "Users can update own location" on user_locations for update
  using (auth.uid() = user_id);
create policy "Anyone can view locations" on user_locations for select
  using (true);
