-- Client-side event tracking (lightweight first-party analytics).
--
-- Note: Supabase Analytics Buckets (Iceberg) are in private alpha and do not
-- yet support client-side writes. Until write support lands, events are stored
-- in this append-only Postgres table so the app can track page views, searches
-- and key actions without a third-party script.
--
-- Design:
--   * Anyone (anon + authenticated) may INSERT so the tracker stays fire-and-
--     forget and never needs a server round-trip.
--   * INSERTs only: no SELECT/UPDATE/DELETE policies exist for regular roles,
--     so events are write-only via REST. Reads go through admin-only RPCs.
--   * user_id is nullable so anonymous visitors are still counted.
--   * event_properties is jsonb so schema can evolve without migrations.

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  event_name text not null,
  event_properties jsonb not null default '{}'::jsonb,
  user_id uuid references auth.users (id) on delete set null,
  session_id text,
  page_path text,
  referrer text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.analytics_events enable row level security;

drop policy if exists "analytics_events_insert" on public.analytics_events;
create policy "analytics_events_insert"
  on public.analytics_events
  for insert
  to anon, authenticated
  with check (true);

-- Reads: admins only, via RPCs (mirrors the is_admin() gating used elsewhere).

create or replace function public.get_analytics_overview(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  select jsonb_build_object(
    'total_events', count(*)::bigint,
    'total_page_views', count(*) filter (where event_name = 'page_view')::bigint,
    'unique_visitors', count(distinct coalesce(user_id::text, session_id))::bigint,
    'authenticated_users', count(distinct user_id)::bigint,
    'top_pages', (
      select coalesce(jsonb_agg(x order by x->>'count' desc), '[]'::jsonb)
      from (
        select jsonb_build_object('path', page_path, 'count', count(*)::bigint) as x
        from public.analytics_events
        where event_name = 'page_view'
          and created_at >= now() - make_interval(days => p_days)
          and page_path is not null
        group by page_path
        order by count(*) desc
        limit 20
      ) t
    ),
    'top_events', (
      select coalesce(jsonb_agg(x order by x->>'count' desc), '[]'::jsonb)
      from (
        select jsonb_build_object('event_name', event_name, 'count', count(*)::bigint) as x
        from public.analytics_events
        where created_at >= now() - make_interval(days => p_days)
        group by event_name
        order by count(*) desc
        limit 20
      ) t
    ),
    'daily_views', (
      select coalesce(jsonb_agg(x), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'day', to_char(date_trunc('day', created_at), 'YYYY-MM-DD'),
          'count', count(*)::bigint
        ) as x
        from public.analytics_events
        where event_name = 'page_view'
          and created_at >= now() - make_interval(days => p_days)
        group by date_trunc('day', created_at)
        order by date_trunc('day', created_at)
      ) t
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_analytics_overview(integer) from public;

-- Indexes for the common aggregate queries.
create index if not exists analytics_events_created_idx
  on public.analytics_events (created_at desc);
create index if not exists analytics_events_name_idx
  on public.analytics_events (event_name);
create index if not exists analytics_events_user_idx
  on public.analytics_events (user_id);
create index if not exists analytics_events_session_idx
  on public.analytics_events (session_id);
