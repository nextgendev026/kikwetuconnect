-- ============================================================
-- 20260814000000 — fix "upvotes never persist" (SQLSTATE 23514)
--
-- Root cause (from prod postgres error logs):
--   `heshima_earnings.source_type` CHECK allows only
--   ('upvote','quiz_completion','session_completion','daily_bonus',
--    'achievement_badge','contribution_bonus').
--   20260811000000 rewrote `update_heshima_rating()` to write
--   `source_type = NEW.target_type` ('post'/'answer'/'comment'),
--   so EVERY vote INSERT aborted -> the whole vote rolled back ->
--   upvotes / downvotes never persisted.
-- Fix: write `source_type = 'upvote'` (matches all prior shipped
--   versions) while keeping comment/answer author resolution.
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_heshima_rating() RETURNS trigger AS $$
declare
  target_author_id uuid;
  current_rating integer;
begin
  if NEW.target_type = 'post' then
    select user_id into target_author_id from public.posts where id = NEW.target_id;
  elsif NEW.target_type = 'answer' then
    select user_id into target_author_id from public.answers where id = NEW.target_id;
  elsif NEW.target_type = 'comment' then
    select user_id into target_author_id from public.comments where id = NEW.target_id;
  end if;

  if target_author_id is null then return null; end if;

  if TG_OP = 'INSERT' then
    if NEW.vote_type = 1 then
      update profiles set
        heshima_rating = least(heshima_rating + 1, 5000),
        heshima_balance = least(heshima_balance + 1, 5000),
        total_contributions = total_contributions + 1,
        updated_at = now()
      where id = target_author_id
      returning heshima_rating into current_rating;
      insert into heshima_earnings (user_id, amount, balance_after, source_type, source_id, description)
      values (target_author_id, 1, current_rating, 'upvote', NEW.target_id::text, 'Your ' || NEW.target_type || ' received an upvote');
    elsif NEW.vote_type = -1 then
      update profiles set heshima_rating = greatest(heshima_rating - 1, 0) where id = target_author_id;
    end if;
  elsif TG_OP = 'DELETE' then
    if OLD.vote_type = 1 then
      update profiles set
        heshima_rating = greatest(heshima_rating - 1, 0),
        total_contributions = greatest(total_contributions - 1, 0)
      where id = target_author_id;
    elsif OLD.vote_type = -1 then
      update profiles set heshima_rating = least(heshima_rating + 1, 5000) where id = target_author_id;
    end if;
  end if;

  if TG_OP = 'INSERT' and NEW.vote_type = 1 then
    perform check_expert_graduation(target_author_id);
    perform award_heshima_milestone_badges(target_author_id);
  end if;

  return null;
end;
$$ language plpgsql security definer;

GRANT EXECUTE ON FUNCTION public.update_heshima_rating() TO postgres, service_role, authenticated;

notify pgrst, 'reload schema';