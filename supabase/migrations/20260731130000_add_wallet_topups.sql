-- Wallet M-Pesa top-ups: track STK push requests so the webhook can credit wallets idempotently.

create table if not exists public.wallet_topups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric(12,2) not null,
  phone text not null,
  account_reference text,
  checkout_request_id text unique,
  mpesa_reference text,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  error text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

alter table public.wallet_topups enable row level security;

create policy "Users can view own topups" on public.wallet_topups
  for select using (auth.uid() = user_id);
create policy "Users can create own topups" on public.wallet_topups
  for insert with check (auth.uid() = user_id);
create policy "Users can update own topups" on public.wallet_topups
  for update using (auth.uid() = user_id);

-- Idempotently complete a top-up after an M-Pesa callback and credit the wallet.
-- SECURITY DEFINER so the (anon) webhook can credit tokens, which are RLS-protected.
create or replace function public.complete_wallet_topup(
  p_checkout_request_id text,
  p_mpesa_reference text,
  p_amount numeric default null
) returns jsonb language plpgsql security definer as $$
declare
  v_topup public.wallet_topups;
  v_amount numeric(12,2);
begin
  select * into v_topup from public.wallet_topups
  where checkout_request_id = p_checkout_request_id
  for update;

  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_topup.status = 'completed' then return jsonb_build_object('ok', false, 'reason', 'already_completed'); end if;

  v_amount := coalesce(p_amount, v_topup.amount);

  update public.wallet_topups
  set status = 'completed', mpesa_reference = p_mpesa_reference, completed_at = now()
  where id = v_topup.id;

  insert into public.tokens (user_id, amount, type, reference)
  values (v_topup.user_id, v_amount, 'topup', p_mpesa_reference);

  return jsonb_build_object('ok', true, 'user_id', v_topup.user_id, 'amount', v_amount);
end;
$$;

create or replace function public.fail_wallet_topup(
  p_checkout_request_id text,
  p_error text default null
) returns jsonb language plpgsql security definer as $$
begin
  update public.wallet_topups
  set status = 'failed', error = p_error
  where checkout_request_id = p_checkout_request_id and status = 'pending';
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.complete_wallet_topup to anon, authenticated;
grant execute on function public.fail_wallet_topup to anon, authenticated;

-- Realtime so the wallet can live-update when a top-up completes
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wallet_topups') then
    alter publication supabase_realtime add table public.wallet_topups;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tokens') then
    alter publication supabase_realtime add table public.tokens;
  end if;
end $$;

notify pgrst, 'reload schema';
