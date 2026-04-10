create or replace function public.bookings_reschedule_request(
  p_request_id uuid,
  p_requested_datetime timestamptz,
  p_duration_minutes integer,
  p_care_instructions text,
  p_pet_ids uuid[],
  p_requested_end_datetime timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_br public.booking_requests%rowtype;
  v_duration_mins integer;
  v_end_datetime timestamptz;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_pet_ids is null or coalesce(cardinality(p_pet_ids), 0) = 0 then
    raise exception 'Select at least one pet';
  end if;

  select * into v_br
  from public.booking_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Request not found';
  end if;

  if v_br.owner_id <> v_uid then
    raise exception 'Not authorised';
  end if;

  if v_br.status <> 'pending' then
    raise exception 'Request is not pending';
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

  if p_requested_end_datetime is not null then
    if p_requested_end_datetime <= p_requested_datetime then
      raise exception 'End date and time must be after the start';
    end if;
    if p_requested_end_datetime - p_requested_datetime < interval '1 hour' then
      raise exception 'Booking must be at least one hour';
    end if;
    v_duration_mins := floor(
      extract(epoch from (p_requested_end_datetime - p_requested_datetime)) / 60
    )::integer;
    v_end_datetime := p_requested_end_datetime;
  else
    if p_duration_minutes is null or p_duration_minutes <= 0 then
      raise exception 'Invalid duration';
    end if;
    v_duration_mins := p_duration_minutes;
    v_end_datetime := p_requested_datetime + (v_duration_mins * interval '1 minute');
  end if;

  update public.booking_requests
  set
    requested_datetime = p_requested_datetime,
    requested_end_datetime = p_requested_end_datetime,
    duration_minutes = v_duration_mins,
    care_instructions = p_care_instructions,
    updated_at = now()
  where id = p_request_id;

  delete from public.booking_request_pets
  where request_id = p_request_id;

  insert into public.booking_request_pets (request_id, pet_id)
  select p_request_id, x.pet_id
  from (select distinct unnest(p_pet_ids) as pet_id) x;
end;
$$;

revoke all on function public.bookings_reschedule_request(uuid, timestamptz, integer, text, uuid[], timestamptz) from public;
grant execute on function public.bookings_reschedule_request(uuid, timestamptz, integer, text, uuid[], timestamptz) to authenticated;