create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  pro_expiry timestamptz,
  download_count integer not null default 0,
  status text not null default 'trial',
  paystack_ref text,
  activated_at timestamptz
);

alter table public.subscriptions add column if not exists email text;
alter table public.subscriptions add column if not exists pro_expiry timestamptz;
alter table public.subscriptions add column if not exists download_count integer not null default 0;
alter table public.subscriptions add column if not exists status text not null default 'trial';
alter table public.subscriptions add column if not exists paystack_ref text;
alter table public.subscriptions add column if not exists activated_at timestamptz;

alter table public.subscriptions enable row level security;

drop policy if exists "Users can read their own subscription" on public.subscriptions;
create policy "Users can read their own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

revoke insert, update, delete on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;
