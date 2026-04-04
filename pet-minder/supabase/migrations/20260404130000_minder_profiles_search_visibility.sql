-- Add visible_in_search flag to minder_profiles.
-- Minders opt in to appearing in owner search; defaults to false so
-- incomplete profiles are hidden until the minder is ready.
-- Run in Supabase SQL editor if migrations are not applied automatically.

alter table public.minder_profiles
  add column if not exists visible_in_search boolean not null default false;
