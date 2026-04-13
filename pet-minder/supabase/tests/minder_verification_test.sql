-- =============================================================================
-- Automated Minder Verification — SQL Test Suite
-- Run in: Supabase SQL Editor (dev/test project only, NOT production)
--
-- Results appear as RAISE NOTICE output in the SQL Editor messages panel.
-- =============================================================================

-- Step 1: session-scoped assert helper (auto-dropped when connection closes)
CREATE OR REPLACE FUNCTION pg_temp.assert(p_label text, p_ok boolean)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_ok THEN
    RAISE NOTICE '[PASS] %', p_label;
  ELSE
    RAISE NOTICE '[FAIL] %', p_label;
  END IF;
END;
$$;

-- Step 2: main test body
DO $$
DECLARE
  v_test_user_id    uuid := 'eeeeeeee-0001-4000-8001-000000000001'::uuid;
  v_owner_user_id   uuid := 'eeeeeeee-0002-4000-8001-000000000002'::uuid;
  v_test_profile_id uuid;
  v_checklist       record;
  v_is_verified     boolean;
  v_booking_id      uuid;
  v_request_id      uuid;
  v_count           int;
  i                 int;
BEGIN
  RAISE NOTICE '=== Minder Verification Test Suite ===';

  -- =========================================================================
  -- SETUP
  -- =========================================================================

  -- auth.users — minder (email confirmed)
  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_sso_user
  ) VALUES (
    v_test_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'test.verif.minder@example.test',
    crypt('TestPass123!', gen_salt('bf', 4)),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}', false
  ) ON CONFLICT (id) DO NOTHING;

  -- auth.users — owner
  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_sso_user
  ) VALUES (
    v_owner_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'test.verif.owner@example.test',
    crypt('TestPass123!', gen_salt('bf', 4)),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}', false
  ) ON CONFLICT (id) DO NOTHING;

  -- public.users
  INSERT INTO public.users (id, email, full_name, is_active)
  VALUES (v_test_user_id, 'test.verif.minder@example.test', 'Test Verif Minder', true)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  INSERT INTO public.users (id, email, full_name, is_active)
  VALUES (v_owner_user_id, 'test.verif.owner@example.test', 'Test Verif Owner', true)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  -- roles
  INSERT INTO public.roles (user_id, role_type) VALUES (v_test_user_id, 'minder')
  ON CONFLICT DO NOTHING;
  INSERT INTO public.roles (user_id, role_type) VALUES (v_owner_user_id, 'owner')
  ON CONFLICT DO NOTHING;

  -- minder_profiles — backdated 7 months so account_age_ok passes
  INSERT INTO public.minder_profiles (
    user_id, service_description, supported_pet_types, supported_pet_sizes,
    service_pricing, is_verified, average_rating, visible_in_search,
    location_name, created_at, updated_at
  ) VALUES (
    v_test_user_id,
    'Verified test minder description for automated testing.',
    ARRAY['dog','cat'],
    ARRAY['small','medium'],
    '15',
    false,
    4.5,
    true,
    'Test Location',
    now() - interval '7 months',
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
    SET service_description = EXCLUDED.service_description,
        supported_pet_types = EXCLUDED.supported_pet_types,
        service_pricing     = EXCLUDED.service_pricing,
        is_verified         = false,
        average_rating      = 4.5,
        visible_in_search   = true,
        created_at          = now() - interval '7 months',
        deleted_at          = NULL;

  SELECT id INTO v_test_profile_id
  FROM public.minder_profiles
  WHERE user_id = v_test_user_id AND deleted_at IS NULL;

  RAISE NOTICE 'Test profile ID: %', v_test_profile_id;

  -- =========================================================================
  -- GROUP 1: checklist baseline (no completed bookings yet)
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '--- Group 1: Checklist baseline ---';

  SELECT * INTO v_checklist
  FROM public.get_minder_verification_checklist(v_test_profile_id);

  PERFORM pg_temp.assert('1.1 email_confirmed = true',                  v_checklist.email_confirmed = true);
  PERFORM pg_temp.assert('1.2 profile_complete = true',                 v_checklist.profile_complete = true);
  PERFORM pg_temp.assert('1.3 account_age_ok = true (7 months old)',    v_checklist.account_age_ok = true);
  PERFORM pg_temp.assert('1.4 rating_ok = true (4.5)',                  v_checklist.rating_ok = true);
  PERFORM pg_temp.assert('1.5 completed_bookings_ok = false (0 / 20)',  v_checklist.completed_bookings_ok = false);
  PERFORM pg_temp.assert('1.6 recent_cancellations_ok = true (0)',      v_checklist.recent_cancellations_ok = true);
  PERFORM pg_temp.assert('1.7 visible_in_search_ok = true',             v_checklist.visible_in_search_ok = true);
  PERFORM pg_temp.assert('1.8 is_verified = false (bookings short)',    v_checklist.is_verified = false);
  PERFORM pg_temp.assert('1.9 completed_bookings_count = 0',            v_checklist.completed_bookings_count = 0);
  PERFORM pg_temp.assert('1.10 average_rating = 4.5',                   v_checklist.average_rating = 4.5);

  -- =========================================================================
  -- GROUP 2: profile_complete edge cases
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '--- Group 2: profile_complete edge cases ---';

  UPDATE public.minder_profiles SET service_description = NULL WHERE id = v_test_profile_id;
  SELECT * INTO v_checklist FROM public.get_minder_verification_checklist(v_test_profile_id);
  PERFORM pg_temp.assert('2.1 profile_complete = false (null description)', v_checklist.profile_complete = false);

  UPDATE public.minder_profiles
    SET service_description = 'Restored', supported_pet_types = ARRAY[]::text[]
    WHERE id = v_test_profile_id;
  SELECT * INTO v_checklist FROM public.get_minder_verification_checklist(v_test_profile_id);
  PERFORM pg_temp.assert('2.2 profile_complete = false (empty pet types)',  v_checklist.profile_complete = false);

  UPDATE public.minder_profiles
    SET supported_pet_types = ARRAY['dog'], service_pricing = NULL
    WHERE id = v_test_profile_id;
  SELECT * INTO v_checklist FROM public.get_minder_verification_checklist(v_test_profile_id);
  PERFORM pg_temp.assert('2.3 profile_complete = false (null pricing)',     v_checklist.profile_complete = false);

  -- Restore
  UPDATE public.minder_profiles
    SET service_description = 'Full profile for testing.',
        supported_pet_types = ARRAY['dog','cat'],
        service_pricing     = '15'
    WHERE id = v_test_profile_id;

  -- =========================================================================
  -- GROUP 3: account_age_ok boundary
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '--- Group 3: account_age_ok ---';

  UPDATE public.minder_profiles SET created_at = now() - interval '5 months' WHERE id = v_test_profile_id;
  SELECT * INTO v_checklist FROM public.get_minder_verification_checklist(v_test_profile_id);
  PERFORM pg_temp.assert('3.1 account_age_ok = false (5 months old)', v_checklist.account_age_ok = false);

  UPDATE public.minder_profiles SET created_at = now() - interval '7 months' WHERE id = v_test_profile_id;
  SELECT * INTO v_checklist FROM public.get_minder_verification_checklist(v_test_profile_id);
  PERFORM pg_temp.assert('3.2 account_age_ok = true (7 months old)',  v_checklist.account_age_ok = true);

  -- =========================================================================
  -- GROUP 4: rating_ok boundary
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '--- Group 4: rating_ok ---';

  UPDATE public.minder_profiles SET average_rating = 3.99 WHERE id = v_test_profile_id;
  SELECT * INTO v_checklist FROM public.get_minder_verification_checklist(v_test_profile_id);
  PERFORM pg_temp.assert('4.1 rating_ok = false (3.99)',       v_checklist.rating_ok = false);

  UPDATE public.minder_profiles SET average_rating = 4.00 WHERE id = v_test_profile_id;
  SELECT * INTO v_checklist FROM public.get_minder_verification_checklist(v_test_profile_id);
  PERFORM pg_temp.assert('4.2 rating_ok = true (4.00 boundary)', v_checklist.rating_ok = true);

  UPDATE public.minder_profiles SET average_rating = NULL WHERE id = v_test_profile_id;
  SELECT * INTO v_checklist FROM public.get_minder_verification_checklist(v_test_profile_id);
  PERFORM pg_temp.assert('4.3 rating_ok = false (NULL)',       v_checklist.rating_ok = false);

  -- Restore
  UPDATE public.minder_profiles SET average_rating = 4.5 WHERE id = v_test_profile_id;

  -- =========================================================================
  -- GROUP 5: visible_in_search_ok
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '--- Group 5: visible_in_search_ok ---';

  UPDATE public.minder_profiles SET visible_in_search = false WHERE id = v_test_profile_id;
  SELECT * INTO v_checklist FROM public.get_minder_verification_checklist(v_test_profile_id);
  PERFORM pg_temp.assert('5.1 visible_in_search_ok = false when hidden', v_checklist.visible_in_search_ok = false);

  UPDATE public.minder_profiles SET visible_in_search = true WHERE id = v_test_profile_id;

  -- =========================================================================
  -- GROUP 6: completed_bookings_ok
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '--- Group 6: completed_bookings_ok ---';

  -- Add 19 completed bookings (one short)
  FOR i IN 1..19 LOOP
    v_request_id := gen_random_uuid();
    v_booking_id := gen_random_uuid();
    INSERT INTO public.booking_requests (
      id, owner_id, minder_id,
      requested_datetime, requested_end_datetime, duration_minutes,
      message, care_instructions, status, created_at, updated_at
    ) VALUES (
      v_request_id, v_owner_user_id, v_test_profile_id,
      now() - make_interval(days => i),
      now() - make_interval(days => i) + interval '2 hours',
      120, 'Test booking ' || i, 'Test care.', 'accepted',
      now() - make_interval(days => i), now() - make_interval(days => i)
    );
    INSERT INTO public.bookings (
      id, request_id, owner_id, minder_id,
      start_datetime, end_datetime, care_instructions,
      cancellation_deadline, status, created_at, updated_at
    ) VALUES (
      v_booking_id, v_request_id, v_owner_user_id, v_test_profile_id,
      now() - make_interval(days => i),
      now() - make_interval(days => i) + interval '2 hours',
      'Test care.',
      now() - make_interval(days => i + 2),
      'completed',
      now() - make_interval(days => i), now() - make_interval(days => i)
    );
  END LOOP;

  SELECT * INTO v_checklist FROM public.get_minder_verification_checklist(v_test_profile_id);
  PERFORM pg_temp.assert('6.1 completed_bookings_count = 19',          v_checklist.completed_bookings_count = 19);
  PERFORM pg_temp.assert('6.2 completed_bookings_ok = false (19/20)',  v_checklist.completed_bookings_ok = false);

  -- Add the 20th booking
  v_request_id := gen_random_uuid();
  v_booking_id := gen_random_uuid();
  INSERT INTO public.booking_requests (
    id, owner_id, minder_id,
    requested_datetime, requested_end_datetime, duration_minutes,
    message, care_instructions, status, created_at, updated_at
  ) VALUES (
    v_request_id, v_owner_user_id, v_test_profile_id,
    now() - interval '25 days',
    now() - interval '25 days' + interval '2 hours',
    120, 'Test booking 20', 'Test care.', 'accepted',
    now() - interval '25 days', now() - interval '25 days'
  );
  INSERT INTO public.bookings (
    id, request_id, owner_id, minder_id,
    start_datetime, end_datetime, care_instructions,
    cancellation_deadline, status, created_at, updated_at
  ) VALUES (
    v_booking_id, v_request_id, v_owner_user_id, v_test_profile_id,
    now() - interval '25 days',
    now() - interval '25 days' + interval '2 hours',
    'Test care.',
    now() - interval '27 days',
    'completed',
    now() - interval '25 days', now() - interval '25 days'
  );

  SELECT * INTO v_checklist FROM public.get_minder_verification_checklist(v_test_profile_id);
  PERFORM pg_temp.assert('6.3 completed_bookings_count = 20',         v_checklist.completed_bookings_count = 20);
  PERFORM pg_temp.assert('6.4 completed_bookings_ok = true (20/20)',  v_checklist.completed_bookings_ok = true);
  PERFORM pg_temp.assert('6.5 is_verified = true (all criteria met)', v_checklist.is_verified = true);

  -- =========================================================================
  -- GROUP 7: compute_minder_verified helper
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '--- Group 7: compute_minder_verified ---';

  v_is_verified := public.compute_minder_verified(v_test_profile_id);
  PERFORM pg_temp.assert('7.1 returns true when all criteria met', v_is_verified = true);

  UPDATE public.minder_profiles SET average_rating = 3.5 WHERE id = v_test_profile_id;
  v_is_verified := public.compute_minder_verified(v_test_profile_id);
  PERFORM pg_temp.assert('7.2 returns false when rating drops below 4.0', v_is_verified = false);
  UPDATE public.minder_profiles SET average_rating = 4.5 WHERE id = v_test_profile_id;

  -- =========================================================================
  -- GROUP 8: update_minder_verification writes to the profile row
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '--- Group 8: update_minder_verification ---';

  UPDATE public.minder_profiles SET is_verified = false WHERE id = v_test_profile_id;
  PERFORM public.update_minder_verification(v_test_profile_id);
  SELECT is_verified INTO v_is_verified FROM public.minder_profiles WHERE id = v_test_profile_id;
  PERFORM pg_temp.assert('8.1 sets is_verified = true when criteria met', v_is_verified = true);

  UPDATE public.minder_profiles SET average_rating = 2.0 WHERE id = v_test_profile_id;
  PERFORM public.update_minder_verification(v_test_profile_id);
  SELECT is_verified INTO v_is_verified FROM public.minder_profiles WHERE id = v_test_profile_id;
  PERFORM pg_temp.assert('8.2 sets is_verified = false after rating drops', v_is_verified = false);

  -- Restore
  UPDATE public.minder_profiles SET average_rating = 4.5 WHERE id = v_test_profile_id;
  PERFORM public.update_minder_verification(v_test_profile_id);

  -- =========================================================================
  -- GROUP 9: trg_booking_verification_change trigger
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '--- Group 9: booking trigger (status → completed) ---';

  v_request_id := gen_random_uuid();
  v_booking_id := gen_random_uuid();
  INSERT INTO public.booking_requests (
    id, owner_id, minder_id,
    requested_datetime, requested_end_datetime, duration_minutes,
    message, care_instructions, status, created_at, updated_at
  ) VALUES (
    v_request_id, v_owner_user_id, v_test_profile_id,
    now() - interval '5 days',
    now() - interval '5 days' + interval '2 hours',
    120, 'Trigger test request', 'Care.', 'accepted',
    now() - interval '5 days', now() - interval '5 days'
  );
  INSERT INTO public.bookings (
    id, request_id, owner_id, minder_id,
    start_datetime, end_datetime, care_instructions,
    cancellation_deadline, status, created_at, updated_at
  ) VALUES (
    v_booking_id, v_request_id, v_owner_user_id, v_test_profile_id,
    now() - interval '5 days',
    now() - interval '5 days' + interval '2 hours',
    'Care.',
    now() - interval '7 days',
    'confirmed',
    now() - interval '5 days', now() - interval '5 days'
  );

  UPDATE public.minder_profiles SET is_verified = false WHERE id = v_test_profile_id;

  -- Trigger fires here
  UPDATE public.bookings SET status = 'completed', updated_at = now() WHERE id = v_booking_id;

  SELECT is_verified INTO v_is_verified FROM public.minder_profiles WHERE id = v_test_profile_id;
  PERFORM pg_temp.assert('9.1 trigger recomputes is_verified → true on booking completed', v_is_verified = true);

  -- =========================================================================
  -- GROUP 10: recent_cancellations_ok
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '--- Group 10: recent_cancellations_ok ---';

  FOR i IN 1..3 LOOP
    v_request_id := gen_random_uuid();
    v_booking_id := gen_random_uuid();
    INSERT INTO public.booking_requests (
      id, owner_id, minder_id,
      requested_datetime, requested_end_datetime, duration_minutes,
      message, care_instructions, status, created_at, updated_at
    ) VALUES (
      v_request_id, v_owner_user_id, v_test_profile_id,
      now() + make_interval(days => i + 1),
      now() + make_interval(days => i + 1) + interval '2 hours',
      120, 'Cancel test ' || i, 'Care.', 'accepted',
      now(), now()
    );
    INSERT INTO public.bookings (
      id, request_id, owner_id, minder_id,
      start_datetime, end_datetime, care_instructions,
      cancellation_deadline, status, created_at, updated_at
    ) VALUES (
      v_booking_id, v_request_id, v_owner_user_id, v_test_profile_id,
      now() + make_interval(days => i + 1),
      now() + make_interval(days => i + 1) + interval '2 hours',
      'Care.',
      now() + make_interval(days => i),
      'pending',
      now(), now()
    );
    -- Cancel as the minder (trigger fires on each UPDATE)
    UPDATE public.bookings
    SET status = 'cancelled',
        cancelled_at = now(),
        cancelled_by_user_id = v_test_user_id,
        updated_at = now()
    WHERE id = v_booking_id;
  END LOOP;

  SELECT * INTO v_checklist FROM public.get_minder_verification_checklist(v_test_profile_id);
  PERFORM pg_temp.assert('10.1 recent_minder_cancellations_count = 3', v_checklist.recent_minder_cancellations_count = 3);
  PERFORM pg_temp.assert('10.2 recent_cancellations_ok = false',        v_checklist.recent_cancellations_ok = false);
  PERFORM pg_temp.assert('10.3 is_verified = false',                    v_checklist.is_verified = false);

  SELECT is_verified INTO v_is_verified FROM public.minder_profiles WHERE id = v_test_profile_id;
  PERFORM pg_temp.assert('10.4 booking trigger set is_verified = false on profile row', v_is_verified = false);

  -- =========================================================================
  -- GROUP 11: trg_review_verification_change trigger
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '--- Group 11: review trigger ---';

  -- Re-attribute those cancellations to the owner so cancellations_ok passes again
  UPDATE public.bookings
  SET cancelled_by_user_id = v_owner_user_id, updated_at = now()
  WHERE minder_id = v_test_profile_id
    AND status = 'cancelled'
    AND cancelled_by_user_id = v_test_user_id;

  SELECT * INTO v_checklist FROM public.get_minder_verification_checklist(v_test_profile_id);
  PERFORM pg_temp.assert('11.0 precondition: recent_cancellations_ok = true after re-attribution',
                          v_checklist.recent_cancellations_ok = true);

  -- Drop rating so trigger effect is visible
  UPDATE public.minder_profiles SET average_rating = 2.0, is_verified = false WHERE id = v_test_profile_id;

  -- Need a completed booking to satisfy reviews FK
  SELECT id INTO v_booking_id
  FROM public.bookings
  WHERE minder_id = v_test_profile_id AND status = 'completed'
  LIMIT 1;

  IF v_booking_id IS NOT NULL THEN
    INSERT INTO public.reviews (
      reviewer_id, reviewee_id, booking_id,
      rating, comment, is_moderated, created_at, updated_at
    ) VALUES (
      v_owner_user_id, v_test_user_id, v_booking_id,
      5, 'Excellent — trigger test review', true, now(), now()
    )
    ON CONFLICT DO NOTHING;

    -- Trigger fires on INSERT above; check profile was updated
    SELECT average_rating, is_verified INTO v_checklist
    FROM public.minder_profiles
    WHERE id = v_test_profile_id;

    PERFORM pg_temp.assert('11.1 review trigger updated average_rating >= 4.0',
                            v_checklist.average_rating IS NOT NULL AND v_checklist.average_rating >= 4.0);
    PERFORM pg_temp.assert('11.2 review trigger recomputed is_verified = true',
                            v_checklist.is_verified = true);
  ELSE
    RAISE NOTICE '[SKIP] 11.1/11.2 — no completed booking available for review FK';
  END IF;

  -- =========================================================================
  -- GROUP 12: recompute_all_minder_verifications
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '--- Group 12: recompute_all_minder_verifications ---';

  v_count := public.recompute_all_minder_verifications();
  PERFORM pg_temp.assert('12.1 recompute_all returns count > 0', v_count > 0);
  RAISE NOTICE '      Profiles recomputed: %', v_count;

  -- =========================================================================
  -- GROUP 13: soft-deleted profile excluded
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '--- Group 13: soft-deleted profile ---';

  UPDATE public.minder_profiles SET deleted_at = now() WHERE id = v_test_profile_id;

  SELECT * INTO v_checklist FROM public.get_minder_verification_checklist(v_test_profile_id);
  PERFORM pg_temp.assert('13.1 checklist returns no row for deleted profile',
                          v_checklist IS NULL OR v_checklist.minder_profile_id IS NULL);

  v_is_verified := public.compute_minder_verified(v_test_profile_id);
  PERFORM pg_temp.assert('13.2 compute_minder_verified = false for deleted profile', v_is_verified = false);

  -- Restore for clean teardown
  UPDATE public.minder_profiles SET deleted_at = NULL WHERE id = v_test_profile_id;

  -- =========================================================================
  -- TEARDOWN
  -- =========================================================================
  DELETE FROM public.reviews WHERE reviewer_id = v_owner_user_id AND reviewee_id = v_test_user_id;
  DELETE FROM public.bookings WHERE minder_id = v_test_profile_id OR owner_id = v_owner_user_id;
  DELETE FROM public.booking_requests WHERE minder_id = v_test_profile_id OR owner_id = v_owner_user_id;
  DELETE FROM public.minder_profiles WHERE user_id = v_test_user_id;
  DELETE FROM public.roles WHERE user_id IN (v_test_user_id, v_owner_user_id);
  DELETE FROM public.users WHERE id IN (v_test_user_id, v_owner_user_id);
  DELETE FROM auth.users WHERE id IN (v_test_user_id, v_owner_user_id);

  RAISE NOTICE '';
  RAISE NOTICE '=== Done. Check NOTICE output above for [PASS]/[FAIL] results. ===';
END;
$$;
