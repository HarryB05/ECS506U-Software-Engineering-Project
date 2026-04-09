-- Add `disputed` to booking_status enum if missing.
-- Needed for admin tooling that filters bookings by status = 'disputed'.

do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'booking_status'
  ) then
    if not exists (
      select 1
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public'
        and t.typname = 'booking_status'
        and e.enumlabel = 'disputed'
    ) then
      alter type public.booking_status add value 'disputed';
    end if;
  end if;
end $$;

