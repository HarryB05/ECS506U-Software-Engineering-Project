-- Add service_type column to booking_requests so owners can specify what
-- kind of care they need (e.g. dog walking, pet sitting, drop-in visit).

alter table public.booking_requests
  add column if not exists service_type text;

-- Backfill historical rows with a sensible default.
update public.booking_requests
  set service_type = 'Pet Sitting'
  where service_type is null;

-- Update bookings_create_request to accept the new parameter.
create or replace function public.bookings_create_request(
  p_minder_profile_id uuid,
  p_requested_datetime timestamptz,
  p_duration_minutes integer,
  p_message text,
  p_care_instructions text,
  p_pet_ids uuid[],
  p_requested_end_datetime timestamptz default null,
  p_service_type text default null
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
    requested_end_datetime,
    duration_minutes,
    message,
    care_instructions,
    service_type,
    status
  ) values (
    v_uid,
    p_minder_profile_id,
    p_requested_datetime,
    p_requested_end_datetime,
    p_duration_minutes,
    p_message,
    p_care_instructions,
    coalesce(nullif(trim(p_service_type), ''), 'Pet Sitting'),
    'pending'
  )
  returning id into v_request_id;

  insert into public.booking_request_pets (request_id, pet_id)
  select v_request_id, x.pet_id
  from (select distinct unnest(p_pet_ids) as pet_id) x;

  return v_request_id;
end;
$$;

-- Revoke/re-grant with the new signature (overloaded functions need explicit grants).
revoke all on function public.bookings_create_request(uuid, timestamptz, integer, text, text, uuid[], timestamptz, text) from public;
grant execute on function public.bookings_create_request(uuid, timestamptz, integer, text, text, uuid[], timestamptz, text) to authenticated;
