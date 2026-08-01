-- Single active session per account: profiles.active_session_id stores the
-- JWT session_id of the most recent login. Any other session whose id no
-- longer matches is stale and gets signed out client-side.

alter table public.profiles add column if not exists active_session_id uuid;

comment on column public.profiles.active_session_id is
  'session_id of the current active login; set on every login to invalidate older sessions';
