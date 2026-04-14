-- Add conflict check to bookings_accept_request so a minder cannot accept
-- a new request whose time window overlaps with an existing confirmed booking.
-- Also exposes a helper RPC for the owner booking form to fetch existing
-- confirmed/pending bookings for a minder (public, no PII).

-- ============================================================
-- Helper: list non-cancelled booking windows for a minder
-- ============================================================
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
  select b.start_datetime, b.end_datetime
  from public.bookings b
  where b.minder_id = p_minder_profile_id
    and b.status not in ('cancelled')
  order by b.start_datetime;
$$;

revoke all on function public.get_minder_booked_windows(uuid) from public;
grant execute on function public.get_minder_booked_windows(uuid) to authenticated;

-- ============================================================
-- Updated bookings_accept_request with conflict guard
-- ============================================================
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

  -- Compute the time window for this request.
  v_start := v_br.requested_datetime;
  if v_br.requested_end_datetime is not null then
    v_end := v_br.requested_end_datetime;
  else
    v_end := v_start + (v_br.duration_minutes * interval '1 minute');
  end if;

  -- Reject if the minder already has a confirmed / pending booking that
  -- overlaps with [v_start, v_end).  Two intervals overlap when
  -- A.start < B.end AND B.start < A.end.
  if exists (
    select 1
    from public.bookings b
    where b.minder_id = v_br.minder_id
      and b.status not in ('cancelled')
      and b.start_datetime < v_end
      and b.end_datetime   > v_start
  ) then
    raise exception 'This time slot conflicts with an existing booking. Please ask the owner to choose a different time.';
  end if;

  v_deadline := v_start - interval '48 hours';

  update public.booking_requests
  set status = 'accepted', updated_at = now()
  where id = p_request_id;

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
