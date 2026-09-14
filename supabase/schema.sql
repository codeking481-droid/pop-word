create extension if not exists pgcrypto;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  user_id uuid unique not null references auth.users(id) on delete cascade,
  pro_expiry timestamptz,
  download_count integer not null default 0 check (download_count >= 0),
  paystack_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "Users can read their subscription"
  on public.subscriptions for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.consume_download()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_subscription public.subscriptions;
begin
  select * into current_subscription
    from public.subscriptions
    where user_id = auth.uid()
    for update;

  if not found then
    insert into public.subscriptions (email, user_id, download_count)
    values ((select email from auth.users where id = auth.uid()), auth.uid(), 1);
    return true;
  end if;

  if current_subscription.pro_expiry > now() then
    return true;
  end if;

  if current_subscription.download_count >= 3 then
    return false;
  end if;

  update public.subscriptions
    set download_count = download_count + 1, updated_at = now()
    where id = current_subscription.id;
  return true;
end;
$$;

revoke all on function public.consume_download() from public;
grant execute on function public.consume_download() to authenticated;
