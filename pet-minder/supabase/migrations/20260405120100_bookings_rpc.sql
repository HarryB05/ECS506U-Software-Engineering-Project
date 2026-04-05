-- Booking feature: SECURITY DEFINER RPCs (writes; RLS is select-only on booking tables).

create or replace function public.bookings_create_request(
  p_minder_profile_id uuid,
  p_requested_datetime timestamptz,
  p_duration_minutes integer,
  p_message text,
  p_care_instructions text,
  p_pet_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_request_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_duration_minutes is null or p_duration_minutes <= 0 then
    raise exception 'Invalid duration';
  end if;

  if p_pet_ids is null or coalesce(cardinality(p_pet_ids), 0) = 0 then
    raise exception 'Select at least one pet';
  end if;

  if not exists (
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
        and pp.owner_id = v_uid
        and pp.deleted_at is null
    )
  ) then
    raise exception 'Invalid pet selection';
  end if;

  insert into public.booking_requests (
    owner_id,
    minder_id,
    requested_datetime,
    duration_minutes,
    message,
    care_instructions,
    status
  ) values (
    v_uid,
    p_minder_profile_id,
    p_requested_datetime,
    p_duration_minutes,
    p_message,
    p_care_instructions,
    'pending'
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

  if not exists (
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
  v_end := v_start + (v_br.duration_minutes * interval '1 minute');
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
    and exists (
      select 1
      from public.minder_profiles mp
      where mp.id = br.minder_id
        and mp.user_id = v_uid
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
    and br.owner_id = v_uid
    and br.status = 'pending';

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
      b.owner_id = v_uid
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

revoke all on function public.bookings_create_request(uuid, timestamptz, integer, text, text, uuid[]) from public;
revoke all on function public.bookings_accept_request(uuid) from public;
revoke all on function public.bookings_decline_request(uuid) from public;
revoke all on function public.bookings_cancel_request(uuid) from public;
revoke all on function public.bookings_cancel_booking(uuid) from public;

grant execute on function public.bookings_create_request(uuid, timestamptz, integer, text, text, uuid[]) to authenticated;
grant execute on function public.bookings_accept_request(uuid) to authenticated;
grant execute on function public.bookings_decline_request(uuid) to authenticated;
grant execute on function public.bookings_cancel_request(uuid) to authenticated;
grant execute on function public.bookings_cancel_booking(uuid) to authenticated;
