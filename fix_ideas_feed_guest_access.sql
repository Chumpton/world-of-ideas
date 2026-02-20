-- Ensure ideas feed is guest-readable and stable
-- Run in Supabase SQL editor.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Ensure key columns and defaults expected by feed
ALTER TABLE public.ideas
  ADD COLUMN IF NOT EXISTS id uuid,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS tags text[],
  ADD COLUMN IF NOT EXISTS author_id uuid,
  ADD COLUMN IF NOT EXISTS author_name text,
  ADD COLUMN IF NOT EXISTS author_avatar text,
  ADD COLUMN IF NOT EXISTS votes integer,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS markdown_body text,
  ADD COLUMN IF NOT EXISTS forked_from uuid,
  ADD COLUMN IF NOT EXISTS roles_needed text[],
  ADD COLUMN IF NOT EXISTS resources_needed text[],
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS title_image text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS idea_data jsonb,
  ADD COLUMN IF NOT EXISTS comment_count integer,
  ADD COLUMN IF NOT EXISTS view_count integer,
  ADD COLUMN IF NOT EXISTS shares integer,
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

ALTER TABLE public.ideas
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

UPDATE public.ideas
SET id = gen_random_uuid()
WHERE id IS NULL;

ALTER TABLE public.ideas
  ALTER COLUMN title SET DEFAULT 'Untitled Idea',
  ALTER COLUMN category SET DEFAULT 'invention',
  ALTER COLUMN tags SET DEFAULT '{}'::text[],
  ALTER COLUMN votes SET DEFAULT 0,
  ALTER COLUMN status SET DEFAULT 'open',
  ALTER COLUMN roles_needed SET DEFAULT '{}'::text[],
  ALTER COLUMN resources_needed SET DEFAULT '{}'::text[],
  ALTER COLUMN idea_data SET DEFAULT '{}'::jsonb,
  ALTER COLUMN comment_count SET DEFAULT 0,
  ALTER COLUMN view_count SET DEFAULT 0,
  ALTER COLUMN shares SET DEFAULT 0,
  ALTER COLUMN created_at SET DEFAULT now();

-- 2) Public feed read + owner write policies
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ideas'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.ideas', p.policyname);
  END LOOP;
END $$;

CREATE POLICY ideas_select_public
ON public.ideas
FOR SELECT
USING (true);

CREATE POLICY ideas_insert_owner
ON public.ideas
FOR INSERT
TO authenticated
WITH CHECK (author_id = auth.uid());

CREATE POLICY ideas_update_owner
ON public.ideas
FOR UPDATE
TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

CREATE POLICY ideas_delete_owner
ON public.ideas
FOR DELETE
TO authenticated
USING (author_id = auth.uid());

-- 3) Feed indexes
CREATE INDEX IF NOT EXISTS idx_ideas_created_at_desc ON public.ideas (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_category_created_at ON public.ideas (category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_author_id ON public.ideas (author_id);

COMMIT;

-- Diagnostics:
-- SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE schemaname='public' AND tablename='ideas' ORDER BY policyname;
-- SELECT id, title, author_id, created_at FROM public.ideas ORDER BY created_at DESC LIMIT 20;
