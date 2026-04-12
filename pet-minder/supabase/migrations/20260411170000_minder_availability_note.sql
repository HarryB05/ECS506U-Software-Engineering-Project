-- Add availability_note to minder_profiles so minders can describe their
-- available days and hours (e.g. "Mon–Fri 8am–6pm, weekends on request").
-- Owners see this note before booking so they can check availability upfront.

alter table public.minder_profiles
  add column if not exists availability_note text;
