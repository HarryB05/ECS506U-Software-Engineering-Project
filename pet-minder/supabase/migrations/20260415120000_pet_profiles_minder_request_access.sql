-- Allow minders to read pet profiles for pets attached to booking requests
-- they are the target minder for. Previously minders could only read pet
-- profiles for pets in confirmed bookings (booking_pets); this extends access
-- to the request phase so pet details are visible before acceptance.

drop policy if exists "pet_profiles_select_for_requesting_minder" on public.pet_profiles;

create policy "pet_profiles_select_for_requesting_minder"
  on public.pet_profiles
  for select
  to authenticated
  using (
    public.is_admin()
    or (
      deleted_at is null
      and exists (
        select 1
        from public.booking_request_pets brp
        join public.booking_requests br on br.id = brp.request_id
        join public.minder_profiles mp on mp.id = br.minder_id
        where brp.pet_id = pet_profiles.id
          and mp.user_id = auth.uid()
      )
    )
  );
