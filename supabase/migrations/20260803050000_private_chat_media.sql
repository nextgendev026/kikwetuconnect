-- Private chat media: media bucket should NOT be publicly readable.
-- Chat uploads live here; read access is granted via short-lived signed URLs
-- issued by the server only to conversation participants.

UPDATE storage.buckets SET public = false WHERE id = 'media';

-- Remove overly permissive read policies on the media bucket.
DROP POLICY IF EXISTS "Anyone can read media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read media" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own media" ON storage.objects;
DROP POLICY IF EXISTS "Owners can read media" ON storage.objects;

-- Direct API reads allowed only for the file owner (used to verify own uploads);
-- everyone else reads via signed URLs from /api/media/signed.
CREATE POLICY "Owners can read media" ON storage.objects
  FOR SELECT USING (bucket_id = 'media' AND owner = auth.uid());

-- Legacy public-prefixed copies (from /api/upload finalize) stay readable.
DROP POLICY IF EXISTS "Anyone can read public media" ON storage.objects;
CREATE POLICY "Anyone can read public media" ON storage.objects
  FOR SELECT USING (bucket_id = 'media' AND position('public/' in name) = 1);

-- Upload policies: authenticated users can upload own files (unchanged).
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
CREATE POLICY "Authenticated users can upload media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated' AND owner = auth.uid());

DROP POLICY IF EXISTS "Owners can update media" ON storage.objects;
CREATE POLICY "Owners can update media" ON storage.objects
  FOR UPDATE USING (bucket_id = 'media' AND owner = auth.uid());

DROP POLICY IF EXISTS "Owners can delete media" ON storage.objects;
CREATE POLICY "Owners can delete media" ON storage.objects
  FOR DELETE USING (bucket_id = 'media' AND owner = auth.uid());

NOTIFY pgrst, 'reload schema';
