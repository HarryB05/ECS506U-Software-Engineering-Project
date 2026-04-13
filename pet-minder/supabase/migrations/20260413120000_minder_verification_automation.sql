-- Minder verification automation.
-- Recomputes on key changes and schedules nightly safety sweep.

-- Recompute one profile after related events.
create or replace function public.update_minder_verification(
  p_minder_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.minder_profiles mp
  set
    is_verified = public.compute_minder_verified(p_minder_profile_id),
    updated_at = now()
  where mp.id = p_minder_profile_id
    and mp.deleted_at is null;
end;
$$;

-- Nightly safety net for time-based criteria (e.g. account age).
create or replace function public.recompute_all_minder_verifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_count integer := 0;
begin
  for v_profile_id in
    select mp.id
    from public.minder_profiles mp
    where mp.deleted_at is null
  loop
    perform public.update_minder_verification(v_profile_id);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- Booking status/cancellation changes only affect that booking's minder.
create or replace function public.on_booking_verification_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.minder_id is not null and new.status in ('completed', 'cancelled') then
    perform public.update_minder_verification(new.minder_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_booking_verification_change on public.bookings;

create trigger trg_booking_verification_change
after update of status
on public.bookings
for each row
execute function public.on_booking_verification_change();

-- Review changes can affect average rating and therefore verification.
create or replace function public.on_review_verification_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_reviewee_id uuid;
begin
  v_reviewee_id := coalesce(new.reviewee_id, old.reviewee_id);

  if v_reviewee_id is null then
    return coalesce(new, old);
  end if;

  select mp.id
  into v_profile_id
  from public.minder_profiles mp
  where mp.user_id = v_reviewee_id
    and mp.deleted_at is null
  limit 1;

  if v_profile_id is not null then
    update public.minder_profiles mp
    set average_rating = (
      select round(avg(r.rating)::numeric, 2)::numeric(3,2)
      from public.reviews r
      where r.reviewee_id = v_reviewee_id
        and r.is_moderated = true
        and r.rating is not null
    )
    where mp.id = v_profile_id;

    perform public.update_minder_verification(v_profile_id);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_review_verification_change on public.reviews;

create trigger trg_review_verification_change
after insert
on public.reviews
for each row
execute function public.on_review_verification_change();

-- Keep one named cron job for nightly recompute.
do $$
declare
  v_job_id bigint;
begin
  begin
    create extension if not exists pg_cron with schema extensions;
  exception
    when others then
      null;
  end;

  if to_regnamespace('cron') is not null then
    for v_job_id in
      select jobid
      from cron.job
      where jobname = 'minder_verification_nightly'
    loop
      perform cron.unschedule(v_job_id);
    end loop;

    perform cron.schedule(
      'minder_verification_nightly',
      '0 2 * * *',
      $cron$select public.recompute_all_minder_verifications();$cron$
    );
  end if;
end;
$$;

grant execute on function public.update_minder_verification(uuid) to authenticated;
grant execute on function public.recompute_all_minder_verifications() to authenticated;