-- pet_profiles: owner pet CRUD (design.md). Run in Supabase SQL editor if migrations are not applied automatically.

create table if not exists public.pet_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  pet_type text not null,
  sex text check (sex is null or sex in ('male', 'female')),
  age integer,
  medical_info text,
  dietary_requirements text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists pet_profiles_owner_active_idx
  on public.pet_profiles (owner_id)
  where deleted_at is null;

alter table public.pet_profiles enable row level security;

drop policy if exists "Pet owners can select own pet_profiles" on public.pet_profiles;
drop policy if exists "Pet owners can insert own pet_profiles" on public.pet_profiles;
drop policy if exists "Pet owners can update own pet_profiles" on public.pet_profiles;

create policy "Pet owners can select own pet_profiles"
  on public.pet_profiles
  for select
  to authenticated
  using (
    auth.uid() = owner_id
    and deleted_at is null
  );

create policy "Pet owners can insert own pet_profiles"
  on public.pet_profiles
  for insert
  to authenticated
  with check (
    auth.uid() = owner_id
    and exists (
      select 1
      from public.roles r
      where r.user_id = auth.uid()
        and r.role_type = 'owner'
        and r.deleted_at is null
    )
  );

create policy "Pet owners can update own pet_profiles"
  on public.pet_profiles
  for update
  to authenticated
  using (
    auth.uid() = owner_id
    and deleted_at is null
  )
  with check (auth.uid() = owner_id);
