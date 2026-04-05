-- Minders need owner's display name on booking requests and sessions.
-- Existing policy only exposes users who are minders (search cards).

drop policy if exists "users_read_owner_names_for_minder_bookings" on public.users;

create policy "users_read_owner_names_for_minder_bookings"
  on public.users
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.minder_profiles mp
      where mp.user_id = auth.uid()
        and mp.deleted_at is null
        and (
          exists (
            select 1
            from public.booking_requests br
            where br.minder_id = mp.id
              and br.owner_id = users.id
          )
          or exists (
            select 1
            from public.bookings b
            where b.minder_id = mp.id
              and b.owner_id = users.id
          )
        )
    )
  );
