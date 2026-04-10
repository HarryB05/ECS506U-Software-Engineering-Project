-- Fix review availability for bookings marked completed before end_datetime,
-- and allow reviewers to read back their own unmoderated review so the
-- "You rated this booking" confirmation renders correctly after submission.

-- 1. Enable RLS on reviews if not already active (idempotent).
alter table public.reviews enable row level security;

-- 2. Allow a reviewer to read their own review regardless of moderation status.
--    Without this, the reviewer can never see their own unmoderated review and
--    the post-submit confirmation card never renders.
create policy "reviews_select_own_as_reviewer"
  on public.reviews
  for select
  to authenticated
  using (reviewer_id = auth.uid());

-- 3. Rebuild the insert policy to also unlock reviews when the booking has been
--    explicitly marked as completed (e.g. by an admin), even if end_datetime is
--    still in the future.
drop policy if exists "reviews_insert_for_booking_participants" on public.reviews;

create policy "reviews_insert_for_booking_participants"
  on public.reviews
  for insert
  to authenticated
  with check (
    reviewer_id = auth.uid()
    and rating is not null
    and booking_id is not null
    and exists (
      select 1
      from public.bookings b
      left join public.minder_profiles mp on mp.id = b.minder_id
      where b.id = reviews.booking_id
        and b.cancelled_at is null
        and (b.end_datetime <= now() or b.status = 'completed')
        and (
          (
            b.owner_id = auth.uid()
            and mp.user_id = reviews.reviewee_id
          )
          or (
            mp.user_id = auth.uid()
            and b.owner_id = reviews.reviewee_id
          )
        )
    )
  );
