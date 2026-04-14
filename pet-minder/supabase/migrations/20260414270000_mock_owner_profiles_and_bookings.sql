-- Mock owner test profiles with bookings and reviews.
-- Adds 5 owner accounts (IDs 31-35, same 00000001 prefix as mock minders)
-- with pets, bookings at various statuses, and reviews on completed bookings.
-- Apply to dev/test environments only.

-- ---------------------------------------------------------------------------
-- 1. auth.users
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  _h text := crypt('TestPass123!', gen_salt('bf', 10));
BEGIN
  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_sso_user
  ) VALUES
    ('00000001-0031-4000-8001-000000000031','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.owner.01@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
    ('00000001-0032-4000-8001-000000000032','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.owner.02@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
    ('00000001-0033-4000-8001-000000000033','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.owner.03@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
    ('00000001-0034-4000-8001-000000000034','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.owner.04@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
    ('00000001-0035-4000-8001-000000000035','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.owner.05@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- ---------------------------------------------------------------------------
-- 2. public.users
-- ---------------------------------------------------------------------------
INSERT INTO public.users (id, full_name, email, is_active, created_at, updated_at)
VALUES
  ('00000001-0031-4000-8001-000000000031', 'Alex Morgan',    'mock.owner.01@example.com', true, now(), now()),
  ('00000001-0032-4000-8001-000000000032', 'Jamie Rivera',   'mock.owner.02@example.com', true, now(), now()),
  ('00000001-0033-4000-8001-000000000033', 'Sam Patel',      'mock.owner.03@example.com', true, now(), now()),
  ('00000001-0034-4000-8001-000000000034', 'Casey Brooks',   'mock.owner.04@example.com', true, now(), now()),
  ('00000001-0035-4000-8001-000000000035', 'Jordan Ellis',   'mock.owner.05@example.com', true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. roles — owner role for each
-- ---------------------------------------------------------------------------
INSERT INTO public.roles (user_id, role_type, created_at)
VALUES
  ('00000001-0031-4000-8001-000000000031', 'owner', now()),
  ('00000001-0032-4000-8001-000000000032', 'owner', now()),
  ('00000001-0033-4000-8001-000000000033', 'owner', now()),
  ('00000001-0034-4000-8001-000000000034', 'owner', now()),
  ('00000001-0035-4000-8001-000000000035', 'owner', now())
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. pet_profiles — 2 pets per owner
-- ---------------------------------------------------------------------------
INSERT INTO public.pet_profiles (id, owner_id, name, pet_type, created_at, updated_at)
VALUES
  ('a0000031-0001-4000-8001-000000000001', '00000001-0031-4000-8001-000000000031', 'Biscuit', 'Dog',  now(), now()),
  ('a0000031-0002-4000-8001-000000000002', '00000001-0031-4000-8001-000000000031', 'Mittens', 'Cat',  now(), now()),
  ('a0000032-0001-4000-8001-000000000001', '00000001-0032-4000-8001-000000000032', 'Buddy',   'Dog',  now(), now()),
  ('a0000032-0002-4000-8001-000000000002', '00000001-0032-4000-8001-000000000032', 'Whiskers','Cat',  now(), now()),
  ('a0000033-0001-4000-8001-000000000001', '00000001-0033-4000-8001-000000000033', 'Milo',    'Dog',  now(), now()),
  ('a0000033-0002-4000-8001-000000000002', '00000001-0033-4000-8001-000000000033', 'Luna',    'Cat',  now(), now()),
  ('a0000034-0001-4000-8001-000000000001', '00000001-0034-4000-8001-000000000034', 'Charlie', 'Dog',  now(), now()),
  ('a0000034-0002-4000-8001-000000000002', '00000001-0034-4000-8001-000000000034', 'Noodle',  'Dog',  now(), now()),
  ('a0000035-0001-4000-8001-000000000001', '00000001-0035-4000-8001-000000000035', 'Pepper',  'Cat',  now(), now()),
  ('a0000035-0002-4000-8001-000000000002', '00000001-0035-4000-8001-000000000035', 'Oliver',  'Cat',  now(), now())
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. booking_requests + bookings — varied statuses
--    Uses mock minders 01-05 as the counterparties.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  -- Minder profile IDs for mock minders 01-05
  mp1 uuid; mp2 uuid; mp3 uuid; mp4 uuid; mp5 uuid;

  -- Request / booking ID pairs (deterministic)
  r1  uuid := 'b0000031-0001-4000-8001-000000000001'::uuid;
  r2  uuid := 'b0000031-0002-4000-8001-000000000002'::uuid;
  r3  uuid := 'b0000032-0001-4000-8001-000000000001'::uuid;
  r4  uuid := 'b0000032-0002-4000-8001-000000000002'::uuid;
  r5  uuid := 'b0000033-0001-4000-8001-000000000001'::uuid;
  r6  uuid := 'b0000033-0002-4000-8001-000000000002'::uuid;
  r7  uuid := 'b0000034-0001-4000-8001-000000000001'::uuid;
  r8  uuid := 'b0000034-0002-4000-8001-000000000002'::uuid;
  r9  uuid := 'b0000035-0001-4000-8001-000000000001'::uuid;
  r10 uuid := 'b0000035-0002-4000-8001-000000000002'::uuid;

  bk1  uuid := 'c0000031-0001-4000-8001-000000000001'::uuid;
  bk2  uuid := 'c0000031-0002-4000-8001-000000000002'::uuid;
  bk3  uuid := 'c0000032-0001-4000-8001-000000000001'::uuid;
  bk4  uuid := 'c0000032-0002-4000-8001-000000000002'::uuid;
  bk5  uuid := 'c0000033-0001-4000-8001-000000000001'::uuid;
  bk6  uuid := 'c0000033-0002-4000-8001-000000000002'::uuid;
  bk7  uuid := 'c0000034-0001-4000-8001-000000000001'::uuid;
  bk8  uuid := 'c0000035-0001-4000-8001-000000000001'::uuid;
BEGIN
  SELECT id INTO mp1 FROM public.minder_profiles WHERE user_id = '00000001-0001-4000-8001-000000000001';
  SELECT id INTO mp2 FROM public.minder_profiles WHERE user_id = '00000001-0002-4000-8001-000000000002';
  SELECT id INTO mp3 FROM public.minder_profiles WHERE user_id = '00000001-0003-4000-8001-000000000003';
  SELECT id INTO mp4 FROM public.minder_profiles WHERE user_id = '00000001-0004-4000-8001-000000000004';
  SELECT id INTO mp5 FROM public.minder_profiles WHERE user_id = '00000001-0005-4000-8001-000000000005';

  IF mp1 IS NULL OR mp2 IS NULL OR mp3 IS NULL OR mp4 IS NULL OR mp5 IS NULL THEN
    RAISE NOTICE 'Skipping mock owner bookings: one or more mock minder profiles not found. Run 20260409120100_mock_minder_profiles.sql first.';
    RETURN;
  END IF;

  -- ---- booking_requests ----
  INSERT INTO public.booking_requests (
    id, owner_id, minder_id,
    requested_datetime, requested_end_datetime, duration_minutes,
    message, care_instructions, service_type, status, created_at, updated_at
  ) VALUES
    -- Owner 01 / Minder 01: completed (past)
    (r1,  '00000001-0031-4000-8001-000000000031', mp1,
     now()-'30 days'::interval, now()-'28 days'::interval, 2880,
     'Looking forward to it!', 'Feed twice daily, no table scraps.', 'Pet Sitting', 'confirmed',
     now()-'35 days'::interval, now()-'30 days'::interval),

    -- Owner 01 / Minder 02: confirmed upcoming
    (r2,  '00000001-0031-4000-8001-000000000031', mp2,
     now()+'7 days'::interval, now()+'9 days'::interval, 2880,
     'Weekend away — please send updates!', 'Fresh water always available.', 'Pet Sitting', 'confirmed',
     now()-'3 days'::interval, now()-'3 days'::interval),

    -- Owner 02 / Minder 02: completed (past)
    (r3,  '00000001-0032-4000-8001-000000000032', mp2,
     now()-'14 days'::interval, now()-'13 days'::interval, 1440,
     'Just a day stay.', 'Buddy is friendly with other dogs.', 'Pet Sitting', 'confirmed',
     now()-'20 days'::interval, now()-'14 days'::interval),

    -- Owner 02 / Minder 03: pending
    (r4,  '00000001-0032-4000-8001-000000000032', mp3,
     now()+'14 days'::interval, null, 120,
     'Morning walk please.', 'Whiskers stays indoors.', 'Walking', 'pending',
     now()-'1 day'::interval, now()-'1 day'::interval),

    -- Owner 03 / Minder 03: completed (past)
    (r5,  '00000001-0033-4000-8001-000000000033', mp3,
     now()-'60 days'::interval, now()-'57 days'::interval, 4320,
     'Holiday trip.', 'Luna is shy at first.', 'Pet Sitting', 'confirmed',
     now()-'65 days'::interval, now()-'60 days'::interval),

    -- Owner 03 / Minder 04: completed (past) — different minder
    (r6,  '00000001-0033-4000-8001-000000000033', mp4,
     now()-'7 days'::interval, now()-'6 days'::interval, 1440,
     'Quick trip.', 'Milo needs walks morning and evening.', 'Pet Sitting', 'confirmed',
     now()-'10 days'::interval, now()-'7 days'::interval),

    -- Owner 04 / Minder 04: cancelled
    (r7,  '00000001-0034-4000-8001-000000000034', mp4,
     now()+'5 days'::interval, null, 180,
     'Dog walk.', null, 'Walking', 'cancelled',
     now()-'5 days'::interval, now()-'2 days'::interval),

    -- Owner 04 / Minder 05: confirmed upcoming
    (r8,  '00000001-0034-4000-8001-000000000034', mp5,
     now()+'21 days'::interval, now()+'24 days'::interval, 4320,
     'Long weekend.', 'Charlie and Noodle are best friends.', 'Pet Sitting', 'confirmed',
     now()-'2 days'::interval, now()-'2 days'::interval),

    -- Owner 05 / Minder 05: completed (past)
    (r9,  '00000001-0035-4000-8001-000000000035', mp5,
     now()-'45 days'::interval, now()-'44 days'::interval, 1440,
     'Day trip.', 'Keep Pepper and Oliver separate at feeding.', 'Pet Sitting', 'confirmed',
     now()-'50 days'::interval, now()-'45 days'::interval),

    -- Owner 05 / Minder 01: declined
    (r10, '00000001-0035-4000-8001-000000000035', mp1,
     now()+'10 days'::interval, null, 60,
     'Short afternoon walk.', null, 'Walking', 'declined',
     now()-'3 days'::interval, now()-'1 day'::interval)
  ON CONFLICT (id) DO NOTHING;

  -- ---- bookings ----
  INSERT INTO public.bookings (
    id, request_id, owner_id, minder_id,
    start_datetime, end_datetime,
    care_instructions, cancellation_deadline, status, created_at, updated_at
  ) VALUES
    -- bk1: completed
    (bk1, r1, '00000001-0031-4000-8001-000000000031', mp1,
     now()-'30 days'::interval, now()-'28 days'::interval,
     'Feed twice daily, no table scraps.',
     now()-'32 days'::interval, 'completed', now()-'30 days'::interval, now()-'28 days'::interval),

    -- bk2: confirmed upcoming
    (bk2, r2, '00000001-0031-4000-8001-000000000031', mp2,
     now()+'7 days'::interval, now()+'9 days'::interval,
     'Fresh water always available.',
     now()+'5 days'::interval, 'confirmed', now()-'3 days'::interval, now()-'3 days'::interval),

    -- bk3: completed
    (bk3, r3, '00000001-0032-4000-8001-000000000032', mp2,
     now()-'14 days'::interval, now()-'13 days'::interval,
     'Buddy is friendly with other dogs.',
     now()-'16 days'::interval, 'completed', now()-'14 days'::interval, now()-'13 days'::interval),

    -- bk4 (skip — r4 is pending, no booking yet)

    -- bk5: completed
    (bk5, r5, '00000001-0033-4000-8001-000000000033', mp3,
     now()-'60 days'::interval, now()-'57 days'::interval,
     'Luna is shy at first.',
     now()-'62 days'::interval, 'completed', now()-'60 days'::interval, now()-'57 days'::interval),

    -- bk6: completed
    (bk6, r6, '00000001-0033-4000-8001-000000000033', mp4,
     now()-'7 days'::interval, now()-'6 days'::interval,
     'Milo needs walks morning and evening.',
     now()-'9 days'::interval, 'completed', now()-'7 days'::interval, now()-'6 days'::interval),

    -- bk7 (skip — r7 is cancelled, no booking)

    -- bk7: confirmed upcoming (r8)
    (bk7, r8, '00000001-0034-4000-8001-000000000034', mp5,
     now()+'21 days'::interval, now()+'24 days'::interval,
     'Charlie and Noodle are best friends.',
     now()+'19 days'::interval, 'confirmed', now()-'2 days'::interval, now()-'2 days'::interval),

    -- bk8: completed
    (bk8, r9, '00000001-0035-4000-8001-000000000035', mp5,
     now()-'45 days'::interval, now()-'44 days'::interval,
     'Keep Pepper and Oliver separate at feeding.',
     now()-'47 days'::interval, 'completed', now()-'45 days'::interval, now()-'44 days'::interval)
  ON CONFLICT (id) DO NOTHING;

  -- ---- booking_pets ----
  INSERT INTO public.booking_pets (booking_id, pet_id)
  VALUES
    (bk1, 'a0000031-0001-4000-8001-000000000001'), -- Biscuit (dog)
    (bk1, 'a0000031-0002-4000-8001-000000000002'), -- Mittens (cat)
    (bk2, 'a0000031-0001-4000-8001-000000000001'), -- Biscuit
    (bk3, 'a0000032-0001-4000-8001-000000000001'), -- Buddy
    (bk5, 'a0000033-0002-4000-8001-000000000002'), -- Luna
    (bk6, 'a0000033-0001-4000-8001-000000000001'), -- Milo
    (bk7, 'a0000034-0001-4000-8001-000000000001'), -- Charlie
    (bk7, 'a0000034-0002-4000-8001-000000000002'), -- Noodle
    (bk8, 'a0000035-0001-4000-8001-000000000001'), -- Pepper
    (bk8, 'a0000035-0002-4000-8001-000000000002')  -- Oliver
  ON CONFLICT DO NOTHING;

END $$;

-- ---------------------------------------------------------------------------
-- 6. Reviews — owners review minders for completed bookings
-- ---------------------------------------------------------------------------
INSERT INTO public.reviews (
  reviewer_id, reviewee_id, booking_id,
  rating, comment, is_moderated, created_at, updated_at
)
SELECT
  v.reviewer_id::uuid,
  v.reviewee_id::uuid,
  v.booking_id::uuid,
  v.rating,
  v.comment,
  true,
  now() - v.ago::interval,
  now() - v.ago::interval
FROM (VALUES
  -- Owner 01 reviews Minder 01 (bk1)
  ('00000001-0031-4000-8001-000000000031',
   (SELECT user_id FROM public.minder_profiles WHERE id IN
     (SELECT minder_id FROM public.bookings WHERE id = 'c0000031-0001-4000-8001-000000000001')),
   'c0000031-0001-4000-8001-000000000001',
   5, 'Biscuit and Mittens were so well looked after. Regular updates and photos all weekend.', '28 days'),

  -- Owner 02 reviews Minder 02 (bk3)
  ('00000001-0032-4000-8001-000000000032',
   (SELECT user_id FROM public.minder_profiles WHERE id IN
     (SELECT minder_id FROM public.bookings WHERE id = 'c0000032-0001-4000-8001-000000000001')),
   'c0000032-0001-4000-8001-000000000001',
   4, 'Buddy was happy and well exercised. Would recommend.', '13 days'),

  -- Owner 03 reviews Minder 03 (bk5)
  ('00000001-0033-4000-8001-000000000033',
   (SELECT user_id FROM public.minder_profiles WHERE id IN
     (SELECT minder_id FROM public.bookings WHERE id = 'c0000033-0001-4000-8001-000000000001')),
   'c0000033-0001-4000-8001-000000000001',
   5, 'Luna warmed up to them quickly. Great care over the 3 days.', '57 days'),

  -- Owner 03 reviews Minder 04 (bk6)
  ('00000001-0033-4000-8001-000000000033',
   (SELECT user_id FROM public.minder_profiles WHERE id IN
     (SELECT minder_id FROM public.bookings WHERE id = 'c0000033-0002-4000-8001-000000000002')),
   'c0000033-0002-4000-8001-000000000002',
   4, 'Milo was walked on schedule both days. Easy to coordinate with.', '6 days'),

  -- Owner 05 reviews Minder 05 (bk8)
  ('00000001-0035-4000-8001-000000000035',
   (SELECT user_id FROM public.minder_profiles WHERE id IN
     (SELECT minder_id FROM public.bookings WHERE id = 'c0000035-0001-4000-8001-000000000001')),
   'c0000035-0001-4000-8001-000000000001',
   5, 'Pepper and Oliver were well cared for separately as requested. Very attentive.', '44 days')
) AS v(reviewer_id, reviewee_id, booking_id, rating, comment, ago)
WHERE v.reviewee_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.reviews r
    WHERE r.reviewer_id = v.reviewer_id::uuid
      AND r.booking_id  = v.booking_id::uuid
  );
