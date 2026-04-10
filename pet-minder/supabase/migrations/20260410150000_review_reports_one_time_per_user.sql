-- Enforce one-time reporting per reviewer for each review, permanently.

-- Remove duplicates first so uniqueness can be applied safely.
with ranked as (
  select
    id,
    row_number() over (
      partition by review_id, reporter_id
      order by created_at asc, id asc
    ) as rn
  from public.review_reports
)
delete from public.review_reports rr
using ranked r
where rr.id = r.id
  and r.rn > 1;

-- Remove active-only uniqueness introduced by unresolved-state workflow.
drop index if exists review_reports_active_unique;

-- Keep legacy constraint drift under control across environments.
alter table public.review_reports
  drop constraint if exists review_reports_review_id_reporter_id_key;

-- Permanently disallow multiple reports by the same user on the same review.
create unique index if not exists review_reports_unique
  on public.review_reports (review_id, reporter_id);
