-- Optional pet size for pet profiles.

alter table public.pet_profiles
  add column if not exists pet_size text;

alter table public.pet_profiles
  drop constraint if exists pet_profiles_pet_size_check;

alter table public.pet_profiles
  add constraint pet_profiles_pet_size_check
  check (
    pet_size is null
    or pet_size in ('small', 'medium', 'large', 'x-large')
  );

comment on column public.pet_profiles.pet_size is
  'Pet size category: small (0-10kg), medium (10-25kg), large (25-40kg), x-large (40+kg)';
