-- Rollback: remove `disputed` from booking_status enum.
-- Postgres can't DROP VALUE, so we recreate the type without it.
-- Safety: rollback is blocked if any bookings still use status = 'disputed'.

do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'booking_status'
  ) and exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'booking_status'
      and e.enumlabel = 'disputed'
  ) then
    if exists (select 1 from public.bookings b where b.status = 'disputed') then
      raise exception 'Cannot rollback booking_status: bookings still contain status=disputed';
    end if;

    -- Create replacement type without disputed.
    create type public.booking_status__old as enum ('pending', 'confirmed', 'cancelled', 'completed');

    -- Swap column type.
    alter table public.bookings
      alter column status type public.booking_status__old
      using status::text::public.booking_status__old;

    -- Replace type.
    drop type public.booking_status;
    alter type public.booking_status__old rename to booking_status;
  end if;
end $$;

