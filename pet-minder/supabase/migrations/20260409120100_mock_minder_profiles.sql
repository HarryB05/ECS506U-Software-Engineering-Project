-- Seed: 30 mock minder profiles for search algorithm stress-testing.
-- Apply to dev/test environments only — do NOT run against production.
--
-- Creates rows in:
--   auth.users        (so the public.users FK is satisfied)
--   public.users      (display name + active flag)
--   public.roles      (minder role grant)
--   public.minder_profiles (the searchable profile)
--
-- All mock accounts share the password: TestPass123!
-- UUIDs follow the pattern 00000001-00XX-4000-8001-000000000001 (XX = 01-30).

-- ---------------------------------------------------------------------------
-- Step 1: auth.users  (uses pgcrypto, enabled by default in Supabase)
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
    ('00000001-0001-4000-8001-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.minder.01@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
    ('00000001-0002-4000-8001-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.minder.02@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
    ('00000001-0003-4000-8001-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.minder.03@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
    ('00000001-0004-4000-8001-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.minder.04@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
    ('00000001-0005-4000-8001-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.minder.05@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
    ('00000001-0006-4000-8001-000000000006','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.minder.06@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
    ('00000001-0007-4000-8001-000000000007','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.minder.07@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
    ('00000001-0008-4000-8001-000000000008','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.minder.08@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
    ('00000001-0009-4000-8001-000000000009','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.minder.09@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
    ('00000001-0010-4000-8001-000000000010','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.minder.10@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
    ('00000001-0011-4000-8001-000000000011','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.minder.11@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
    ('00000001-0012-4000-8001-000000000012','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.minder.12@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
    ('00000001-0013-4000-8001-000000000013','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.minder.13@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
    ('00000001-0014-4000-8001-000000000014','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.minder.14@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
    ('00000001-0015-4000-8001-000000000015','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.minder.15@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
    ('00000001-0016-4000-8001-000000000016','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.minder.16@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
    ('00000001-0017-4000-8001-000000000017','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.minder.17@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
    ('00000001-0018-4000-8001-000000000018','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.minder.18@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
    ('00000001-0019-4000-8001-000000000019','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.minder.19@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
    ('00000001-0020-4000-8001-000000000020','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.minder.20@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
    ('00000001-0021-4000-8001-000000000021','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.minder.21@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
    ('00000001-0022-4000-8001-000000000022','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.minder.22@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
    ('00000001-0023-4000-8001-000000000023','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.minder.23@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
    ('00000001-0024-4000-8001-000000000024','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.minder.24@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
    ('00000001-0025-4000-8001-000000000025','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.minder.25@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
    ('00000001-0026-4000-8001-000000000026','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.minder.26@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
    ('00000001-0027-4000-8001-000000000027','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.minder.27@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
    ('00000001-0028-4000-8001-000000000028','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.minder.28@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
    ('00000001-0029-4000-8001-000000000029','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.minder.29@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false),
    ('00000001-0030-4000-8001-000000000030','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mock.minder.30@example.com',_h,now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- ---------------------------------------------------------------------------
-- Step 2: public.users
-- (Supabase trigger may auto-create these rows; upsert is idempotent.)
-- ---------------------------------------------------------------------------
INSERT INTO public.users (id, email, full_name, is_active) VALUES
  ('00000001-0001-4000-8001-000000000001', 'mock.minder.01@example.com', 'Alice Thompson',  true),
  ('00000001-0002-4000-8001-000000000002', 'mock.minder.02@example.com', 'Ben Carter',      true),
  ('00000001-0003-4000-8001-000000000003', 'mock.minder.03@example.com', 'Charlotte Davis', true),
  ('00000001-0004-4000-8001-000000000004', 'mock.minder.04@example.com', 'David Wilson',    true),
  ('00000001-0005-4000-8001-000000000005', 'mock.minder.05@example.com', 'Emma Brown',      true),
  ('00000001-0006-4000-8001-000000000006', 'mock.minder.06@example.com', 'Finn O''Brien',   true),
  ('00000001-0007-4000-8001-000000000007', 'mock.minder.07@example.com', 'Grace Lee',       true),
  ('00000001-0008-4000-8001-000000000008', 'mock.minder.08@example.com', 'Hassan Ali',      true),
  ('00000001-0009-4000-8001-000000000009', 'mock.minder.09@example.com', 'Imogen Clark',    true),
  ('00000001-0010-4000-8001-000000000010', 'mock.minder.10@example.com', 'James Martin',    true),
  ('00000001-0011-4000-8001-000000000011', 'mock.minder.11@example.com', 'Kate Johnson',    true),
  ('00000001-0012-4000-8001-000000000012', 'mock.minder.12@example.com', 'Lucas White',     true),
  ('00000001-0013-4000-8001-000000000013', 'mock.minder.13@example.com', 'Maya Patel',      true),
  ('00000001-0014-4000-8001-000000000014', 'mock.minder.14@example.com', 'Nathan Scott',    true),
  ('00000001-0015-4000-8001-000000000015', 'mock.minder.15@example.com', 'Olivia Harris',   true),
  ('00000001-0016-4000-8001-000000000016', 'mock.minder.16@example.com', 'Patrick Walsh',   true),
  ('00000001-0017-4000-8001-000000000017', 'mock.minder.17@example.com', 'Quinn Roberts',   true),
  ('00000001-0018-4000-8001-000000000018', 'mock.minder.18@example.com', 'Rachel Green',    true),
  ('00000001-0019-4000-8001-000000000019', 'mock.minder.19@example.com', 'Samuel Turner',   true),
  ('00000001-0020-4000-8001-000000000020', 'mock.minder.20@example.com', 'Tara Singh',      true),
  ('00000001-0021-4000-8001-000000000021', 'mock.minder.21@example.com', 'Uma Foster',      true),
  ('00000001-0022-4000-8001-000000000022', 'mock.minder.22@example.com', 'Victor Hughes',   true),
  ('00000001-0023-4000-8001-000000000023', 'mock.minder.23@example.com', 'Willow Chen',     true),
  ('00000001-0024-4000-8001-000000000024', 'mock.minder.24@example.com', 'Xavier King',     true),
  ('00000001-0025-4000-8001-000000000025', 'mock.minder.25@example.com', 'Yasmin Ahmed',    true),
  ('00000001-0026-4000-8001-000000000026', 'mock.minder.26@example.com', 'Zara Collins',    true),
  ('00000001-0027-4000-8001-000000000027', 'mock.minder.27@example.com', 'Aaron Mitchell',  true),
  ('00000001-0028-4000-8001-000000000028', 'mock.minder.28@example.com', 'Beth Taylor',     true),
  ('00000001-0029-4000-8001-000000000029', 'mock.minder.29@example.com', 'Chris Anderson',  true),
  ('00000001-0030-4000-8001-000000000030', 'mock.minder.30@example.com', 'Diana Evans',     true)
ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      email     = EXCLUDED.email;

-- ---------------------------------------------------------------------------
-- Step 3: public.roles  (minder role for each mock account)
-- ---------------------------------------------------------------------------
INSERT INTO public.roles (user_id, role_type) VALUES
  ('00000001-0001-4000-8001-000000000001', 'minder'),
  ('00000001-0002-4000-8001-000000000002', 'minder'),
  ('00000001-0003-4000-8001-000000000003', 'minder'),
  ('00000001-0004-4000-8001-000000000004', 'minder'),
  ('00000001-0005-4000-8001-000000000005', 'minder'),
  ('00000001-0006-4000-8001-000000000006', 'minder'),
  ('00000001-0007-4000-8001-000000000007', 'minder'),
  ('00000001-0008-4000-8001-000000000008', 'minder'),
  ('00000001-0009-4000-8001-000000000009', 'minder'),
  ('00000001-0010-4000-8001-000000000010', 'minder'),
  ('00000001-0011-4000-8001-000000000011', 'minder'),
  ('00000001-0012-4000-8001-000000000012', 'minder'),
  ('00000001-0013-4000-8001-000000000013', 'minder'),
  ('00000001-0014-4000-8001-000000000014', 'minder'),
  ('00000001-0015-4000-8001-000000000015', 'minder'),
  ('00000001-0016-4000-8001-000000000016', 'minder'),
  ('00000001-0017-4000-8001-000000000017', 'minder'),
  ('00000001-0018-4000-8001-000000000018', 'minder'),
  ('00000001-0019-4000-8001-000000000019', 'minder'),
  ('00000001-0020-4000-8001-000000000020', 'minder'),
  ('00000001-0021-4000-8001-000000000021', 'minder'),
  ('00000001-0022-4000-8001-000000000022', 'minder'),
  ('00000001-0023-4000-8001-000000000023', 'minder'),
  ('00000001-0024-4000-8001-000000000024', 'minder'),
  ('00000001-0025-4000-8001-000000000025', 'minder'),
  ('00000001-0026-4000-8001-000000000026', 'minder'),
  ('00000001-0027-4000-8001-000000000027', 'minder'),
  ('00000001-0028-4000-8001-000000000028', 'minder'),
  ('00000001-0029-4000-8001-000000000029', 'minder'),
  ('00000001-0030-4000-8001-000000000030', 'minder')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Step 4: public.minder_profiles
--
-- Diversity matrix:
--   Locations  : spread across London boroughs (coords already at 2dp per #35)
--   Pet types  : dogs, cats, rabbits, birds, fish, reptiles, small pets
--   Pet sizes  : all four size bands, including mixed sets and edge case of {}
--   Pricing    : £8–£30/hr range
--   Ratings    : 3.1–5.0 (including NULL for brand-new profiles)
--   Verified   : mix of true/false
--   Description: some detailed, some minimal, one NULL (edge case)
-- ---------------------------------------------------------------------------
INSERT INTO public.minder_profiles (
  user_id,
  service_description,
  supported_pet_types,
  supported_pet_sizes,
  service_pricing,
  is_verified,
  average_rating,
  visible_in_search,
  location_name,
  latitude,
  longitude
) VALUES
  -- 01 Alice Thompson — Hackney, dogs+cats, all sizes, verified
  ('00000001-0001-4000-8001-000000000001',
   'Experienced dog and cat sitter based in Hackney. I have looked after pets for over 8 years and treat every animal like my own. Happy to provide updates and photos throughout the day.',
   ARRAY['dog','cat'], ARRAY['small','medium','large','x-large'],
   '£12/hr', true, 4.8, true, 'Hackney, London', 51.55, -0.06),

  -- 02 Ben Carter — Stratford, dogs only, medium+large, unverified
  ('00000001-0002-4000-8001-000000000002',
   'Dog walker and sitter in Stratford. I take dogs on long off-lead walks in the Olympic Park. Only medium and large breeds please.',
   ARRAY['dog'], ARRAY['medium','large'],
   '£10/hr', false, 4.2, true, 'Stratford, London', 51.54, -0.01),

  -- 03 Charlotte Davis — Camden, cats+rabbits, small only, verified, high rating
  ('00000001-0003-4000-8001-000000000003',
   'Cat and small pet specialist in Camden. I am particularly good with anxious or rescue animals and can administer medication if needed.',
   ARRAY['cat','rabbit'], ARRAY['small'],
   '£15/hr', true, 4.9, true, 'Camden, London', 51.54, -0.14),

  -- 04 David Wilson — Brixton, dogs+birds, small+medium, low rating
  ('00000001-0004-4000-8001-000000000004',
   'Offering dog sitting and bird care in Brixton. Comfortable with parrots, budgies, and cockatoos. Happy to do overnight stays.',
   ARRAY['dog','bird'], ARRAY['small','medium'],
   '£8/hr', false, 3.5, true, 'Brixton, London', 51.46, -0.12),

  -- 05 Emma Brown — Islington, small pets (hamsters/gerbils), verified
  ('00000001-0005-4000-8001-000000000005',
   'Small animal specialist in Islington. I care for hamsters, gerbils, guinea pigs, and other small mammals. Cage cleaning included.',
   ARRAY['hamster','guinea pig','gerbil','rabbit'], ARRAY['small'],
   '£10/hr', true, 4.0, true, 'Islington, London', 51.54, -0.10),

  -- 06 Finn O''Brien — Southwark, dogs+cats, medium+large, verified
  ('00000001-0006-4000-8001-000000000006',
   'Passionate pet carer in Southwark. Dogs get a minimum one-hour walk daily. Cats receive playtime and enrichment. DBS checked.',
   ARRAY['dog','cat'], ARRAY['medium','large'],
   '£14/hr', true, 4.6, true, 'Southwark, London', 51.50, -0.09),

  -- 07 Grace Lee — Greenwich, fish+turtles, empty size array (edge case)
  ('00000001-0007-4000-8001-000000000007',
   'Aquatic and reptile care specialist near Greenwich. I look after freshwater and marine fish tanks, turtles, and tortoises. Tank maintenance included.',
   ARRAY['fish','turtle','tortoise'], ARRAY[]::text[],
   '£9/hr', false, 3.8, true, 'Greenwich, London', 51.48, 0.00),

  -- 08 Hassan Ali — Lewisham, dogs, all sizes, unverified
  ('00000001-0008-4000-8001-000000000008',
   'Friendly dog sitter in Lewisham. I am available most weekdays and weekends. Experience with high-energy breeds and large dogs.',
   ARRAY['dog'], ARRAY['small','medium','large','x-large'],
   '£11/hr', false, 4.3, true, 'Lewisham, London', 51.46, -0.01),

  -- 09 Imogen Clark — Wandsworth, cats+guinea pigs, small+medium, verified
  ('00000001-0009-4000-8001-000000000009',
   'Home-based pet carer in Wandsworth. I only take one booking at a time so your pet gets my full attention. References available.',
   ARRAY['cat','guinea pig'], ARRAY['small','medium'],
   '£13/hr', true, 4.7, true, 'Wandsworth, London', 51.46, -0.18),

  -- 10 James Martin — Hammersmith, dogs+cats+birds, all sizes, verified, top rating
  ('00000001-0010-4000-8001-000000000010',
   'Professional pet sitter in Hammersmith with 12 years of experience. Qualified in pet first aid. Insured. I care for dogs, cats, and birds of all sizes.',
   ARRAY['dog','cat','bird'], ARRAY['small','medium','large','x-large'],
   '£20/hr', true, 4.9, true, 'Hammersmith, London', 51.49, -0.23),

  -- 11 Kate Johnson — Notting Hill, dogs, small+medium, verified, high price
  ('00000001-0011-4000-8001-000000000011',
   'Boutique dog care in Notting Hill. Maximum two dogs at a time. Private garden available. Daily photo updates guaranteed.',
   ARRAY['dog'], ARRAY['small','medium'],
   '£25/hr', true, 4.5, true, 'Notting Hill, London', 51.51, -0.20),

  -- 12 Lucas White — Shoreditch, cats+rabbits, small, unverified
  ('00000001-0012-4000-8001-000000000012',
   'Cat and rabbit sitter in Shoreditch. Experienced with indoor cats and house rabbits. Litter trays cleaned daily.',
   ARRAY['cat','rabbit'], ARRAY['small'],
   '£12/hr', false, 4.1, true, 'Shoreditch, London', 51.52, -0.08),

  -- 13 Maya Patel — Bethnal Green, dogs+cats, small+medium, verified
  ('00000001-0013-4000-8001-000000000013',
   'Dog and cat minder in Bethnal Green. Grew up with animals my whole life. Happy to follow any feeding or medication schedules.',
   ARRAY['dog','cat'], ARRAY['small','medium'],
   '£10/hr', true, 3.9, true, 'Bethnal Green, London', 51.53, -0.06),

  -- 14 Nathan Scott — Peckham, dogs, large+x-large, unverified, low rating
  ('00000001-0014-4000-8001-000000000014',
   'Big dog specialist in Peckham. I own two large dogs myself so I understand the needs of big breeds. Long daily walks.',
   ARRAY['dog'], ARRAY['large','x-large'],
   '£9/hr', false, 3.2, true, 'Peckham, London', 51.47, -0.07),

  -- 15 Olivia Harris — Tottenham, cats+small pets, small, unverified
  ('00000001-0015-4000-8001-000000000015',
   'Caring for cats and small animals in Tottenham. Particularly patient with shy or rescue animals. Flexible hours including overnight care.',
   ARRAY['cat','hamster','guinea pig'], ARRAY['small'],
   '£11/hr', false, 4.4, true, 'Tottenham, London', 51.60, -0.07),

  -- 16 Patrick Walsh — Ealing, dogs+cats+lizards, all sizes, verified
  ('00000001-0016-4000-8001-000000000016',
   'Multi-species pet carer in Ealing. Comfortable with reptiles including bearded dragons and leopard geckos, as well as dogs and cats.',
   ARRAY['dog','cat','lizard','gecko'], ARRAY['small','medium','large'],
   '£16/hr', true, 4.7, true, 'Ealing, London', 51.51, -0.31),

  -- 17 Quinn Roberts — Kingston, dogs, medium+large, verified, high rating
  ('00000001-0017-4000-8001-000000000017',
   'Dog sitter with a large private garden in Kingston upon Thames. Ideal for energetic dogs. Trial visits always offered.',
   ARRAY['dog'], ARRAY['medium','large'],
   '£18/hr', true, 4.8, true, 'Kingston upon Thames', 51.41, -0.31),

  -- 18 Rachel Green — Croydon, cats+birds+rabbits, small, unverified, lower rating
  ('00000001-0018-4000-8001-000000000018',
   'Caring for cats, birds, and rabbits in Croydon. Available for short pop-in visits or full day care. Reasonable rates.',
   ARRAY['cat','bird','rabbit'], ARRAY['small'],
   '£10/hr', false, 3.7, true, 'Croydon, London', 51.38, -0.10),

  -- 19 Samuel Turner — Wembley, dogs, small+medium, unverified
  ('00000001-0019-4000-8001-000000000019',
   'Dog sitter near Wembley Stadium. Good with nervous dogs. I will keep your dog calm and comfortable while you are away.',
   ARRAY['dog'], ARRAY['small','medium'],
   '£12/hr', false, 4.0, true, 'Wembley, London', 51.55, -0.30),

  -- 20 Tara Singh — Fulham, cats+guinea pigs, small+medium, verified
  ('00000001-0020-4000-8001-000000000020',
   'Cat and small pet specialist in Fulham. Quiet home environment, no other pets. Ideal for animals that need a calm setting.',
   ARRAY['cat','guinea pig'], ARRAY['small','medium'],
   '£14/hr', true, 4.6, true, 'Fulham, London', 51.48, -0.19),

  -- 21 Uma Foster — Clapham, dogs+cats, medium+large, unverified
  ('00000001-0021-4000-8001-000000000021',
   'Dog and cat sitter in Clapham. I work from home so your pet is never left alone. Daily walks in Clapham Common.',
   ARRAY['dog','cat'], ARRAY['medium','large'],
   '£15/hr', false, 4.3, true, 'Clapham, London', 51.46, -0.14),

  -- 22 Victor Hughes — Battersea, dogs, large+x-large, verified, high price
  ('00000001-0022-4000-8001-000000000022',
   'Premium dog care in Battersea. Specialising in large and giant breeds. Former veterinary nurse. First aid certified.',
   ARRAY['dog'], ARRAY['large','x-large'],
   '£22/hr', true, 4.8, true, 'Battersea, London', 51.48, -0.15),

  -- 23 Willow Chen — Kensington, cats+rabbits, small, verified, highest price
  ('00000001-0023-4000-8001-000000000023',
   'Luxury in-home cat and rabbit sitting in Kensington. Your pet stays in their own home with round-the-clock care. Detailed daily reports.',
   ARRAY['cat','rabbit'], ARRAY['small'],
   '£30/hr', true, 4.9, true, 'Kensington, London', 51.50, -0.19),

  -- 24 Xavier King — Mile End, dogs+birds, small+medium, unverified, lower rating
  ('00000001-0024-4000-8001-000000000024',
   'Dog and bird care in Mile End. Comfortable with parakeets and cockatoos. Happy to combine dog walking with bird feeding visits.',
   ARRAY['dog','bird'], ARRAY['small','medium'],
   '£11/hr', false, 3.6, true, 'Mile End, London', 51.52, -0.03),

  -- 25 Yasmin Ahmed — Woolwich, dogs+cats, small+medium, verified
  ('00000001-0025-4000-8001-000000000025',
   'Friendly and reliable pet carer in Woolwich. Fully insured. Happy to take last-minute bookings when available.',
   ARRAY['dog','cat'], ARRAY['small','medium'],
   '£9/hr', true, 4.1, true, 'Woolwich, London', 51.49, 0.06),

  -- 26 Zara Collins — Chiswick, dogs, medium+large, unverified
  ('00000001-0026-4000-8001-000000000026',
   'Dog sitter near Chiswick House. Beautiful park walks on offer. I keep a structured routine so your dog feels at home.',
   ARRAY['dog'], ARRAY['medium','large'],
   '£20/hr', false, 4.7, true, 'Chiswick, London', 51.49, -0.27),

  -- 27 Aaron Mitchell — Balham, cats+snakes+lizards, small, verified, niche specialty
  ('00000001-0027-4000-8001-000000000027',
   'Exotic and reptile specialist in Balham. I keep snakes and lizards myself so I understand their housing, heating, and feeding needs. Also happy to care for cats.',
   ARRAY['cat','snake','lizard'], ARRAY['small'],
   '£13/hr', true, 4.2, true, 'Balham, London', 51.44, -0.15),

  -- 28 Beth Taylor — Finsbury Park, dogs, all sizes, unverified, NULL rating (new minder)
  ('00000001-0028-4000-8001-000000000028',
   'New to the platform but experienced with dogs of all sizes. Based near Finsbury Park — great for long off-lead runs.',
   ARRAY['dog'], ARRAY['small','medium','large','x-large'],
   '£10/hr', false, NULL, true, 'Finsbury Park, London', 51.56, -0.10),

  -- 29 Chris Anderson — Dalston, dogs+cats+small pets, all sizes, verified
  ('00000001-0029-4000-8001-000000000029',
   'All-round pet carer in Dalston with 6 years of experience. I look after dogs, cats, rabbits, hamsters, and most other small animals. Group walks available.',
   ARRAY['dog','cat','rabbit','hamster'], ARRAY['small','medium','large'],
   '£12/hr', true, 4.5, true, 'Dalston, London', 51.55, -0.07),

  -- 30 Diana Evans — Putney, dogs+cats, small+medium, verified, NULL description (edge case)
  ('00000001-0030-4000-8001-000000000030',
   NULL,
   ARRAY['dog','cat'], ARRAY['small','medium'],
   '£16/hr', true, 4.4, true, 'Putney, London', 51.46, -0.22)

ON CONFLICT (user_id) DO NOTHING;
