-- Booking feature: request pets junction, care_instructions, hardened RLS.
-- Assumes booking_requests, bookings, booking_pets, enums already exist (remote schema).

-- 1. Optional column on requests ------------------------------------------------
alter table public.booking_requests
  add column if not exists care_instructions text;

-- 2. Pets attached to a request (before acceptance) -----------------------------
create table if not exists public.booking_request_pets (
  request_id uuid not null references public.booking_requests (id) on delete cascade,
  pet_id uuid not null references public.pet_profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (request_id, pet_id)
);

create index if not exists booking_request_pets_pet_id_idx
  on public.booking_request_pets (pet_id);

alter table public.booking_request_pets enable row level security;

-- 3. One confirmed booking per request ------------------------------------------
create unique index if not exists bookings_request_id_unique
  on public.bookings (request_id);

-- 4. Replace loose FOR ALL policies --------------------------------------------
drop policy if exists "booking_requests: parties only" on public.booking_requests;
drop policy if exists "bookings: parties only" on public.bookings;

-- booking_requests: read-only for clients; mutations via SECURITY DEFINER RPCs
create policy "booking_requests_select_parties"
  on public.booking_requests
  for select
  to authenticated
  using (
    owner_id = auth.uid()
    or exists (
      select 1
      from public.minder_profiles mp
      where mp.id = booking_requests.minder_id
        and mp.user_id = auth.uid()
    )
  );

-- bookings: read-only for clients
create policy "bookings_select_parties"
  on public.bookings
  for select
  to authenticated
  using (
    owner_id = auth.uid()
    or exists (
      select 1
      from public.minder_profiles mp
      where mp.id = bookings.minder_id
        and mp.user_id = auth.uid()
    )
  );

-- 5. booking_pets: SELECT for booking parties (writes via RPC) ------------------
drop policy if exists "booking_pets_select_parties" on public.booking_pets;

create policy "booking_pets_select_parties"
  on public.booking_pets
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.bookings b
      where b.id = booking_pets.booking_id
        and (
          b.owner_id = auth.uid()
          or exists (
            select 1
            from public.minder_profiles mp
            where mp.id = b.minder_id
              and mp.user_id = auth.uid()
          )
        )
    )
  );

-- 6. booking_request_pets: SELECT for request parties ----------------------------
drop policy if exists "booking_request_pets_select_parties" on public.booking_request_pets;

create policy "booking_request_pets_select_parties"
  on public.booking_request_pets
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.booking_requests br
      where br.id = booking_request_pets.request_id
        and (
          br.owner_id = auth.uid()
          or exists (
            select 1
            from public.minder_profiles mp
            where mp.id = br.minder_id
              and mp.user_id = auth.uid()
          )
        )
    )
  );

-- 7. Minders may read pet rows linked to a confirmed booking --------------------
drop policy if exists "pet_profiles_select_for_assigned_minder" on public.pet_profiles;

create policy "pet_profiles_select_for_assigned_minder"
  on public.pet_profiles
  for select
  to authenticated
  using (
    deleted_at is null
    and exists (
      select 1
      from public.booking_pets bp
      join public.bookings b on b.id = bp.booking_id
      join public.minder_profiles mp on mp.id = b.minder_id
      where bp.pet_id = pet_profiles.id
        and mp.user_id = auth.uid()
    )
  );
