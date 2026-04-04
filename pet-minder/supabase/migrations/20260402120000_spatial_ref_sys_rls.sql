-- PostGIS installs `public.spatial_ref_sys` (SRID catalogue). PostgREST exposes `public`,
-- so Supabase flags missing RLS. This enables RLS with read-only access for API roles.
-- Safe to run only when PostGIS is installed; otherwise the block is skipped.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'spatial_ref_sys'
  ) THEN
    ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "spatial_ref_sys_select_auth" ON public.spatial_ref_sys;

    CREATE POLICY "spatial_ref_sys_select_auth"
      ON public.spatial_ref_sys
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;
