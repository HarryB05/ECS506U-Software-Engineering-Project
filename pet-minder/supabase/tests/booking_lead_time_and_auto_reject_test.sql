-- =============================================================================
-- Booking Lead Time + Auto-Rejection SQL Test Suite
-- Run in: Supabase SQL Editor (dev/test project only, NOT production)
-- =============================================================================

create or replace function pg_temp.assert(p_label text, p_ok boolean)
returns void language plpgsql as $$
begin
  if p_ok then
    raise notice '[PASS] %', p_label;
  else
    raise notice '[FAIL] %', p_label;
  end if;
end;
$$;

do $$
declare
  v_owner_user_id uuid := 'ffffffff-1001-4000-8001-000000000001'::uuid;
  v_minder_user_id uuid := 'ffffffff-1002-4000-8001-000000000002'::uuid;
  v_minder_profile_id uuid;
  v_pet_id uuid;
  v_request_id uuid;
  v_short_notice boolean;
  v_raised boolean;
  v_pet_id_cat uuid;
  v_pet_id_bird uuid;
  v_pet_id_2 uuid;
  v_pet_id_3 uuid;
  v_pet_id_4 uuid;
  v_before_declined int;
  v_after_declined int;
  v_auto_rejected_at timestamptz;
begin
  raise notice '=== Booking Lead Time + Auto-Rejection Test Suite ===';

  insert into auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_sso_user
  ) values (
    v_owner_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'test.booking.owner@example.test',
    crypt('TestPass123!', gen_salt('bf', 4)),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}', false
  ) on conflict (id) do nothing;

  insert into auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_sso_user
  ) values (
    v_minder_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'test.booking.minder@example.test',
    crypt('TestPass123!', gen_salt('bf', 4)),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}', false
  ) on conflict (id) do nothing;

  insert into public.users (id, email, full_name, is_active)
  values (v_owner_user_id, 'test.booking.owner@example.test', 'Test Booking Owner', true)
  on conflict (id) do update set full_name = excluded.full_name;

  insert into public.users (id, email, full_name, is_active)
  values (v_minder_user_id, 'test.booking.minder@example.test', 'Test Booking Minder', true)
  on conflict (id) do update set full_name = excluded.full_name;

  insert into public.roles (user_id, role_type)
  values (v_owner_user_id, 'owner')
  on conflict do nothing;

  insert into public.roles (user_id, role_type)
  values (v_minder_user_id, 'minder')
  on conflict do nothing;

  insert into public.minder_profiles (
    user_id,
    service_description,
    supported_pet_types,
    supported_pet_sizes,
    service_pricing,
    location_name,
    visible_in_search
  ) values (
    v_minder_user_id,
    'Test minder profile used by booking lead-time tests.',
    array['dog', 'cat'],
    array['small', 'medium'],
    '18',
    'Test Location',
    true
  )
  on conflict (user_id) do update
    set deleted_at = null,
        service_description = excluded.service_description,
        service_pricing = excluded.service_pricing;

  select id into v_minder_profile_id
  from public.minder_profiles
  where user_id = v_minder_user_id
    and deleted_at is null;

  insert into public.pet_profiles (
    owner_id,
    name,
    pet_type,
    pet_size,
    age,
    medical_info,
    dietary_requirements
  ) values (
    v_owner_user_id,
    'Test Pup',
    'dog',
    'medium',
    3,
    null,
    null
  )
  returning id into v_pet_id;

  insert into public.pet_profiles (
    owner_id,
    name,
    pet_type,
    pet_size,
    age,
    medical_info,
    dietary_requirements
  ) values
    (v_owner_user_id, 'Test Cat', 'cat', 'small', 2, null, null),
    (v_owner_user_id, 'Test Bird', 'bird', 'small', 1, null, null),
    (v_owner_user_id, 'Test Pup 2', 'dog', 'small', 4, null, null),
    (v_owner_user_id, 'Test Pup 3', 'dog', 'small', 5, null, null),
    (v_owner_user_id, 'Test Pup 4', 'dog', 'small', 6, null, null);

  select id into v_pet_id_cat
  from public.pet_profiles
  where owner_id = v_owner_user_id and name = 'Test Cat'
  order by created_at desc
  limit 1;

  select id into v_pet_id_bird
  from public.pet_profiles
  where owner_id = v_owner_user_id and name = 'Test Bird'
  order by created_at desc
  limit 1;

  select id into v_pet_id_2
  from public.pet_profiles
  where owner_id = v_owner_user_id and name = 'Test Pup 2'
  order by created_at desc
  limit 1;

  select id into v_pet_id_3
  from public.pet_profiles
  where owner_id = v_owner_user_id and name = 'Test Pup 3'
  order by created_at desc
  limit 1;

  select id into v_pet_id_4
  from public.pet_profiles
  where owner_id = v_owner_user_id and name = 'Test Pup 4'
  order by created_at desc
  limit 1;

  perform set_config('request.jwt.claim.sub', v_owner_user_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  -- 1) Walking < 3h should be rejected.
  begin
    perform public.bookings_create_request(
      v_minder_profile_id,
      now() + interval '2 hours',
      60,
      'Short notice walk',
      null,
      array[v_pet_id],
      null,
      'Walking'
    );
    v_raised := false;
  exception
    when others then
      v_raised := position('at least 3 hours notice' in sqlerrm) > 0;
  end;
  perform pg_temp.assert('1.1 Walking under 3h is blocked', v_raised);

  -- 1.2) Walking only allows dogs/cats.
  begin
    perform public.bookings_create_request(
      v_minder_profile_id,
      now() + interval '26 hours',
      60,
      'Walking with bird',
      null,
      array[v_pet_id, v_pet_id_bird],
      null,
      'Walking'
    );
    v_raised := false;
  exception
    when others then
      v_raised := position('only support dogs and cats' in sqlerrm) > 0;
  end;
  perform pg_temp.assert('1.2 Walking blocks non dog/cat pets', v_raised);

  -- 1.3) Walking allows at most 4 pets.
  begin
    perform public.bookings_create_request(
      v_minder_profile_id,
      now() + interval '26 hours',
      60,
      'Walking with too many pets',
      null,
      array[v_pet_id, v_pet_id_cat, v_pet_id_2, v_pet_id_3, v_pet_id_4],
      null,
      'Walking'
    );
    v_raised := false;
  exception
    when others then
      v_raised := position('at most 4 pets' in sqlerrm) > 0;
  end;
  perform pg_temp.assert('1.3 Walking blocks more than 4 pets', v_raised);

  -- 1.4) Walking with up to 4 dog/cat pets succeeds.
  v_request_id := public.bookings_create_request(
    v_minder_profile_id,
    now() + interval '26 hours',
    60,
    'Walking valid pets',
    null,
    array[v_pet_id, v_pet_id_cat, v_pet_id_2, v_pet_id_3],
    null,
    'Walking'
  );
  perform pg_temp.assert('1.4 Walking with <=4 dog/cat pets is allowed', v_request_id is not null);

  -- 2) Pet sitting within 48h is allowed but flagged as short notice.
  v_request_id := public.bookings_create_request(
    v_minder_profile_id,
    now() + interval '12 hours',
    120,
    'Pet sitting short notice',
    null,
    array[v_pet_id],
    null,
    'Pet Sitting'
  );

  select br.short_notice_warning
  into v_short_notice
  from public.booking_requests br
  where br.id = v_request_id;

  perform pg_temp.assert('2.1 Pet sitting short notice is flagged', v_short_notice = true);

  -- 3) Pending requests older than 24h are auto-declined.
  update public.booking_requests
  set created_at = now() - interval '25 hours'
  where id = v_request_id;

  select count(*)
  into v_before_declined
  from public.booking_requests
  where id = v_request_id
    and status = 'declined';

  perform public.bookings_auto_reject_stale_requests(100);

  select count(*), max(auto_rejected_at)
  into v_after_declined, v_auto_rejected_at
  from public.booking_requests
  where id = v_request_id
    and status = 'declined';

  perform pg_temp.assert('3.1 Request auto-declined after 24h', v_before_declined = 0 and v_after_declined = 1);
  perform pg_temp.assert('3.2 auto_rejected_at is stamped', v_auto_rejected_at is not null);

  raise notice '=== Done. Check NOTICE output above for [PASS]/[FAIL] results. ===';
end;
$$;