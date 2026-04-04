-- Rollback for 20260404130000_minder_profiles_search_visibility.sql

alter table public.minder_profiles
  drop column if exists visible_in_search;
