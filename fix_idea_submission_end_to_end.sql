-- Repair idea submission end-to-end (schema + defaults + RLS)
-- Run in Supabase SQL editor.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Ensure ideas table has fields expected by frontend submit pipeline.
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS category text DEFAULT 'invention';
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[];
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS author_id uuid;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS author_name text;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS author_avatar text;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS votes integer DEFAULT 0;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS status text DEFAULT 'open';
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS markdown_body text;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS forked_from uuid;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS roles_needed text[] DEFAULT '{}'::text[];
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS resources_needed text[] DEFAULT '{}'::text[];
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS lng double precision;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS title_image text;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS thumbnail_url text;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS idea_data jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS comment_count integer DEFAULT 0;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS shares integer DEFAULT 0;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- 2) Normalize defaults and nulls for robust inserts.
ALTER TABLE public.ideas ALTER COLUMN title SET DEFAULT 'Untitled Idea';
ALTER TABLE public.ideas ALTER COLUMN category SET DEFAULT 'invention';
ALTER TABLE public.ideas ALTER COLUMN tags SET DEFAULT '{}'::text[];
ALTER TABLE public.ideas ALTER COLUMN votes SET DEFAULT 0;
ALTER TABLE public.ideas ALTER COLUMN status SET DEFAULT 'open';
ALTER TABLE public.ideas ALTER COLUMN idea_data SET DEFAULT '{}'::jsonb;
ALTER TABLE public.ideas ALTER COLUMN comment_count SET DEFAULT 0;
ALTER TABLE public.ideas ALTER COLUMN view_count SET DEFAULT 0;
ALTER TABLE public.ideas ALTER COLUMN shares SET DEFAULT 0;
ALTER TABLE public.ideas ALTER COLUMN created_at SET DEFAULT now();

-- Handle roles/resources type drift safely (some projects use text[], others jsonb).
DO $$
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
END $$;

UPDATE public.ideas
SET
  title = COALESCE(NULLIF(title, ''), 'Untitled Idea'),
  category = COALESCE(NULLIF(category, ''), 'invention'),
  tags = COALESCE(tags, '{}'::text[]),
  votes = COALESCE(votes, 0),
  status = COALESCE(NULLIF(status, ''), 'open'),
  idea_data = COALESCE(idea_data, '{}'::jsonb),
  comment_count = COALESCE(comment_count, 0),
  view_count = COALESCE(view_count, 0),
  shares = COALESCE(shares, 0),
  created_at = COALESCE(created_at, now())
WHERE
  title IS NULL OR title = ''
  OR category IS NULL OR category = ''
  OR tags IS NULL
  OR votes IS NULL
  OR status IS NULL OR status = ''
  OR idea_data IS NULL
  OR comment_count IS NULL
  OR view_count IS NULL
  OR shares IS NULL
  OR created_at IS NULL;

-- 3) Keep author_id FK only if profiles table exists.
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    BEGIN
      ALTER TABLE public.ideas
      ADD CONSTRAINT ideas_author_id_fkey
      FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- 4) Coherent RLS for ideas.
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

-- 5) Helpful indexes.
CREATE INDEX IF NOT EXISTS idx_ideas_created_at_desc ON public.ideas (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_author_id ON public.ideas (author_id);
CREATE INDEX IF NOT EXISTS idx_ideas_category_created_at ON public.ideas (category, created_at DESC);

COMMIT;

-- Diagnostics:
-- SELECT relrowsecurity FROM pg_class WHERE oid='public.ideas'::regclass;
-- SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE schemaname='public' AND tablename='ideas' ORDER BY policyname;
-- SELECT column_name, data_type, udt_name, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='ideas' ORDER BY ordinal_position;
