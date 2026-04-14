-- Prevent duplicate availability slots at the database level.
-- An exact duplicate (same minder, same day, same start, same end) is now a
-- unique-constraint violation rather than a silent duplicate row.
-- Overlapping-but-not-identical slots are still caught client-side.

create unique index if not exists minder_availability_unique_slot
  on public.minder_availability (minder_id, day_of_week, start_time, end_time);
