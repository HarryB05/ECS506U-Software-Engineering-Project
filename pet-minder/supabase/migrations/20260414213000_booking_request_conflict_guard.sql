-- Enforce overlap conflicts at request-creation time and expose
-- unavailable windows (confirmed bookings + caller's own pending requests)
-- for the owner booking form.

create or replace function public.get_minder_booked_windows(
  p_minder_profile_id uuid
)
returns table (
  start_datetime timestamptz,
  end_datetime   timestamptz
)
language sql
security definer
set search_path = public
as $$
  with confirmed_bookings as (
    select b.start_datetime, b.end_datetime
    from public.bookings b
    where b.minder_id = p_minder_profile_id
      and b.status not in ('cancelled')
  ),
  own_pending_requests as (
    select
      br.requested_datetime as start_datetime,
      coalesce(
        br.requested_end_datetime,
        br.requested_datetime + (br.duration_minutes * interval '1 minute')
      ) as end_datetime
    from public.booking_requests br
    where br.owner_id = auth.uid()
      and br.minder_id = p_minder_profile_id
      and br.status = 'pending'
      and br.auto_rejected_at is null
  )
  select start_datetime, end_datetime
  from confirmed_bookings
  union
  select start_datetime, end_datetime
  from own_pending_requests
  order by start_datetime;
$$;

revoke all on function public.get_minder_booked_windows(uuid) from public;
grant execute on function public.get_minder_booked_windows(uuid) to authenticated;

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
  v_duration_mins integer;
  v_notice interval;
  v_service_type text := coalesce(nullif(trim(p_service_type), ''), 'Pet Sitting');
  v_service_key text;
  v_short_notice_warning boolean := false;
  v_rule record;
  v_min_hours integer;
  v_requested_end timestamptz;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_pet_ids is null or coalesce(cardinality(p_pet_ids), 0) = 0 then
    raise exception 'Select at least one pet';
  end if;

  if p_requested_datetime is null or p_requested_datetime <= now() then
    raise exception 'Start time must be in the future';
  end if;

  if p_requested_end_datetime is not null then
    if p_requested_end_datetime <= p_requested_datetime then
      raise exception 'End date and time must be after the start';
    end if;
    v_duration_mins := floor(
      extract(epoch from (p_requested_end_datetime - p_requested_datetime)) / 60
    )::integer;
    if v_duration_mins <= 0 then
      raise exception 'Invalid duration';
    end if;
  else
    if p_duration_minutes is null or p_duration_minutes <= 0 then
      raise exception 'Invalid duration';
    end if;
    v_duration_mins := p_duration_minutes;
  end if;

  v_requested_end := coalesce(
    p_requested_end_datetime,
    p_requested_datetime + (v_duration_mins * interval '1 minute')
  );

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

  if exists (
    select 1
    from public.bookings b
    where b.minder_id = p_minder_profile_id
      and b.status not in ('cancelled')
      and b.start_datetime < v_requested_end
      and b.end_datetime > p_requested_datetime
  ) then
    raise exception 'This time slot conflicts with an existing booking. Please choose a different time.';
  end if;

  if exists (
    select 1
    from public.booking_requests br
    where br.owner_id = v_uid
      and br.minder_id = p_minder_profile_id
      and br.status = 'pending'
      and br.auto_rejected_at is null
      and br.requested_datetime < v_requested_end
      and coalesce(
        br.requested_end_datetime,
        br.requested_datetime + (br.duration_minutes * interval '1 minute')
      ) > p_requested_datetime
  ) then
    raise exception 'You already have a pending request that overlaps this time with this minder.';
  end if;

  v_service_key := public.normalize_booking_service_type(v_service_type);

  if v_service_key in ('walking', 'dogwalking') then
    if (
      select count(*)
      from (select distinct unnest(p_pet_ids) as pet_id) x
    ) > 4 then
      raise exception 'Walking requests allow at most 4 pets';
    end if;

    if exists (
      select 1
      from (select distinct unnest(p_pet_ids) as pet_id) x
      join public.pet_profiles pp
        on pp.id = x.pet_id
       and pp.owner_id = v_uid
       and pp.deleted_at is null
      where lower(trim(coalesce(pp.pet_type, ''))) not in ('dog', 'cat')
    ) then
      raise exception 'Walking requests only support dogs and cats';
    end if;
  end if;

  v_notice := p_requested_datetime - now();

  select * into v_rule
  from public.booking_lead_time_rules bltr
  where bltr.normalized_service_type = v_service_key;

  if found then
    if v_rule.hard_block and v_notice < v_rule.minimum_notice then
      v_min_hours := greatest(
        1,
        ceil(extract(epoch from v_rule.minimum_notice) / 3600.0)::int
      );
      raise exception '% requires at least % hours notice',
        v_rule.service_type_label,
        v_min_hours;
    end if;

    v_short_notice_warning :=
      v_rule.warning_notice is not null
      and v_notice < v_rule.warning_notice
      and v_notice >= v_rule.minimum_notice;
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
    short_notice_warning,
    status
  ) values (
    v_uid,
    p_minder_profile_id,
    p_requested_datetime,
    p_requested_end_datetime,
    v_duration_mins,
    p_message,
    p_care_instructions,
    v_service_type,
    v_short_notice_warning,
    'pending'
  )
  returning id into v_request_id;

  insert into public.booking_request_pets (request_id, pet_id)
  select v_request_id, x.pet_id
  from (select distinct unnest(p_pet_ids) as pet_id) x;

  return v_request_id;
end;
$$;

revoke all on function public.bookings_create_request(uuid, timestamptz, integer, text, text, uuid[], timestamptz, text) from public;
grant execute on function public.bookings_create_request(uuid, timestamptz, integer, text, text, uuid[], timestamptz, text) to authenticated;
