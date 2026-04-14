-- Remove the 'accepted' status from booking_requests entirely.
-- 'accepted' and 'confirmed' represented the same thing: the minder agreed and
-- a booking was created. From now on booking_requests uses 'confirmed' (matching
-- the resulting bookings row), which makes the two tables consistent.

-- 1. Migrate any existing rows.
update public.booking_requests
set status = 'confirmed'
where status = 'accepted';

-- 2. If booking_requests.status is a typed enum, add 'confirmed' where missing.
--    (Safe no-op when the column is TEXT or the value already exists.)
do $$
begin
  -- Detect the type of booking_requests.status
  if exists (
    select 1
    from information_schema.columns c
    join pg_type t on t.typname = c.udt_name
    join pg_namespace n on n.oid = t.typnamespace
    where c.table_schema = 'public'
      and c.table_name   = 'booking_requests'
      and c.column_name  = 'status'
      and t.typtype      = 'e'   -- enum
  ) then
    -- Add 'confirmed' if not already present.
    if not exists (
      select 1
      from pg_enum e
      join pg_type t  on t.oid = e.enumtypid
      join pg_namespace n on n.oid = t.typnamespace
      join information_schema.columns c
        on c.udt_name = t.typname and c.table_schema = n.nspname
      where c.table_schema = 'public'
        and c.table_name   = 'booking_requests'
        and c.column_name  = 'status'
        and e.enumlabel    = 'confirmed'
    ) then
      execute format(
        'alter type %I.%I add value ''confirmed''',
        (select n.nspname
         from information_schema.columns c
         join pg_type t  on t.typname = c.udt_name
         join pg_namespace n on n.oid = t.typnamespace
         where c.table_schema = 'public'
           and c.table_name   = 'booking_requests'
           and c.column_name  = 'status'
         limit 1),
        (select c.udt_name
         from information_schema.columns c
         where c.table_schema = 'public'
           and c.table_name   = 'booking_requests'
           and c.column_name  = 'status'
         limit 1)
      );
    end if;
  end if;
end $$;

-- 3. Redeploy bookings_accept_request: mark the request 'confirmed' instead of
--    'accepted' once the minder accepts.
create or replace function public.bookings_accept_request(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid        uuid := auth.uid();
  v_br         public.booking_requests%rowtype;
  v_booking_id uuid;
  v_start      timestamptz;
  v_end        timestamptz;
  v_deadline   timestamptz;
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

  -- Use 'confirmed' — 'accepted' is no longer a valid status.
  update public.booking_requests
  set status = 'confirmed', updated_at = now()
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

revoke all on function public.bookings_accept_request(uuid) from public;
grant execute on function public.bookings_accept_request(uuid) to authenticated;
