-- Prevent re-disputing a booking that has already been through a dispute.
-- Previously an admin could resolve a dispute (resetting status to confirmed
-- or completed) and either party could immediately raise another dispute.
-- The intent is that a booking may only be disputed once between both parties.
--
-- Fix: check disputed_at IS NOT NULL before allowing the raise. disputed_at is
-- set when a dispute is raised and never cleared by resolution, so it acts as a
-- permanent "this booking was already disputed" marker.

create or replace function public.bookings_raise_dispute(
  p_booking_id uuid,
  p_reason     text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid             uuid := auth.uid();
  v_booking         public.bookings%rowtype;
  v_minder_user_id  uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_reason is null or trim(p_reason) = '' then
    raise exception 'A reason is required to raise a dispute';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'Booking not found';
  end if;

  -- Resolve the minder's auth user id from their profile row.
  select mp.user_id into v_minder_user_id
  from public.minder_profiles mp
  where mp.id = v_booking.minder_id;

  -- Caller must be the owner or the minder on this booking.
  if v_booking.owner_id <> v_uid
     and (v_minder_user_id is null or v_minder_user_id <> v_uid)
  then
    raise exception 'Not authorised to dispute this booking';
  end if;

  -- A booking may only be disputed once, even after admin resolution.
  if v_booking.disputed_at is not null then
    raise exception 'This booking has already been disputed and cannot be disputed again';
  end if;

  -- Only confirmed or completed bookings can be disputed.
  if v_booking.status not in ('confirmed', 'completed') then
    raise exception 'Only confirmed or completed bookings can be disputed (current status: %)', v_booking.status;
  end if;

  if v_booking.cancelled_at is not null then
    raise exception 'Cancelled bookings cannot be disputed';
  end if;

  update public.bookings
  set
    status         = 'disputed',
    dispute_reason = trim(p_reason),
    disputed_at    = now(),
    disputed_by    = v_uid
  where id = p_booking_id;
end;
$$;

revoke all on function public.bookings_raise_dispute(uuid, text) from public;
grant execute on function public.bookings_raise_dispute(uuid, text) to authenticated;
