-- Allow assigned minders to read pet profiles on request detail pages too.
-- Existing policy only covered confirmed bookings via booking_pets.

drop policy if exists "pet_profiles_select_for_assigned_minder" on public.pet_profiles;

create policy "pet_profiles_select_for_assigned_minder"
  on public.pet_profiles
  for select
  to authenticated
  using (
    public.is_admin()
    or (
      deleted_at is null
      and (
        exists (
          select 1
          from public.booking_pets bp
          join public.bookings b on b.id = bp.booking_id
          join public.minder_profiles mp on mp.id = b.minder_id
          where bp.pet_id = pet_profiles.id
            and mp.user_id = auth.uid()
        )
        or exists (
          select 1
          from public.booking_request_pets brp
          join public.booking_requests br on br.id = brp.request_id
          join public.minder_profiles mp on mp.id = br.minder_id
          where brp.pet_id = pet_profiles.id
            and mp.user_id = auth.uid()
        )
      )
    )
  );
