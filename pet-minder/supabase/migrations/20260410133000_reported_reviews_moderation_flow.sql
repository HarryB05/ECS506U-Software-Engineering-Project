-- Move to report-driven moderation:
-- 1) New reviews are visible by default.
-- 2) A report automatically sends a review into moderation.
-- 3) Existing data is normalized to this model.

alter table public.reviews
  alter column is_moderated set default true;

update public.reviews
set is_moderated = true
where is_moderated is null;

-- Keep already-reported reviews in moderation.
update public.reviews r
set is_moderated = false
where exists (
  select 1
  from public.review_reports rr
  where rr.review_id = r.id
);

-- Publish legacy unmoderated reviews that have never been reported.
update public.reviews r
set is_moderated = true
where coalesce(r.is_moderated, false) = false
  and not exists (
    select 1
    from public.review_reports rr
    where rr.review_id = r.id
  );

create or replace function public.flag_review_for_moderation_on_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.reviews
  set is_moderated = false
  where id = new.review_id;
  return new;
end;
$$;

drop trigger if exists trg_review_reports_flag_review on public.review_reports;

create trigger trg_review_reports_flag_review
after insert on public.review_reports
for each row
execute function public.flag_review_for_moderation_on_report();
