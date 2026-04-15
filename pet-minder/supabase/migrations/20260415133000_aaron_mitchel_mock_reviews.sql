-- Seed additional mock reviews for Aaron Mitchel (mock minder #27).
-- UUID: 00000001-0027-4000-8001-000000000027
-- Applies to dev/test environments only.

create temporary table tmp_aaron_review_seed
on commit drop
as
with target_minder as (
  select mp.id as minder_profile_id
  from public.minder_profiles mp
  where mp.user_id = '00000001-0027-4000-8001-000000000027'::uuid
  limit 1
),
slots as (
  select gs as slot
  from generate_series(1, 12) as gs
),
seed as (
  select
    slot,
    case
      when (((27 + (slot * 3)) % 30) + 1) = 27
        then (((27 + (slot * 3) + 1) % 30) + 1)
      else (((27 + (slot * 3)) % 30) + 1)
    end as reviewer_idx,
    now() - make_interval(days => (slot * 2)) as created_at,
    now() - make_interval(days => (slot * 2), hours => 3) as start_at,
    now() - make_interval(days => (slot * 2), hours => 1) as end_at,
    (4 + (slot % 2))::int as rating,
    case (slot % 12)
      when 0 then 'Excellent communication throughout and very caring service.'
      when 1 then 'Reliable and punctual. My dog settled in straight away.'
      when 2 then 'Great photo updates and clear check-ins during the booking.'
      when 3 then 'Very friendly, attentive, and easy to coordinate with.'
      when 4 then 'Handled feeding routine and play time exactly as requested.'
      when 5 then 'Smooth experience from booking to pickup. Would book again.'
      when 6 then 'Professional and calm with a nervous rescue pet.'
      when 7 then 'Strong attention to detail and great end-of-day summary.'
      when 8 then 'Flexible around timings and very responsive to messages.'
      when 9 then 'Kind, patient, and clearly experienced with pets.'
      when 10 then 'Clean, organised setup and great care overall.'
      else 'Fantastic sitter. Consistent updates and a happy pet at collection.'
    end as comment,
    case (slot % 4)
      when 0 then 'Dog Walking'
      when 1 then 'Pet Sitting'
      when 2 then 'Drop-In Visit'
      else 'Daycare'
    end as service_type
  from slots
),
mapped_reviewers as (
  select
    s.slot,
    (
      '00000001-'
      || lpad(s.reviewer_idx::text, 4, '0')
      || '-4000-8001-'
      || lpad(s.reviewer_idx::text, 12, '0')
    )::uuid as reviewer_id,
    s.created_at,
    s.start_at,
    s.end_at,
    s.rating,
    s.comment,
    s.service_type
  from seed s
)
select
  mr.reviewer_id,
  '00000001-0027-4000-8001-000000000027'::uuid as reviewee_id,
  tm.minder_profile_id as reviewee_minder_profile_id,
  mr.created_at,
  mr.start_at,
  mr.end_at,
  mr.rating,
  mr.comment,
  mr.service_type,
  (
    substr(md5('aaron-mock-request-' || mr.slot || '-' || mr.reviewer_id::text), 1, 8)
    || '-' || substr(md5('aaron-mock-request-' || mr.slot || '-' || mr.reviewer_id::text), 9, 4)
    || '-' || substr(md5('aaron-mock-request-' || mr.slot || '-' || mr.reviewer_id::text), 13, 4)
    || '-' || substr(md5('aaron-mock-request-' || mr.slot || '-' || mr.reviewer_id::text), 17, 4)
    || '-' || substr(md5('aaron-mock-request-' || mr.slot || '-' || mr.reviewer_id::text), 21, 12)
  )::uuid as request_id,
  (
    substr(md5('aaron-mock-booking-' || mr.slot || '-' || mr.reviewer_id::text), 1, 8)
    || '-' || substr(md5('aaron-mock-booking-' || mr.slot || '-' || mr.reviewer_id::text), 9, 4)
    || '-' || substr(md5('aaron-mock-booking-' || mr.slot || '-' || mr.reviewer_id::text), 13, 4)
    || '-' || substr(md5('aaron-mock-booking-' || mr.slot || '-' || mr.reviewer_id::text), 17, 4)
    || '-' || substr(md5('aaron-mock-booking-' || mr.slot || '-' || mr.reviewer_id::text), 21, 12)
  )::uuid as booking_id
from mapped_reviewers mr
join target_minder tm on true;

insert into public.booking_requests (
  id,
  owner_id,
  minder_id,
  requested_datetime,
  requested_end_datetime,
  duration_minutes,
  message,
  care_instructions,
  service_type,
  short_notice_warning,
  status,
  created_at,
  updated_at
)
select
  s.request_id,
  s.reviewer_id,
  s.reviewee_minder_profile_id,
  s.start_at,
  s.end_at,
  greatest(60, extract(epoch from (s.end_at - s.start_at))::int / 60),
  'Mock booking request created for Aaron review fixtures.',
  'Seeded care instructions for Aaron review fixtures.',
  s.service_type,
  false,
  (
    select (
      case
      when exists (
        select 1
        from pg_type t
        join pg_namespace n on n.oid = t.typnamespace
        join pg_enum e on e.enumtypid = t.oid
        where n.nspname = 'public'
          and t.typname = 'booking_request_status'
          and e.enumlabel = 'confirmed'
      ) then 'confirmed'
      when exists (
        select 1
        from pg_type t
        join pg_namespace n on n.oid = t.typnamespace
        join pg_enum e on e.enumtypid = t.oid
        where n.nspname = 'public'
          and t.typname = 'booking_request_status'
          and e.enumlabel = 'accepted'
      ) then 'accepted'
      else 'pending'
      end
    )::public.booking_request_status
  ),
  s.created_at,
  s.created_at
from tmp_aaron_review_seed s
on conflict (id) do nothing;

insert into public.bookings (
  id,
  request_id,
  owner_id,
  minder_id,
  start_datetime,
  end_datetime,
  care_instructions,
  cancellation_deadline,
  status,
  created_at,
  updated_at
)
select
  s.booking_id,
  s.request_id,
  s.reviewer_id,
  s.reviewee_minder_profile_id,
  s.start_at,
  s.end_at,
  'Seeded care instructions for Aaron review fixtures.',
  s.start_at - interval '48 hours',
  'completed',
  s.created_at,
  s.created_at
from tmp_aaron_review_seed s
on conflict (id) do nothing;

insert into public.reviews (
  reviewer_id,
  reviewee_id,
  booking_id,
  rating,
  comment,
  is_moderated,
  created_at,
  updated_at
)
select
  s.reviewer_id,
  s.reviewee_id,
  s.booking_id,
  s.rating,
  s.comment,
  true,
  s.created_at,
  s.created_at
from tmp_aaron_review_seed s
where not exists (
  select 1
  from public.reviews r
  where r.reviewer_id = s.reviewer_id
    and r.booking_id = s.booking_id
);
