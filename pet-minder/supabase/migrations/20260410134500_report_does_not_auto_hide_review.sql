-- Keep reported reviews visible until an admin resolves or removes them.
-- Previous flow auto-set is_moderated=false on report insert; this disables that behavior.

alter table public.reviews
  alter column is_moderated set default true;

-- Any existing reviews that were hidden only because they were reported
-- should be republished.
update public.reviews
set is_moderated = true
where is_moderated = false;

drop trigger if exists trg_review_reports_flag_review on public.review_reports;
drop function if exists public.flag_review_for_moderation_on_report();
