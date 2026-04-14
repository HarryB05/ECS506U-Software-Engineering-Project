-- Admin-only RPC to resolve a disputed booking.
-- Direct UPDATE on bookings is blocked by RLS (no update policy exists —
-- all booking mutations go through security definer RPCs). This function
-- checks the caller holds the admin role, then applies the status change.

create or replace function public.bookings_resolve_dispute(
  p_booking_id uuid,
  p_new_status text   -- 'confirmed' | 'completed' | 'cancelled'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_updated  int;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_admin() then
    raise exception 'Admin role required';
  end if;

  if p_new_status not in ('confirmed', 'completed', 'cancelled') then
    raise exception 'Invalid resolution status: %', p_new_status;
  end if;

  update public.bookings
  set status = p_new_status::public.booking_status
  where id = p_booking_id
    and status = 'disputed';

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise exception 'Booking not found or not currently disputed';
  end if;
end;
$$;

revoke all on function public.bookings_resolve_dispute(uuid, text) from public;
grant execute on function public.bookings_resolve_dispute(uuid, text) to authenticated;
