-- Track who cancels bookings for verification criteria.
-- Updates bookings_cancel_booking to persist cancellation actor.

alter table public.bookings
  add column if not exists cancelled_by_user_id uuid references public.users (id);

create or replace function public.bookings_cancel_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_updated int;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  update public.bookings b
  set
    status = 'cancelled',
    cancelled_at = now(),
    cancelled_by_user_id = v_uid,
    updated_at = now()
  where b.id = p_booking_id
    and b.cancellation_deadline > now()
    and b.status in ('pending', 'confirmed')
    and (
      public.is_admin()
      or b.owner_id = v_uid
      or exists (
        select 1
        from public.minder_profiles mp
        where mp.id = b.minder_id
          and mp.user_id = v_uid
      )
    );

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'Could not cancel booking';
  end if;
end;
$$;
