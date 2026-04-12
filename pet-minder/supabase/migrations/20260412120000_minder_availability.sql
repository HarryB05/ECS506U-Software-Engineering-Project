-- minder_availability: weekly recurring availability slots.
-- A minder adds slots per day-of-week (e.g. "Mondays 09:00–17:00").
-- Owners see these when browsing profiles and booking.

-- 1. Day-of-week enum -------------------------------------------------------
do $$ begin
  create type public.day_of_week as enum (
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
  );
exception when duplicate_object then null;
end $$;

-- 2. Table -----------------------------------------------------------------
create table if not exists public.minder_availability (
  id          uuid        primary key default gen_random_uuid(),
  minder_id   uuid        not null references public.minder_profiles (id) on delete cascade,
  day_of_week public.day_of_week not null,
  start_time  time        not null,
  end_time    time        not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint  minder_availability_time_order check (end_time > start_time)
);

create index if not exists minder_availability_minder_idx
  on public.minder_availability (minder_id);

alter table public.minder_availability enable row level security;

-- 3. Minder: full CRUD on their own slots ----------------------------------
drop policy if exists "Minder can manage own availability" on public.minder_availability;

create policy "Minder can manage own availability"
  on public.minder_availability
  for all
  to authenticated
  using (
    minder_id in (
      select id from public.minder_profiles
      where user_id = auth.uid()
        and deleted_at is null
    )
  )
  with check (
    minder_id in (
      select id from public.minder_profiles
      where user_id = auth.uid()
        and deleted_at is null
    )
  );

-- 4. Any authenticated user can read availability (needed for booking page) --
drop policy if exists "Authenticated users can read minder availability" on public.minder_availability;

create policy "Authenticated users can read minder availability"
  on public.minder_availability
  for select
  to authenticated
  using (true);
