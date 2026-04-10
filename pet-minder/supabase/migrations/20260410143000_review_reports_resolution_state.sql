-- Persist report history while allowing re-reporting after admin resolution.

alter table public.review_reports
  add column if not exists resolved_at timestamptz;

-- Replace strict uniqueness with active-report uniqueness only.
alter table public.review_reports
  drop constraint if exists review_reports_review_id_reporter_id_key;

create unique index if not exists review_reports_active_unique
  on public.review_reports (review_id, reporter_id)
  where resolved_at is null;

create index if not exists review_reports_review_id_resolved_at_idx
  on public.review_reports (review_id, resolved_at);

drop policy if exists "review_reports_update_admin" on public.review_reports;

create policy "review_reports_update_admin"
  on public.review_reports
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
