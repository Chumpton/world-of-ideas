-- profile_and_ideas_reliability_patch.sql
-- Run in Supabase SQL editor to stabilize profile saves + idea submissions.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Profiles columns commonly used by frontend
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS skills text[],
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

ALTER TABLE public.profiles
  ALTER COLUMN skills SET DEFAULT '{}'::text[],
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN created_at SET DEFAULT now();

UPDATE public.profiles
SET
  display_name = COALESCE(NULLIF(display_name, ''), NULLIF(username, ''), split_part(email, '@', 1), 'user'),
  username = COALESCE(NULLIF(username, ''), NULLIF(display_name, ''), split_part(email, '@', 1), 'user'),
  skills = COALESCE(skills, '{}'::text[]),
  updated_at = COALESCE(updated_at, now()),
  created_at = COALESCE(created_at, now());

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', p.policyname);
  END LOOP;
END $$;

CREATE POLICY profiles_select_public
ON public.profiles
FOR SELECT
USING (true);

CREATE POLICY profiles_insert_self
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update_self
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Ideas columns commonly used by submission/feed
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
  ADD COLUMN IF NOT EXISTS comment_count integer,
  ADD COLUMN IF NOT EXISTS view_count integer,
  ADD COLUMN IF NOT EXISTS shares integer,
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

ALTER TABLE public.ideas
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN title SET DEFAULT 'Untitled Idea',
  ALTER COLUMN category SET DEFAULT 'invention',
  ALTER COLUMN tags SET DEFAULT '{}'::text[],
  ALTER COLUMN votes SET DEFAULT 0,
  ALTER COLUMN status SET DEFAULT 'open',
  ALTER COLUMN comment_count SET DEFAULT 0,
  ALTER COLUMN view_count SET DEFAULT 0,
  ALTER COLUMN shares SET DEFAULT 0,
  ALTER COLUMN created_at SET DEFAULT now();

UPDATE public.ideas SET id = gen_random_uuid() WHERE id IS NULL;

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

CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON public.profiles (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_created_at_desc ON public.ideas (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_author_id ON public.ideas (author_id);

COMMIT;

-- Diagnostics
-- SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='profiles' ORDER BY policyname;
-- SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='ideas' ORDER BY policyname;
-- SELECT id, username, display_name, avatar_url FROM public.profiles LIMIT 20;
-- SELECT id, title, author_id, created_at FROM public.ideas ORDER BY created_at DESC LIMIT 20;
