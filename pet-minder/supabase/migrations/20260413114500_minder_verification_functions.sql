-- Minder verification functions.
-- Provides checklist details and overall computed verified status.

-- Criterion breakdown for minder verification UI.
create or replace function public.get_minder_verification_checklist(
  p_minder_profile_id uuid
)
returns table (
  minder_profile_id uuid,
  is_verified boolean,
  email_confirmed boolean,
  profile_complete boolean,
  account_age_ok boolean,
  rating_ok boolean,
  completed_bookings_ok boolean,
  recent_cancellations_ok boolean,
  visible_in_search_ok boolean,
  completed_bookings_count integer,
  recent_minder_cancellations_count integer,
  average_rating numeric(3,2)
)
language sql
security definer
set search_path = public
as $$
  with profile as (
    select
      mp.id,
      mp.user_id,
      mp.service_description,
      mp.supported_pet_types,
      mp.service_pricing,
      mp.created_at,
      mp.average_rating,
      mp.visible_in_search
    from public.minder_profiles mp
    where mp.id = p_minder_profile_id
      and mp.deleted_at is null
  ),
  counters as (
    select
      profile.id,
      count(*) filter (where b.status = 'completed')::integer as completed_bookings_count,
      count(*) filter (
        where b.status = 'cancelled'
          and b.cancelled_at >= now() - interval '90 days'
          and b.cancelled_by_user_id = profile.user_id
      )::integer as recent_minder_cancellations_count
    from profile
    left join public.bookings b
      on b.minder_id = profile.id
    group by profile.id
  )
  select
    profile.id as minder_profile_id,
    (
      exists (
        select 1
        from auth.users au
        where au.id = profile.user_id
          and au.email_confirmed_at is not null
      )
      and profile.service_description is not null
      and length(btrim(profile.service_description)) > 0
      and coalesce(cardinality(profile.supported_pet_types), 0) > 0
      and profile.service_pricing is not null
      and length(btrim(profile.service_pricing::text)) > 0
      and profile.created_at <= now() - interval '6 months'
      and profile.average_rating is not null
      and profile.average_rating >= 4.0
      and counters.completed_bookings_count >= 20
      and counters.recent_minder_cancellations_count < 3
      and profile.visible_in_search = true
    ) as is_verified,
    exists (
      select 1
      from auth.users au
      where au.id = profile.user_id
        and au.email_confirmed_at is not null
    ) as email_confirmed,
    (
      profile.service_description is not null
      and length(btrim(profile.service_description)) > 0
      and coalesce(cardinality(profile.supported_pet_types), 0) > 0
      and profile.service_pricing is not null
      and length(btrim(profile.service_pricing::text)) > 0
    ) as profile_complete,
    profile.created_at <= now() - interval '6 months' as account_age_ok,
    profile.average_rating is not null and profile.average_rating >= 4.0 as rating_ok,
    counters.completed_bookings_count >= 20 as completed_bookings_ok,
    counters.recent_minder_cancellations_count < 3 as recent_cancellations_ok,
    profile.visible_in_search = true as visible_in_search_ok,
    counters.completed_bookings_count,
    counters.recent_minder_cancellations_count,
    profile.average_rating
  from profile
  join counters on counters.id = profile.id;
$$;

-- Boolean helper used by automation trigger/job updates.
create or replace function public.compute_minder_verified(
  p_minder_profile_id uuid
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (
      select v.is_verified
      from public.get_minder_verification_checklist(p_minder_profile_id) v
      limit 1
    ),
    false
  );
$$;

grant execute on function public.compute_minder_verified(uuid) to authenticated;
grant execute on function public.get_minder_verification_checklist(uuid) to authenticated;