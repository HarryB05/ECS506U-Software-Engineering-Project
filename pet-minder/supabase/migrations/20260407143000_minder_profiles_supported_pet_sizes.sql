-- Optional supported pet sizes for minder profiles.

alter table public.minder_profiles
  add column if not exists supported_pet_sizes text[] not null default '{}';

alter table public.minder_profiles
  drop constraint if exists minder_profiles_supported_pet_sizes_check;

alter table public.minder_profiles
  add constraint minder_profiles_supported_pet_sizes_check
  check (
    supported_pet_sizes <@ array['small', 'medium', 'large', 'x-large']::text[]
  );

comment on column public.minder_profiles.supported_pet_sizes is
  'Supported pet sizes for care: small (0-10kg), medium (10-25kg), large (25-40kg), x-large (40+kg)';
