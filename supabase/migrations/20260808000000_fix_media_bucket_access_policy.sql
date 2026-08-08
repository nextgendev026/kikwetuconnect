-- Fix private chat media access: strip the 'media' bucket from the generic
-- app-media storage policies.
--
-- Background: 20260803050000_private_chat_media.sql made the 'media' bucket
-- private (public = false) so chat uploads are only readable by the owner via
-- short-lived signed URLs (/api/media/signed). But the later stories-removal
-- migration (20260803100000) re-created the generic app-media policies with
-- 'media' still in the bucket list, letting ANY authenticated user read
-- private chat files directly. The 'media' bucket already has its own
-- owner-checked read/upload policies, so these generic grants are both a
-- privacy leak and redundant for uploads.

DROP POLICY IF EXISTS "Anyone can read app media" ON storage.objects;
CREATE POLICY "Anyone can read app media" ON storage.objects
  FOR SELECT USING (
    auth.role() = 'authenticated'
    and bucket_id in ('avatars', 'covers', 'feed-images', 'feed-videos', 'public-media', 'audio', 'video')
  );

DROP POLICY IF EXISTS "Authenticated can upload app media" ON storage.objects;
CREATE POLICY "Authenticated can upload app media" ON storage.objects
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    and bucket_id in ('avatars', 'covers', 'feed-images', 'feed-videos', 'public-media', 'audio', 'video')
    and owner = auth.uid()
  );

NOTIFY pgrst, 'reload schema';
