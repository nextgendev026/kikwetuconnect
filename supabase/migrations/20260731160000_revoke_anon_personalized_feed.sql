-- Anonymous must only be able to read a single shared post via
-- get_post_by_id, never enumerate the whole feed. is_admin() stays
-- executable by anon because the profiles RLS SELECT policy calls it
-- (returns false for anon); get_personalized_feed is removed.
REVOKE EXECUTE ON FUNCTION public.get_personalized_feed(uuid, integer, integer) FROM anon;

notify pgrst, 'reload schema';
