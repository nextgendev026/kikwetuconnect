-- ============================================================
-- 20260814000003 — consolidate duplicate vote-fix migration
--
-- 20260814000000 is the canonical fix for the heshima source_type
-- regression. A draft 20260814000002 (same content) was pushed by
-- mistake and recorded in schema_migrations; this removes its
-- tracking row so local and remote migration sets stay identical.
-- ============================================================

DELETE FROM supabase_migrations.schema_migrations
WHERE version = '20260814000002';

notify pgrst, 'reload schema';