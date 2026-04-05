-- Add location fields to minder_profiles and users.
-- Minders set their service location; owners set theirs for proximity search.

alter table public.minder_profiles
  add column if not exists location_name text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.users
  add column if not exists location_name text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;
