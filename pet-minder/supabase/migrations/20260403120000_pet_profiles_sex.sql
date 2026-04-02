-- Optional sex for pet profiles (Male / Female in UI; stored as male | female).

alter table public.pet_profiles
  add column if not exists sex text;

alter table public.pet_profiles
  drop constraint if exists pet_profiles_sex_check;

alter table public.pet_profiles
  add constraint pet_profiles_sex_check
  check (sex is null or sex in ('male', 'female'));
