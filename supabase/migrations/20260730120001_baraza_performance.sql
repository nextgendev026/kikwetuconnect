-- Baraza performance: trending computation, indexes, pagination support

-- Add trend column if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='barazas' AND column_name='trend') THEN
    ALTER TABLE barazas ADD COLUMN trend integer DEFAULT 0;
  END IF;
END $$;

-- Add category index for filtering
CREATE INDEX IF NOT EXISTS idx_barazas_category ON barazas(category);
CREATE INDEX IF NOT EXISTS idx_barazas_member_count ON barazas(member_count DESC);
CREATE INDEX IF NOT EXISTS idx_barazas_trend ON barazas(trend DESC);
CREATE INDEX IF NOT EXISTS idx_barazas_county ON barazas(county);
CREATE INDEX IF NOT EXISTS idx_barazas_created ON barazas(created_at DESC);

-- Trending computation function (callable via cron or manual refresh)
CREATE OR REPLACE FUNCTION compute_baraza_trending()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE barazas SET trend = (
    COALESCE((SELECT COUNT(*) FROM posts WHERE posts.baraza_id = barazas.id AND created_at > now() - interval '48 hours'), 0) * 3
    + COALESCE(member_count, 0)
  );
END;
$$;

-- Run initial computation
SELECT compute_baraza_trending();

-- Paginated baraza listing RPC
CREATE OR REPLACE FUNCTION get_barazas(
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 20,
  p_category text DEFAULT NULL,
  p_sort text DEFAULT 'trend'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset integer;
  v_total integer;
  v_items jsonb;
  v_has_more boolean;
BEGIN
  v_offset := (p_page - 1) * p_page_size;

  SELECT COUNT(*) INTO v_total FROM barazas
  WHERE (p_category IS NULL OR category = p_category);

  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb) INTO v_items
  FROM (
    SELECT id, slug, name, county, description, member_count, post_count,
           active_member_count, category, trend, cover_url, created_at
    FROM barazas
    WHERE (p_category IS NULL OR category = p_category)
    ORDER BY
      CASE WHEN p_sort = 'member_count' THEN member_count END DESC,
      CASE WHEN p_sort = 'trend' THEN trend END DESC,
      CASE WHEN p_sort = 'newest' THEN extract(epoch from created_at) END DESC,
      member_count DESC
    LIMIT p_page_size
    OFFSET v_offset
  ) t;

  v_has_more := (v_offset + p_page_size) < v_total;

  RETURN jsonb_build_object(
    'items', v_items,
    'total', v_total,
    'page', p_page,
    'page_size', p_page_size,
    'has_more', v_has_more
  );
END;
$$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_baraza_id ON posts(baraza_id);
CREATE INDEX IF NOT EXISTS idx_posts_county_tag ON posts(county_tag);
CREATE INDEX IF NOT EXISTS idx_posts_created_desc ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_locations_coords ON user_locations(latitude, longitude);
