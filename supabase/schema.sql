-- Little Days baby tracker — Supabase schema
-- Run this once in your Supabase project's SQL Editor (Dashboard > SQL Editor > New query).

create table if not exists public.little_days_kv (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null,
  shared boolean not null default false,
  value text not null,
  updated_at timestamptz not null default now(),
  unique (user_id, key, shared)
);

create index if not exists little_days_kv_user_key_idx
  on public.little_days_kv (user_id, key);

-- Row Level Security: every signed-in user can only ever see or touch
-- their own rows. This is what makes it safe to use the public anon key
-- in the browser.
alter table public.little_days_kv enable row level security;

drop policy if exists "select own rows" on public.little_days_kv;
create policy "select own rows"
  on public.little_days_kv for select
  using (auth.uid() = user_id);

drop policy if exists "insert own rows" on public.little_days_kv;
create policy "insert own rows"
  on public.little_days_kv for insert
  with check (auth.uid() = user_id);

drop policy if exists "update own rows" on public.little_days_kv;
create policy "update own rows"
  on public.little_days_kv for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "delete own rows" on public.little_days_kv;
create policy "delete own rows"
  on public.little_days_kv for delete
  using (auth.uid() = user_id);

-- Turns on realtime change notifications for this table, which is what
-- lets a second device pick up new entries within a couple of seconds.
alter publication supabase_realtime add table public.little_days_kv;
