-- Hotfix: ideas not posting
-- Targets legacy constraints and policy drift seen in production.
-- Run in Supabase SQL Editor.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Remove legacy NOT NULL-style CHECK constraints blocking modern payloads.
ALTER TABLE public.ideas DROP CONSTRAINT IF EXISTS "2200_20850_1_not_null";
ALTER TABLE public.ideas DROP CONSTRAINT IF EXISTS "2200_20850_2_not_null";

-- 2) Ensure inserts can generate a primary key if client does not send id.
ALTER TABLE public.ideas ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 3) Ensure modern app columns/defaults exist.
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'invention';
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::text[];
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS author_id UUID;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS author_name TEXT;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS author_avatar TEXT;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS votes INTEGER DEFAULT 0;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS markdown_body TEXT;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS roles_needed JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS resources_needed JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS title_image TEXT;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS idea_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.ideas ALTER COLUMN title SET DEFAULT 'Untitled Idea';
ALTER TABLE public.ideas ALTER COLUMN category SET DEFAULT 'invention';
ALTER TABLE public.ideas ALTER COLUMN votes SET DEFAULT 0;
ALTER TABLE public.ideas ALTER COLUMN status SET DEFAULT 'open';
ALTER TABLE public.ideas ALTER COLUMN tags SET DEFAULT '{}'::text[];
ALTER TABLE public.ideas ALTER COLUMN created_at SET DEFAULT now();

-- 4) RLS: reset to a single coherent policy set.
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ideas'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.ideas', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "ideas_select_public"
ON public.ideas
FOR SELECT
USING (true);

CREATE POLICY "ideas_insert_owner"
ON public.ideas
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "ideas_update_owner"
ON public.ideas
FOR UPDATE
TO authenticated
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "ideas_delete_owner"
ON public.ideas
FOR DELETE
TO authenticated
USING (auth.uid() = author_id);

COMMIT;

-- Quick verification:
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'public.ideas'::regclass
-- ORDER BY conname;
--
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname='public' AND tablename='ideas'
-- ORDER BY policyname;
