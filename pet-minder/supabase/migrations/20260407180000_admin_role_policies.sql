-- Admin role support: helper + RLS/RPC bypass.
-- Admin is represented as a row in public.roles with role_type = 'admin' and deleted_at is null.

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.roles r
    where r.user_id = auth.uid()
      and r.role_type = 'admin'
      and r.deleted_at is null
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS policy additions: admins can read/write where policies apply.
-- ---------------------------------------------------------------------------

-- pet_profiles
drop policy if exists "Pet owners can select own pet_profiles" on public.pet_profiles;
drop policy if exists "Pet owners can insert own pet_profiles" on public.pet_profiles;
drop policy if exists "Pet owners can update own pet_profiles" on public.pet_profiles;

create policy "Pet owners can select own pet_profiles"
  on public.pet_profiles
  for select
  to authenticated
  using (
    public.is_admin()
    or (auth.uid() = owner_id and deleted_at is null)
  );

create policy "Pet owners can insert own pet_profiles"
  on public.pet_profiles
  for insert
  to authenticated
  with check (
    public.is_admin()
    or (
      auth.uid() = owner_id
      and exists (
        select 1
        from public.roles r
        where r.user_id = auth.uid()
          and r.role_type = 'owner'
          and r.deleted_at is null
      )
    )
  );

create policy "Pet owners can update own pet_profiles"
  on public.pet_profiles
  for update
  to authenticated
  using (
    public.is_admin()
    or (auth.uid() = owner_id and deleted_at is null)
  )
  with check (public.is_admin() or auth.uid() = owner_id);

-- minder_profiles
drop policy if exists "Minders can read own minder_profile"   on public.minder_profiles;
drop policy if exists "Minders can insert own minder_profile" on public.minder_profiles;
drop policy if exists "Minders can update own minder_profile" on public.minder_profiles;
drop policy if exists "Authenticated users can search minder_profiles" on public.minder_profiles;

create policy "Minders can read own minder_profile"
  on public.minder_profiles
  for select
  to authenticated
  using (public.is_admin() or auth.uid() = user_id);

create policy "Minders can insert own minder_profile"
  on public.minder_profiles
  for insert
  to authenticated
  with check (
    public.is_admin()
    or (
      auth.uid() = user_id
      and exists (
        select 1 from public.roles r
        where r.user_id = auth.uid()
          and r.role_type = 'minder'
          and r.deleted_at is null
      )
    )
  );

create policy "Minders can update own minder_profile"
  on public.minder_profiles
  for update
  to authenticated
  using  (public.is_admin() or (auth.uid() = user_id and deleted_at is null))
  with check (public.is_admin() or auth.uid() = user_id);

create policy "Authenticated users can search minder_profiles"
  on public.minder_profiles
  for select
  to authenticated
  using (public.is_admin() or deleted_at is null);

-- users: join helpers
drop policy if exists "Authenticated users can read minder display names" on public.users;
drop policy if exists "users_read_owner_names_for_minder_bookings" on public.users;

create policy "Authenticated users can read minder display names"
  on public.users
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.minder_profiles mp
      where mp.user_id = users.id
        and mp.deleted_at is null
    )
  );

create policy "users_read_owner_names_for_minder_bookings"
  on public.users
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.minder_profiles mp
      where mp.user_id = auth.uid()
        and mp.deleted_at is null
        and (
          exists (
            select 1
            from public.booking_requests br
            where br.minder_id = mp.id
              and br.owner_id = users.id
          )
          or exists (
            select 1
            from public.bookings b
            where b.minder_id = mp.id
              and b.owner_id = users.id
          )
        )
    )
  );

-- bookings / booking_requests / junction tables
drop policy if exists "booking_requests_select_parties" on public.booking_requests;
drop policy if exists "bookings_select_parties" on public.bookings;
drop policy if exists "booking_pets_select_parties" on public.booking_pets;
drop policy if exists "booking_request_pets_select_parties" on public.booking_request_pets;
drop policy if exists "pet_profiles_select_for_assigned_minder" on public.pet_profiles;

create policy "booking_requests_select_parties"
  on public.booking_requests
  for select
  to authenticated
  using (
    public.is_admin()
    or owner_id = auth.uid()
    or exists (
      select 1
      from public.minder_profiles mp
      where mp.id = booking_requests.minder_id
        and mp.user_id = auth.uid()
    )
  );

create policy "bookings_select_parties"
  on public.bookings
  for select
  to authenticated
  using (
    public.is_admin()
    or owner_id = auth.uid()
    or exists (
      select 1
      from public.minder_profiles mp
      where mp.id = bookings.minder_id
        and mp.user_id = auth.uid()
    )
  );

create policy "booking_pets_select_parties"
  on public.booking_pets
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
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

create policy "booking_request_pets_select_parties"
  on public.booking_request_pets
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
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

create policy "pet_profiles_select_for_assigned_minder"
  on public.pet_profiles
  for select
  to authenticated
  using (
    public.is_admin()
    or (
      deleted_at is null
      and exists (
        select 1
        from public.booking_pets bp
        join public.bookings b on b.id = bp.booking_id
        join public.minder_profiles mp on mp.id = b.minder_id
        where bp.pet_id = pet_profiles.id
          and mp.user_id = auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- SECURITY DEFINER RPC bypass for admins.
-- ---------------------------------------------------------------------------

create or replace function public.bookings_create_request(
  p_minder_profile_id uuid,
  p_requested_datetime timestamptz,
  p_duration_minutes integer,
  p_message text,
  p_care_instructions text,
  p_pet_ids uuid[],
  p_requested_end_datetime timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_request_id uuid;
  v_duration_mins integer;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_pet_ids is null or coalesce(cardinality(p_pet_ids), 0) = 0 then
    raise exception 'Select at least one pet';
  end if;

  if not public.is_admin() and not exists (
    select 1
    from public.roles r
    where r.user_id = v_uid
      and r.role_type = 'owner'
      and r.deleted_at is null
  ) then
    raise exception 'Owner role required';
  end if;

  if not exists (
    select 1
    from public.minder_profiles mp
    where mp.id = p_minder_profile_id
      and mp.deleted_at is null
  ) then
    raise exception 'Minder not found';
  end if;

  if exists (
    select 1
    from (select distinct unnest(p_pet_ids) as pet_id) x
    where not exists (
      select 1
      from public.pet_profiles pp
      where pp.id = x.pet_id
        and (public.is_admin() or (pp.owner_id = v_uid and pp.deleted_at is null))
    )
  ) then
    raise exception 'Invalid pet selection';
  end if;

  if p_requested_end_datetime is not null then
    if p_requested_end_datetime <= p_requested_datetime then
      raise exception 'End date and time must be after the start';
    end if;
    if p_requested_end_datetime - p_requested_datetime < interval '1 hour' then
      raise exception 'Booking must be at least one hour';
    end if;
    v_duration_mins :=
      floor(
        extract(epoch from (p_requested_end_datetime - p_requested_datetime)) / 60
      )::integer;
    if v_duration_mins > 525600 then
      raise exception 'Booking cannot exceed one year';
    end if;
  else
    if p_duration_minutes is null or p_duration_minutes <= 0 then
      raise exception 'Invalid duration';
    end if;
    v_duration_mins := p_duration_minutes;
  end if;

  insert into public.booking_requests (
    owner_id,
    minder_id,
    requested_datetime,
    duration_minutes,
    message,
    care_instructions,
    status,
    requested_end_datetime
  ) values (
    v_uid,
    p_minder_profile_id,
    p_requested_datetime,
    v_duration_mins,
    p_message,
    p_care_instructions,
    'pending',
    p_requested_end_datetime
  )
  returning id into v_request_id;

  insert into public.booking_request_pets (request_id, pet_id)
  select v_request_id, x.pet_id
  from (select distinct unnest(p_pet_ids) as pet_id) x;

  return v_request_id;
end;
$$;

create or replace function public.bookings_accept_request(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_br public.booking_requests%rowtype;
  v_booking_id uuid;
  v_start timestamptz;
  v_end timestamptz;
  v_deadline timestamptz;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_br
  from public.booking_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Request not found';
  end if;

  if not public.is_admin() and not exists (
    select 1
    from public.minder_profiles mp
    where mp.id = v_br.minder_id
      and mp.user_id = v_uid
  ) then
    raise exception 'Not authorised';
  end if;

  if v_br.status <> 'pending' then
    raise exception 'Request is not pending';
  end if;

  update public.booking_requests
  set status = 'accepted', updated_at = now()
  where id = p_request_id;

  v_start := v_br.requested_datetime;
  if v_br.requested_end_datetime is not null then
    v_end := v_br.requested_end_datetime;
  else
    v_end := v_start + (v_br.duration_minutes * interval '1 minute');
  end if;
  v_deadline := v_start - interval '48 hours';

  insert into public.bookings (
    request_id,
    owner_id,
    minder_id,
    start_datetime,
    end_datetime,
    care_instructions,
    status,
    cancellation_deadline
  ) values (
    p_request_id,
    v_br.owner_id,
    v_br.minder_id,
    v_start,
    v_end,
    v_br.care_instructions,
    'confirmed',
    v_deadline
  )
  returning id into v_booking_id;

  insert into public.booking_pets (booking_id, pet_id)
  select v_booking_id, brp.pet_id
  from public.booking_request_pets brp
  where brp.request_id = p_request_id;

  return v_booking_id;
end;
$$;

create or replace function public.bookings_decline_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_updated int;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  update public.booking_requests br
  set status = 'declined', updated_at = now()
  where br.id = p_request_id
    and br.status = 'pending'
    and (
      public.is_admin()
      or exists (
        select 1
        from public.minder_profiles mp
        where mp.id = br.minder_id
          and mp.user_id = v_uid
      )
    );

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'Could not decline request';
  end if;
end;
$$;

create or replace function public.bookings_cancel_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_updated int;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  update public.booking_requests br
  set status = 'cancelled', updated_at = now()
  where br.id = p_request_id
    and br.status = 'pending'
    and (public.is_admin() or br.owner_id = v_uid);

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'Could not cancel request';
  end if;
end;
$$;

create or replace function public.bookings_cancel_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_updated int;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  update public.bookings b
  set
    status = 'cancelled',
    cancelled_at = now(),
    updated_at = now()
  where b.id = p_booking_id
    and b.cancellation_deadline > now()
    and b.status in ('pending', 'confirmed')
    and (
      public.is_admin()
      or b.owner_id = v_uid
      or exists (
        select 1
        from public.minder_profiles mp
        where mp.id = b.minder_id
          and mp.user_id = v_uid
      )
    );

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'Could not cancel booking';
  end if;
end;
$$;

revoke all on function public.bookings_create_request(uuid, timestamptz, integer, text, text, uuid[], timestamptz) from public;
revoke all on function public.bookings_accept_request(uuid) from public;
revoke all on function public.bookings_decline_request(uuid) from public;
revoke all on function public.bookings_cancel_request(uuid) from public;
revoke all on function public.bookings_cancel_booking(uuid) from public;

grant execute on function public.bookings_create_request(uuid, timestamptz, integer, text, text, uuid[], timestamptz) to authenticated;
grant execute on function public.bookings_accept_request(uuid) to authenticated;
grant execute on function public.bookings_decline_request(uuid) to authenticated;
grant execute on function public.bookings_cancel_request(uuid) to authenticated;
grant execute on function public.bookings_cancel_booking(uuid) to authenticated;

