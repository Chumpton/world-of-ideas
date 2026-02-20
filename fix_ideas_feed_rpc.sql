-- Stable feed RPC (bypass policy drift + keep response small)
-- Run in Supabase SQL editor.

BEGIN;

CREATE OR REPLACE FUNCTION public.fetch_ideas_feed(p_limit integer DEFAULT 120)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  category text,
  tags text[],
  author_id uuid,
  author_name text,
  author_avatar text,
  votes integer,
  status text,
  forked_from uuid,
  lat double precision,
  lng double precision,
  city text,
  title_image text,
  thumbnail_url text,
  comment_count integer,
  view_count integer,
  shares integer,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id,
    i.title,
    i.description,
    i.category,
    i.tags,
    i.author_id,
    i.author_name,
    i.author_avatar,
    COALESCE(i.votes, 0) AS votes,
    COALESCE(i.status, 'open') AS status,
    i.forked_from,
    i.lat,
    i.lng,
    i.city,
    i.title_image,
    i.thumbnail_url,
    COALESCE(i.comment_count, 0) AS comment_count,
    COALESCE(i.view_count, 0) AS view_count,
    COALESCE(i.shares, 0) AS shares,
    i.created_at
  FROM public.ideas i
  ORDER BY i.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 120), 300));
$$;

REVOKE ALL ON FUNCTION public.fetch_ideas_feed(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fetch_ideas_feed(integer) TO anon, authenticated;

COMMIT;

-- Diagnostics:
-- SELECT * FROM public.fetch_ideas_feed(20);
