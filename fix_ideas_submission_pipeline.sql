-- Fix: Idea Submission Pipeline + Feed Thumbnail Support
-- Run in Supabase SQL Editor.

BEGIN;

-- 1) Ensure ideas table has the fields the frontend submits/displays.
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS title_image TEXT;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS idea_data JSONB DEFAULT '{}'::jsonb;

-- 2) Normalize defaults for core fields used by posting/feed/details.
ALTER TABLE public.ideas ALTER COLUMN votes SET DEFAULT 0;
ALTER TABLE public.ideas ALTER COLUMN status SET DEFAULT 'open';
ALTER TABLE public.ideas ALTER COLUMN tags SET DEFAULT '{}'::text[];
ALTER TABLE public.ideas ALTER COLUMN comment_count SET DEFAULT 0;
ALTER TABLE public.ideas ALTER COLUMN view_count SET DEFAULT 0;
ALTER TABLE public.ideas ALTER COLUMN shares SET DEFAULT 0;
ALTER TABLE public.ideas ALTER COLUMN created_at SET DEFAULT now();

-- 3) Handle roles/resources type drift safely (jsonb vs text[]).
DO $do$
DECLARE
  roles_udt text;
  resources_udt text;
BEGIN
  SELECT udt_name INTO roles_udt
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='ideas' AND column_name='roles_needed';

  IF roles_udt = '_text' THEN
    EXECUTE 'ALTER TABLE public.ideas ALTER COLUMN roles_needed SET DEFAULT ''{}''::text[]';
    EXECUTE 'UPDATE public.ideas SET roles_needed = COALESCE(roles_needed, ''{}''::text[]) WHERE roles_needed IS NULL';
  ELSIF roles_udt = 'jsonb' THEN
    EXECUTE 'ALTER TABLE public.ideas ALTER COLUMN roles_needed SET DEFAULT ''[]''::jsonb';
    EXECUTE 'UPDATE public.ideas SET roles_needed = COALESCE(roles_needed, ''[]''::jsonb) WHERE roles_needed IS NULL';
  END IF;

  SELECT udt_name INTO resources_udt
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='ideas' AND column_name='resources_needed';

  IF resources_udt = '_text' THEN
    EXECUTE 'ALTER TABLE public.ideas ALTER COLUMN resources_needed SET DEFAULT ''{}''::text[]';
    EXECUTE 'UPDATE public.ideas SET resources_needed = COALESCE(resources_needed, ''{}''::text[]) WHERE resources_needed IS NULL';
  ELSIF resources_udt = 'jsonb' THEN
    EXECUTE 'ALTER TABLE public.ideas ALTER COLUMN resources_needed SET DEFAULT ''[]''::jsonb';
    EXECUTE 'UPDATE public.ideas SET resources_needed = COALESCE(resources_needed, ''[]''::jsonb) WHERE resources_needed IS NULL';
  END IF;
END
$do$;

-- 4) Backfill and keep legacy rows renderable in feed/details.
UPDATE public.ideas
SET
  title_image = COALESCE(NULLIF(title_image, ''), NULLIF((idea_data->>'titleImage'), '')),
  thumbnail_url = COALESCE(NULLIF(thumbnail_url, ''), NULLIF((idea_data->>'thumbnail'), ''), NULLIF(title_image, '')),
  idea_data = COALESCE(idea_data, '{}'::jsonb),
  votes = COALESCE(votes, 0),
  status = COALESCE(NULLIF(status, ''), 'open'),
  tags = COALESCE(tags, '{}'::text[]),
  comment_count = COALESCE(comment_count, 0),
  view_count = COALESCE(view_count, 0),
  shares = COALESCE(shares, 0),
  created_at = COALESCE(created_at, now())
WHERE
  title_image IS NULL
  OR thumbnail_url IS NULL
  OR idea_data IS NULL
  OR votes IS NULL
  OR status IS NULL OR status = ''
  OR tags IS NULL
  OR comment_count IS NULL
  OR view_count IS NULL
  OR shares IS NULL
  OR created_at IS NULL;

-- 5) Keep RPC signature aligned with frontend.
CREATE OR REPLACE FUNCTION public.increment_idea_views(p_idea_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ideas
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = p_idea_id;
END;
$$;

COMMIT;

-- 6) Optional: indexing for feed performance.
CREATE INDEX IF NOT EXISTS idx_ideas_created_at_desc ON public.ideas (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_author_id ON public.ideas (author_id);
CREATE INDEX IF NOT EXISTS idx_ideas_category_created_at ON public.ideas (category, created_at DESC);
