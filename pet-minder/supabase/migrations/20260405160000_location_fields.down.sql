alter table public.minder_profiles
  drop column if exists location_name,
  drop column if exists latitude,
  drop column if exists longitude;

alter table public.users
  drop column if exists location_name,
  drop column if exists latitude,
  drop column if exists longitude;
