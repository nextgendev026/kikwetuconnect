-- Style badges as a savannah wildlife ecosystem.
-- Each curated badge maps to a Kenyan savannah animal that represents its
-- meaning; milestone badges progress through the animal kingdom (zebra →
-- cheetah → lion) instead of generic star/medal/crown glyphs.

-- ---- 1. Curated badges → savannah wildlife -----------------------
UPDATE public.badges SET icon = '🦅' WHERE name = 'Rising Star';
UPDATE public.badges SET icon = '🦒' WHERE name = 'Knowledge Seeker';
UPDATE public.badges SET icon = '🦁' WHERE name = 'Community Sage';
UPDATE public.badges SET icon = '🦓' WHERE name = 'Quiz Champion';
UPDATE public.badges SET icon = '🐆' WHERE name = 'Quiz Master';
UPDATE public.badges SET icon = '🦩' WHERE name = 'Conversation Starter';
UPDATE public.badges SET icon = '🐘' WHERE name = 'Helpful Neighbour';
UPDATE public.badges SET icon = '🦏' WHERE name = 'Dedicated Learner';
UPDATE public.badges SET icon = '🐃' WHERE name = 'Mentor Spirit';

-- ---- 2. Milestone badges → savannah progression ------------------
CREATE OR REPLACE FUNCTION public.ensure_heshima_milestone_badges() RETURNS void AS $$
BEGIN
  INSERT INTO public.badges (name, description, icon, requirement_type, requirement_value)
  SELECT
    'Heshima ' || gs,
    'Reach ' || gs || ' Heshima rating',
    CASE
      WHEN gs >= 1000 THEN '🦁'
      WHEN gs >= 500 THEN '🐆'
      ELSE '🦓'
    END,
    'heshima_points',
    gs
  FROM generate_series(100, 5000, 100) gs
  WHERE NOT EXISTS (
    SELECT 1 FROM public.badges b
    WHERE b.requirement_type = 'heshima_points' AND b.requirement_value = gs
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill icons on already-created milestone rows.
UPDATE public.badges
SET icon = CASE
  WHEN requirement_value >= 1000 THEN '🦁'
  WHEN requirement_value >= 500 THEN '🐆'
  ELSE '🦓'
END
WHERE requirement_type = 'heshima_points'
  AND requirement_value BETWEEN 100 AND 5000
  AND requirement_value % 100 = 0
  AND name LIKE 'Heshima %';
