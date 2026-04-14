-- Booking dispute feature (user-facing raise).
-- Adds dispute metadata columns to bookings and exposes
-- bookings_raise_dispute() so either party on a confirmed/completed
-- booking can flag it for admin review.

-- ============================================================
-- 1. Schema: add dispute columns to bookings
-- ============================================================
alter table public.bookings
  add column if not exists dispute_reason    text,
  add column if not exists disputed_at       timestamptz,
  add column if not exists disputed_by       uuid references auth.users(id);

-- ============================================================
-- 2. RPC: bookings_raise_dispute
-- ============================================================
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
  v_uid    uuid := auth.uid();
  v_booking public.bookings%rowtype;
  v_minder_user_id uuid;
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

  -- Caller must be the owner or the minder on this booking.
  select mp.user_id into v_minder_user_id
  from public.minder_profiles mp
  where mp.id = v_booking.minder_id;

  if v_booking.owner_id <> v_uid and coalesce(v_minder_user_id, '') <> v_uid::text then
    raise exception 'Not authorised to dispute this booking';
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
    status       = 'disputed',
    dispute_reason = trim(p_reason),
    disputed_at  = now(),
    disputed_by  = v_uid
  where id = p_booking_id;
end;
$$;

revoke all on function public.bookings_raise_dispute(uuid, text) from public;
grant execute on function public.bookings_raise_dispute(uuid, text) to authenticated;
