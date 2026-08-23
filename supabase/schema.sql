-- Little Days — move to one row per record instead of one JSON blob per
-- collection. Run this in the Supabase SQL Editor.
--
-- Why: the old design stored every feed/sleep/diaper/pump event as a
-- single JSON array in one row (little_days_kv, key='events'). Every save
-- rewrote that entire row. If a read ever silently failed or returned
-- empty (network blip, token refresh, anything), the app had no way to
-- tell "genuinely empty" apart from "read failed" — and the next save
-- would overwrite the whole row with just the new entry, permanently
-- losing everything before it. This migration fixes that by giving each
-- event/growth measurement/journal entry its own row: an insert or update
-- now only ever touches ONE row, so a bad read can never wipe history.
-- It also means the data no longer keeps growing one single text cell
-- forever — new rows instead, indexed and queryable.
--
-- This migration is additive and safe to run more than once. It does NOT
-- delete your existing little_days_kv rows — they're left in place as a
-- backup until you've confirmed the app works correctly with the new
-- tables (see the commented-out cleanup at the bottom).

create table if not exists public.events (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  timestamp timestamptz not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists events_user_time_idx on public.events (user_id, timestamp desc);
alter table public.events enable row level security;
drop policy if exists "select own events" on public.events;
create policy "select own events" on public.events for select using (auth.uid() = user_id);
drop policy if exists "insert own events" on public.events;
create policy "insert own events" on public.events for insert with check (auth.uid() = user_id);
drop policy if exists "update own events" on public.events;
create policy "update own events" on public.events for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "delete own events" on public.events;
create policy "delete own events" on public.events for delete using (auth.uid() = user_id);
alter publication supabase_realtime add table public.events;

create table if not exists public.growth_entries (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  date timestamptz not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists growth_user_date_idx on public.growth_entries (user_id, date desc);
alter table public.growth_entries enable row level security;
drop policy if exists "select own growth" on public.growth_entries;
create policy "select own growth" on public.growth_entries for select using (auth.uid() = user_id);
drop policy if exists "insert own growth" on public.growth_entries;
create policy "insert own growth" on public.growth_entries for insert with check (auth.uid() = user_id);
drop policy if exists "update own growth" on public.growth_entries;
create policy "update own growth" on public.growth_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "delete own growth" on public.growth_entries;
create policy "delete own growth" on public.growth_entries for delete using (auth.uid() = user_id);
alter publication supabase_realtime add table public.growth_entries;

create table if not exists public.journal_entries (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  timestamp timestamptz not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists journal_user_time_idx on public.journal_entries (user_id, timestamp desc);
alter table public.journal_entries enable row level security;
drop policy if exists "select own journal" on public.journal_entries;
create policy "select own journal" on public.journal_entries for select using (auth.uid() = user_id);
drop policy if exists "insert own journal" on public.journal_entries;
create policy "insert own journal" on public.journal_entries for insert with check (auth.uid() = user_id);
drop policy if exists "update own journal" on public.journal_entries;
create policy "update own journal" on public.journal_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "delete own journal" on public.journal_entries;
create policy "delete own journal" on public.journal_entries for delete using (auth.uid() = user_id);
alter publication supabase_realtime add table public.journal_entries;

-- One-time copy of whatever currently exists in the old blob rows into
-- the new tables. Safe to re-run — "on conflict do nothing" skips rows
-- that are already migrated.
insert into public.events (id, user_id, type, timestamp, data)
select
  item->>'id',
  kv.user_id,
  item->>'type',
  (item->>'timestamp')::timestamptz,
  item
from public.little_days_kv kv,
     jsonb_array_elements(kv.value::jsonb) as item
where kv.key = 'events' and kv.shared = false
on conflict (user_id, id) do nothing;

insert into public.growth_entries (id, user_id, date, data)
select
  item->>'id',
  kv.user_id,
  (item->>'date')::timestamptz,
  item
from public.little_days_kv kv,
     jsonb_array_elements(kv.value::jsonb) as item
where kv.key = 'growth' and kv.shared = false
on conflict (user_id, id) do nothing;

insert into public.journal_entries (id, user_id, timestamp, data)
select
  item->>'id',
  kv.user_id,
  (item->>'timestamp')::timestamptz,
  item
from public.little_days_kv kv,
     jsonb_array_elements(kv.value::jsonb) as item
where kv.key = 'journal' and kv.shared = false
on conflict (user_id, id) do nothing;

-- After deploying the updated app and confirming Today/Log/Growth/Journal
-- all look correct, you can optionally clean up the old blob rows (kept
-- as a backup until then) by uncommenting and running:
--
-- delete from public.little_days_kv where key in ('events', 'growth', 'journal');
--
-- 'profile' and 'active-timer' stay in little_days_kv — they're small,
-- single-object values, not growing collections, so the blob model is
-- fine for those.