-- Seed mock reviews for the 30 mock minder accounts.
-- Adds 3-5 incoming reviews per minder (average 4.0 each).
-- Applies to schemas where public.reviews.booking_id is required.
-- Apply to dev/test environments only.

create temporary table tmp_mock_review_seed
on commit drop
as
with mock_minders as (
  select *
  from (
    values
      (1,  '00000001-0001-4000-8001-000000000001'::uuid),
      (2,  '00000001-0002-4000-8001-000000000002'::uuid),
      (3,  '00000001-0003-4000-8001-000000000003'::uuid),
      (4,  '00000001-0004-4000-8001-000000000004'::uuid),
      (5,  '00000001-0005-4000-8001-000000000005'::uuid),
      (6,  '00000001-0006-4000-8001-000000000006'::uuid),
      (7,  '00000001-0007-4000-8001-000000000007'::uuid),
      (8,  '00000001-0008-4000-8001-000000000008'::uuid),
      (9,  '00000001-0009-4000-8001-000000000009'::uuid),
      (10, '00000001-0010-4000-8001-000000000010'::uuid),
      (11, '00000001-0011-4000-8001-000000000011'::uuid),
      (12, '00000001-0012-4000-8001-000000000012'::uuid),
      (13, '00000001-0013-4000-8001-000000000013'::uuid),
      (14, '00000001-0014-4000-8001-000000000014'::uuid),
      (15, '00000001-0015-4000-8001-000000000015'::uuid),
      (16, '00000001-0016-4000-8001-000000000016'::uuid),
      (17, '00000001-0017-4000-8001-000000000017'::uuid),
      (18, '00000001-0018-4000-8001-000000000018'::uuid),
      (19, '00000001-0019-4000-8001-000000000019'::uuid),
      (20, '00000001-0020-4000-8001-000000000020'::uuid),
      (21, '00000001-0021-4000-8001-000000000021'::uuid),
      (22, '00000001-0022-4000-8001-000000000022'::uuid),
      (23, '00000001-0023-4000-8001-000000000023'::uuid),
      (24, '00000001-0024-4000-8001-000000000024'::uuid),
      (25, '00000001-0025-4000-8001-000000000025'::uuid),
      (26, '00000001-0026-4000-8001-000000000026'::uuid),
      (27, '00000001-0027-4000-8001-000000000027'::uuid),
      (28, '00000001-0028-4000-8001-000000000028'::uuid),
      (29, '00000001-0029-4000-8001-000000000029'::uuid),
      (30, '00000001-0030-4000-8001-000000000030'::uuid)
  ) as t(idx, user_id)
),
review_slots as (
  select
    m.idx as reviewee_idx,
    m.user_id as reviewee_id,
    gs.slot
  from mock_minders m
  cross join lateral generate_series(1, 3 + (m.idx % 3)) as gs(slot)
),
assigned_reviews as (
  select
    rs.reviewee_idx,
    rs.slot,
    rm.user_id as reviewer_id,
    rs.reviewee_id,
    mp.id as reviewee_minder_profile_id,
    (1 + ((rs.reviewee_idx + rs.slot) % 5))::int as rating,
    case ((rs.reviewee_idx + rs.slot) % 8)
      when 0 then 'Great communication and clearly cared about my pet.'
      when 1 then 'Very reliable and punctual. Would book again.'
      when 2 then 'Good updates throughout the booking and pet was happy.'
      when 3 then 'Solid service and friendly approach.'
      when 4 then 'Handled feeding and routine exactly as requested.'
      when 5 then 'Nice experience overall, no issues.'
      when 6 then 'Professional and easy to coordinate with.'
      else 'Helpful and attentive care from start to finish.'
    end as comment,
    now() - make_interval(days => (rs.reviewee_idx * 2 + rs.slot)) as created_at
  from review_slots rs
  join mock_minders rm
    on rm.idx = (
      case
        when (((rs.reviewee_idx + (rs.slot * 7)) % 30) + 1) = rs.reviewee_idx
          then (((rs.reviewee_idx + (rs.slot * 7) + 1) % 30) + 1)
        else (((rs.reviewee_idx + (rs.slot * 7)) % 30) + 1)
      end
    )
  join public.minder_profiles mp
    on mp.user_id = rs.reviewee_id
)
select
  ar.reviewer_id,
  ar.reviewee_id,
  ar.reviewee_minder_profile_id,
  ar.rating,
  ar.comment,
  ar.created_at,
  (
    substr(md5('mock-request-' || ar.reviewee_idx || '-' || ar.slot), 1, 8)
    || '-' || substr(md5('mock-request-' || ar.reviewee_idx || '-' || ar.slot), 9, 4)
    || '-' || substr(md5('mock-request-' || ar.reviewee_idx || '-' || ar.slot), 13, 4)
    || '-' || substr(md5('mock-request-' || ar.reviewee_idx || '-' || ar.slot), 17, 4)
    || '-' || substr(md5('mock-request-' || ar.reviewee_idx || '-' || ar.slot), 21, 12)
  )::uuid as request_id,
  (
    substr(md5('mock-booking-' || ar.reviewee_idx || '-' || ar.slot), 1, 8)
    || '-' || substr(md5('mock-booking-' || ar.reviewee_idx || '-' || ar.slot), 9, 4)
    || '-' || substr(md5('mock-booking-' || ar.reviewee_idx || '-' || ar.slot), 13, 4)
    || '-' || substr(md5('mock-booking-' || ar.reviewee_idx || '-' || ar.slot), 17, 4)
    || '-' || substr(md5('mock-booking-' || ar.reviewee_idx || '-' || ar.slot), 21, 12)
  )::uuid as booking_id,
  ar.created_at - interval '2 hours' as start_at,
  ar.created_at as end_at
from assigned_reviews ar;

insert into public.booking_requests (
  id,
  owner_id,
  minder_id,
  requested_datetime,
  requested_end_datetime,
  duration_minutes,
  message,
  care_instructions,
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
  'Mock booking request created for seeded review data.',
  'Seeded care instructions for review fixtures.',
  'accepted',
  s.created_at,
  s.created_at
from tmp_mock_review_seed s
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
  'Seeded care instructions for review fixtures.',
  s.start_at - interval '48 hours',
  'completed',
  s.created_at,
  s.created_at
from tmp_mock_review_seed s
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
from tmp_mock_review_seed s
where not exists (
  select 1
  from public.reviews r
  where r.reviewer_id = s.reviewer_id
    and r.booking_id = s.booking_id
);

-- Keep profile aggregate aligned with seeded reviews.
with mock_minders as (
  select *
  from (
    values
      ('00000001-0001-4000-8001-000000000001'::uuid),
      ('00000001-0002-4000-8001-000000000002'::uuid),
      ('00000001-0003-4000-8001-000000000003'::uuid),
      ('00000001-0004-4000-8001-000000000004'::uuid),
      ('00000001-0005-4000-8001-000000000005'::uuid),
      ('00000001-0006-4000-8001-000000000006'::uuid),
      ('00000001-0007-4000-8001-000000000007'::uuid),
      ('00000001-0008-4000-8001-000000000008'::uuid),
      ('00000001-0009-4000-8001-000000000009'::uuid),
      ('00000001-0010-4000-8001-000000000010'::uuid),
      ('00000001-0011-4000-8001-000000000011'::uuid),
      ('00000001-0012-4000-8001-000000000012'::uuid),
      ('00000001-0013-4000-8001-000000000013'::uuid),
      ('00000001-0014-4000-8001-000000000014'::uuid),
      ('00000001-0015-4000-8001-000000000015'::uuid),
      ('00000001-0016-4000-8001-000000000016'::uuid),
      ('00000001-0017-4000-8001-000000000017'::uuid),
      ('00000001-0018-4000-8001-000000000018'::uuid),
      ('00000001-0019-4000-8001-000000000019'::uuid),
      ('00000001-0020-4000-8001-000000000020'::uuid),
      ('00000001-0021-4000-8001-000000000021'::uuid),
      ('00000001-0022-4000-8001-000000000022'::uuid),
      ('00000001-0023-4000-8001-000000000023'::uuid),
      ('00000001-0024-4000-8001-000000000024'::uuid),
      ('00000001-0025-4000-8001-000000000025'::uuid),
      ('00000001-0026-4000-8001-000000000026'::uuid),
      ('00000001-0027-4000-8001-000000000027'::uuid),
      ('00000001-0028-4000-8001-000000000028'::uuid),
      ('00000001-0029-4000-8001-000000000029'::uuid),
      ('00000001-0030-4000-8001-000000000030'::uuid)
  ) as t(user_id)
),
avgs as (
  select
    r.reviewee_id,
    round(avg(r.rating)::numeric, 2) as avg_rating
  from public.reviews r
  join mock_minders mm
    on mm.user_id = r.reviewee_id
  where r.is_moderated = true
    and r.rating is not null
  group by r.reviewee_id
)
update public.minder_profiles mp
set average_rating = avgs.avg_rating
from avgs
where mp.user_id = avgs.reviewee_id;
