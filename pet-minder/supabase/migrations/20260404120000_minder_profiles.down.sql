-- Rollback for 20260404120000_minder_profiles.sql
-- Run this in the Supabase SQL editor to undo the migration.

-- 1. Remove the display-name join policy from users
drop policy if exists "Authenticated users can read minder display names" on public.users;

-- 2. Remove the owner-search SELECT policy from minder_profiles
drop policy if exists "Authenticated users can search minder_profiles" on public.minder_profiles;

-- 3. Remove minder own-row policies
drop policy if exists "Minders can update own minder_profile" on public.minder_profiles;
drop policy if exists "Minders can insert own minder_profile" on public.minder_profiles;
drop policy if exists "Minders can read own minder_profile"   on public.minder_profiles;

-- 4. Drop the table ONLY if you are certain it was created by this migration
--    and contains no data you want to keep. Commented out for safety.
-- drop table if exists public.minder_profiles;
