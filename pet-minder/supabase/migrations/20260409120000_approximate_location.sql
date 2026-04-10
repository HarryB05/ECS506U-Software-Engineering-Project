-- Security: store only approximate coordinates for minder and user rows.
-- Rounds existing lat/lon to 2 decimal places (~1 km precision) so that
-- minder profiles never expose an exact home address.
-- New writes are rounded in the application layer (minder-profile-service.ts).

UPDATE public.minder_profiles
  SET
    latitude  = ROUND(latitude::numeric,  2),
    longitude = ROUND(longitude::numeric, 2),
    updated_at = now()
  WHERE latitude IS NOT NULL
     OR longitude IS NOT NULL;

UPDATE public.users
  SET
    latitude  = ROUND(latitude::numeric,  2),
    longitude = ROUND(longitude::numeric, 2)
  WHERE latitude IS NOT NULL
     OR longitude IS NOT NULL;
