-- storage.buckets has RLS enabled but zero policies, so the anon and
-- authenticated roles cannot see ANY bucket. Every bucket op fails with
-- "Bucket not found" (client uploads + storage.getBucket/listBuckets).
-- Restore the standard Supabase storage.buckets policy set.

drop policy if exists "Public bucket read" on storage.buckets;
create policy "Public bucket read" on storage.buckets
  for select using (public = true);

drop policy if exists "Bucket owner read" on storage.buckets;
create policy "Bucket owner read" on storage.buckets
  for select using (owner = auth.uid());

drop policy if exists "Bucket owner insert" on storage.buckets;
create policy "Bucket owner insert" on storage.buckets
  for insert with check (owner = auth.uid());

drop policy if exists "Bucket owner update" on storage.buckets;
create policy "Bucket owner update" on storage.buckets
  for update using (owner = auth.uid());

drop policy if exists "Bucket owner delete" on storage.buckets;
create policy "Bucket owner delete" on storage.buckets
  for delete using (owner = auth.uid());
