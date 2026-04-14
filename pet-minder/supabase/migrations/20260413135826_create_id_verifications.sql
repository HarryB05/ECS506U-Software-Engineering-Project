-- ------------------------------------------------------------
-- 1. Enum for document type
-- ------------------------------------------------------------
CREATE TYPE id_verification_doc_type AS ENUM (
  'identity',       -- government-issued ID (all users)
  'certificate'     -- professional certificate (minders only)
);
 
-- ------------------------------------------------------------
-- 2. Enum for verification status
-- ------------------------------------------------------------
CREATE TYPE id_verification_status AS ENUM (
  'pending',        -- uploaded, waiting for Gemini result
  'approved',       -- Gemini approved (or admin re-approved)
  'rejected',       -- Gemini rejected the document
  'revoked'         -- admin manually revoked
);
 
-- ------------------------------------------------------------
-- 3. Main table
-- ------------------------------------------------------------
CREATE TABLE id_verifications (
  id                uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
 
  -- who
  user_id           uuid                      NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
 
  -- what kind of document
  doc_type          id_verification_doc_type  NOT NULL,
 
  -- file stored in Supabase Storage bucket "id-verification-docs"
  -- path format: {user_id}/{doc_type}/{filename}
  storage_path      text                      NOT NULL,
 
  -- result
  status            id_verification_status    NOT NULL DEFAULT 'pending',
  ai_reason         text,                     -- Gemini's one-sentence verdict
  gemini_raw        text,                     -- full raw Gemini response (debug)
 
  -- admin revoke
  revoked_at        timestamptz,
  revoked_by        uuid                      REFERENCES auth.users (id) ON DELETE SET NULL,
  revoked_reason    text,
 
  -- timestamps
  created_at        timestamptz               NOT NULL DEFAULT now(),
  approved_at       timestamptz,
  updated_at        timestamptz               NOT NULL DEFAULT now()
);
 
-- ------------------------------------------------------------
-- 4. Indexes
-- ------------------------------------------------------------
-- Fast lookup: all verifications for a user
CREATE INDEX idx_id_verifications_user_id
  ON id_verifications (user_id);
 
-- Fast lookup: all verifications of a type for a user
CREATE INDEX idx_id_verifications_user_doc_type
  ON id_verifications (user_id, doc_type);
 
-- Admin panel: filter by status (e.g. show all pending/revoked)
CREATE INDEX idx_id_verifications_status
  ON id_verifications (status);
 
-- ------------------------------------------------------------
-- 5. Auto-update updated_at on any row change
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
 
-- Only create the trigger if it doesn't exist on this table
-- (safe to run if set_updated_at already exists from another table)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_id_verifications_updated_at'
  ) THEN
    CREATE TRIGGER trg_id_verifications_updated_at
      BEFORE UPDATE ON id_verifications
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END;
$$;
 
-- ------------------------------------------------------------
-- 6. Row-Level Security
-- ------------------------------------------------------------
ALTER TABLE id_verifications ENABLE ROW LEVEL SECURITY;
 
-- Users can read their own rows
CREATE POLICY "Users can read own id_verifications"
  ON id_verifications
  FOR SELECT
  USING (auth.uid() = user_id);
 
-- Users can insert their own rows (one record per upload attempt)
CREATE POLICY "Users can insert own id_verifications"
  ON id_verifications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
 
-- Only the service-role (API routes) can UPDATE rows
-- (Gemini result write-back, admin revoke both go through service role)
-- No direct UPDATE policy for regular users — done via API route.
 
-- Admins can read everything (uses a helper that checks the roles table)
CREATE POLICY "Admins can read all id_verifications"
  ON id_verifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM roles
      WHERE roles.user_id = auth.uid()
        AND roles.role_type = 'admin'
        AND roles.deleted_at IS NULL
    )
  );
 
-- ------------------------------------------------------------
-- 7. Storage bucket (run once — idempotent with IF NOT EXISTS)
-- ------------------------------------------------------------
-- Creates a private bucket; files are never publicly accessible.
-- Signed URLs are generated per-request from API routes.
INSERT INTO storage.buckets (id, name, public)
VALUES ('id-verification-docs', 'id-verification-docs', false)
ON CONFLICT (id) DO NOTHING;
 
-- Storage RLS: owners can upload to their own folder
CREATE POLICY "Users can upload own verification docs"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'id-verification-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
 
-- Storage RLS: owners can read their own files
CREATE POLICY "Users can read own verification docs"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'id-verification-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
 
-- Storage RLS: admins can read all files in the bucket
CREATE POLICY "Admins can read all verification docs"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'id-verification-docs'
    AND EXISTS (
      SELECT 1 FROM roles
      WHERE roles.user_id = auth.uid()
        AND roles.role_type = 'admin'
        AND roles.deleted_at IS NULL
    )
  );