-- Lead-time enforcement and stale-request auto-rejection.

create or replace function public.normalize_booking_service_type(p_service_type text)
returns text
language sql
immutable
as $$
  select regexp_replace(lower(coalesce(p_service_type, '')), '[^a-z0-9]', '', 'g');
$$;

create table if not exists public.booking_lead_time_rules (
  normalized_service_type text primary key,
  service_type_label text not null,
  minimum_notice interval not null,
  warning_notice interval,
  hard_block boolean not null default true,
  updated_at timestamptz not null default now(),
  check (minimum_notice >= interval '0')
);

insert into public.booking_lead_time_rules (
  normalized_service_type,
  service_type_label,
  minimum_notice,
  warning_notice,
  hard_block
)
values
  ('dogwalking', 'Dog walk', interval '3 hours', null, true),
  -- Pet sitting is soft-warning inside 48 hours by default.
  ('petsitting', 'Pet sitting', interval '0 hours', interval '48 hours', false),
  ('dropinvisit', 'Drop-in visit', interval '2 hours', null, true),
  ('daycare', 'Daycare', interval '24 hours', null, true)
on conflict (normalized_service_type)
do update set
  service_type_label = excluded.service_type_label,
  minimum_notice = excluded.minimum_notice,
  warning_notice = excluded.warning_notice,
  hard_block = excluded.hard_block,
  updated_at = now();

alter table public.booking_requests
  add column if not exists short_notice_warning boolean not null default false,
  add column if not exists auto_rejected_at timestamptz;

create index if not exists booking_requests_pending_created_at_idx
  on public.booking_requests (created_at)
  where status = 'pending';

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

  v_notice := p_requested_datetime - now();
  v_service_key := public.normalize_booking_service_type(v_service_type);

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

create or replace function public.bookings_auto_reject_stale_requests(
  p_batch_size integer default 500
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_count integer := 0;
  v_limit integer := greatest(coalesce(p_batch_size, 500), 1);
begin
  for v_row in
    with candidates as (
      select br.id
      from public.booking_requests br
      where br.status = 'pending'
        and br.auto_rejected_at is null
        and br.created_at <= now() - interval '24 hours'
      order by br.created_at asc
      limit v_limit
      for update skip locked
    ), updated as (
      update public.booking_requests br
      set
        status = 'declined',
        auto_rejected_at = now(),
        updated_at = now()
      where br.id in (select id from candidates)
      returning br.id, br.owner_id, br.minder_id, br.updated_at
    )
    select *
    from updated
  loop
    v_count := v_count + 1;

    perform pg_notify(
      'booking_request_auto_rejected_owner',
      json_build_object(
        'request_id', v_row.id,
        'owner_id', v_row.owner_id,
        'updated_at', v_row.updated_at,
        'reason', 'response_window_elapsed'
      )::text
    );

    perform pg_notify(
      'booking_request_auto_rejected_minder',
      json_build_object(
        'request_id', v_row.id,
        'minder_id', v_row.minder_id,
        'updated_at', v_row.updated_at,
        'reason', 'response_window_elapsed'
      )::text
    );
  end loop;

  return v_count;
end;
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if not exists (
      select 1
      from cron.job
      where jobname = 'bookings-auto-reject-stale-requests'
    ) then
      perform cron.schedule(
        'bookings-auto-reject-stale-requests',
        '*/10 * * * *',
        'select public.bookings_auto_reject_stale_requests();'
      );
    end if;
  end if;
exception
  when others then
    raise notice 'Skipping cron schedule for bookings_auto_reject_stale_requests: %', sqlerrm;
end;
$$;

revoke all on function public.bookings_create_request(uuid, timestamptz, integer, text, text, uuid[], timestamptz, text) from public;
grant execute on function public.bookings_create_request(uuid, timestamptz, integer, text, text, uuid[], timestamptz, text) to authenticated;

revoke all on function public.bookings_auto_reject_stale_requests(integer) from public;
grant execute on function public.bookings_auto_reject_stale_requests(integer) to service_role;