 -- Remove storage policies
DROP POLICY IF EXISTS "Admins can read all verification docs"   ON storage.objects;
DROP POLICY IF EXISTS "Users can read own verification docs"    ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own verification docs"  ON storage.objects;
 
-- Remove the storage bucket (only works if empty)
DELETE FROM storage.buckets WHERE id = 'id-verification-docs';
 
-- Remove table RLS policies
DROP POLICY IF EXISTS "Admins can read all id_verifications"    ON id_verifications;
DROP POLICY IF EXISTS "Users can insert own id_verifications"   ON id_verifications;
DROP POLICY IF EXISTS "Users can read own id_verifications"     ON id_verifications;
 
-- Remove trigger
DROP TRIGGER IF EXISTS trg_id_verifications_updated_at ON id_verifications;
 
-- Remove table
DROP TABLE IF EXISTS id_verifications;
 
-- Remove enums
DROP TYPE IF EXISTS id_verification_status;
DROP TYPE IF EXISTS id_verification_doc_type;
 
-- Only drop the function if no other table uses it
-- DROP FUNCTION IF EXISTS set_updated_at();