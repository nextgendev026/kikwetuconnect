-- Background push for direct messages.
-- Fires an async webhook (via pg_net) whenever a message is inserted so that
-- recipients get a web-push notification even when the app is closed.
-- The webhook is guarded by a secret stored in app_settings (generated here).

create extension if not exists pg_net;

create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value)
values ('push_webhook_secret', gen_random_uuid()::text)
on conflict (key) do nothing;

create or replace function public.notify_message_push()
returns trigger
language plpgsql
security definer
set search_path = public, net
as $$
declare
  v_secret text;
  v_url text;
  v_body jsonb;
begin
  if new.sender_id is null then
    return new;
  end if;

  select value into v_secret
  from public.app_settings
  where key = 'push_webhook_secret';

  if v_secret is null then
    return new;
  end if;

  v_url := 'https://kikwetuconnect.vercel.app/api/webhooks/supabase';

  v_body := jsonb_build_object(
    'type', 'message',
    'conversation_id', new.conversation_id,
    'message_id', new.id,
    'sender_id', new.sender_id,
    'content', new.content,
    'message_type', new.message_type,
    'metadata', new.metadata
  );

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-kc-secret', v_secret
    ),
    body := v_body
  );

  return new;
exception when others then
  -- Never let webhook delivery break message inserts.
  return new;
end;
$$;

drop trigger if exists messages_push_notify on public.messages;

create trigger messages_push_notify
  after insert on public.messages
  for each row execute function public.notify_message_push();

revoke all on function public.notify_message_push() from public, anon, authenticated;
