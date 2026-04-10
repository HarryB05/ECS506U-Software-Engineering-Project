-- Public review visibility and user reporting workflow.

create table if not exists public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  reporter_id uuid not null references public.users (id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  unique (review_id, reporter_id)
);

create index if not exists review_reports_review_id_idx
  on public.review_reports (review_id);

create index if not exists review_reports_reporter_id_idx
  on public.review_reports (reporter_id);

alter table public.review_reports enable row level security;

-- Reviews: authenticated users can read moderated reviews, admins can read all.
create policy "reviews_select_moderated_for_authenticated"
  on public.reviews
  for select
  to authenticated
  using (is_moderated = true);

create policy "reviews_select_all_for_admins"
  on public.reviews
  for select
  to authenticated
  using (public.is_admin());

-- Reviews: participants can insert booking-linked reviews after session end.
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
        and b.end_datetime <= now()
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

-- Report table policies.
create policy "review_reports_insert_own"
  on public.review_reports
  for insert
  to authenticated
  with check (reporter_id = auth.uid());

create policy "review_reports_select_own_or_admin"
  on public.review_reports
  for select
  to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

create policy "review_reports_delete_admin"
  on public.review_reports
  for delete
  to authenticated
  using (public.is_admin());
