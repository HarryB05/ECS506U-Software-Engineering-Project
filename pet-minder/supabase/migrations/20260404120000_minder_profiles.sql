-- minder_profiles: table creation + RLS for minder workspace and owner search.
-- Run in Supabase SQL editor if migrations are not applied automatically.

-- 1. Table (no-op if already created via the Supabase dashboard) ----------------
create table if not exists public.minder_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  service_description text,
  supported_pet_types text[] not null default '{}',
  service_pricing text,
  is_verified boolean not null default false,
  average_rating numeric(3,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- One profile per minder (also relied on by the soft-delete revive logic).
create unique index if not exists minder_profiles_user_id_unique
  on public.minder_profiles (user_id);

create index if not exists minder_profiles_user_active_idx
  on public.minder_profiles (user_id)
  where deleted_at is null;

alter table public.minder_profiles enable row level security;

-- 2. Minder's own row — CRUD -------------------------------------------------------
drop policy if exists "Minders can read own minder_profile"   on public.minder_profiles;
drop policy if exists "Minders can insert own minder_profile" on public.minder_profiles;
drop policy if exists "Minders can update own minder_profile" on public.minder_profiles;

-- No deleted_at check: minders need to read their own soft-deleted row so the
-- revive path in ensureMinderProfileForUser can detect and restore it.
create policy "Minders can read own minder_profile"
  on public.minder_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Minders can insert own minder_profile"
  on public.minder_profiles
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.roles r
      where r.user_id = auth.uid()
        and r.role_type = 'minder'
        and r.deleted_at is null
    )
  );

create policy "Minders can update own minder_profile"
  on public.minder_profiles
  for update
  to authenticated
  using  (auth.uid() = user_id and deleted_at is null)
  with check (auth.uid() = user_id);

-- 3. Owner search — any authenticated user may read all non-deleted profiles ------
drop policy if exists "Authenticated users can search minder_profiles" on public.minder_profiles;

create policy "Authenticated users can search minder_profiles"
  on public.minder_profiles
  for select
  to authenticated
  using (deleted_at is null);

-- 4. Display-name join — allow reading full_name from users for minder cards ------
-- Required for the `users!inner (full_name)` join used in listPublicMindersForSearch.
-- Policy is additive (OR'd with any existing users SELECT policies).
drop policy if exists "Authenticated users can read minder display names" on public.users;

create policy "Authenticated users can read minder display names"
  on public.users
  for select
  to authenticated
  using (
    exists (
      select 1 from public.minder_profiles mp
      where mp.user_id = users.id
        and mp.deleted_at is null
    )
  );
