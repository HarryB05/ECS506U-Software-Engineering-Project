-- Enforce Walking-specific pet constraints in bookings_create_request.
-- Rules:
-- 1) Walking requests can only include dogs/cats.
-- 2) Walking requests can include at most 4 pets.
-- 3) Lead-time rule label updated to "Walking" and key "walking" kept in sync.

insert into public.booking_lead_time_rules (
  normalized_service_type,
  service_type_label,
  minimum_notice,
  warning_notice,
  hard_block
)
values
  ('walking', 'Walking', interval '3 hours', null, true),
  ('dogwalking', 'Walking', interval '3 hours', null, true)
on conflict (normalized_service_type)
do update set
  service_type_label = excluded.service_type_label,
  minimum_notice = excluded.minimum_notice,
  warning_notice = excluded.warning_notice,
  hard_block = excluded.hard_block,
  updated_at = now();

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
