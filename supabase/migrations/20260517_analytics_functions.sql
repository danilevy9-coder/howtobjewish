-- Analytics tables (skip if they already exist)
CREATE TABLE IF NOT EXISTS page_views (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  path text NOT NULL,
  referrer text,
  user_agent text,
  country text,
  city text,
  visitor_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  page_url text,
  referrer text,
  session_id text,
  user_agent text,
  country text,
  city text,
  device_type text,
  browser text,
  os text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views (path);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views (created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_visitor ON page_views (visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events (event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events (created_at);

-- RLS
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Policies (use DO blocks to skip if they exist)
DO $$ BEGIN
  CREATE POLICY "Allow anonymous page view inserts" ON page_views
    FOR INSERT TO anon, authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow authenticated page view reads" ON page_views
    FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow anonymous event inserts" ON analytics_events
    FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow authenticated event reads" ON analytics_events
    FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RPC functions for analytics dashboard
CREATE OR REPLACE FUNCTION get_top_pages(days_ago int DEFAULT 30)
RETURNS TABLE(path text, view_count bigint)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT path, count(*) as view_count
  FROM page_views
  WHERE created_at >= now() - (days_ago || ' days')::interval
  GROUP BY path
  ORDER BY view_count DESC
  LIMIT 20;
$$;

CREATE OR REPLACE FUNCTION get_top_referrers(days_ago int DEFAULT 30)
RETURNS TABLE(referrer text, ref_count bigint)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT COALESCE(referrer, '(direct)') as referrer, count(*) as ref_count
  FROM page_views
  WHERE created_at >= now() - (days_ago || ' days')::interval
  GROUP BY referrer
  ORDER BY ref_count DESC
  LIMIT 15;
$$;

CREATE OR REPLACE FUNCTION get_top_countries(days_ago int DEFAULT 30)
RETURNS TABLE(country text, country_count bigint)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT COALESCE(country, 'Unknown') as country, count(*) as country_count
  FROM page_views
  WHERE created_at >= now() - (days_ago || ' days')::interval
    AND country IS NOT NULL
  GROUP BY country
  ORDER BY country_count DESC
  LIMIT 15;
$$;
