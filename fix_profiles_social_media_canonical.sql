-- Canonical social profile model + policies + helper RPC
-- Run in Supabase SQL editor

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Canonical columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS skills text[],
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS links jsonb,
  ADD COLUMN IF NOT EXISTS followers_count integer,
  ADD COLUMN IF NOT EXISTS following_count integer,
  ADD COLUMN IF NOT EXISTS theme_preference text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

ALTER TABLE public.profiles
  ALTER COLUMN bio SET DEFAULT '',
  ALTER COLUMN skills SET DEFAULT '{}'::text[],
  ALTER COLUMN location SET DEFAULT '',
  ALTER COLUMN links SET DEFAULT '[]'::jsonb,
  ALTER COLUMN followers_count SET DEFAULT 0,
  ALTER COLUMN following_count SET DEFAULT 0,
  ALTER COLUMN theme_preference SET DEFAULT 'light',
  ALTER COLUMN updated_at SET DEFAULT now();

-- 2) Backfill nulls + sanitize username/display_name from email-like values
UPDATE public.profiles
SET
  username = COALESCE(
    NULLIF(split_part(COALESCE(username, ''), '@', 1), ''),
    NULLIF(split_part(COALESCE(display_name, ''), '@', 1), ''),
    'user_' || substr(id::text, 1, 8)
  ),
  display_name = COALESCE(
    NULLIF(display_name, ''),
    NULLIF(split_part(COALESCE(username, ''), '@', 1), ''),
    'User'
  ),
  bio = COALESCE(bio, ''),
  skills = COALESCE(skills, '{}'::text[]),
  location = COALESCE(location, ''),
  links = COALESCE(links, '[]'::jsonb),
  followers_count = COALESCE(followers_count, 0),
  following_count = COALESCE(following_count, 0),
  theme_preference = COALESCE(NULLIF(theme_preference, ''), 'light'),
  updated_at = COALESCE(updated_at, now())
WHERE
  username IS NULL
  OR display_name IS NULL
  OR bio IS NULL
  OR skills IS NULL
  OR location IS NULL
  OR links IS NULL
  OR followers_count IS NULL
  OR following_count IS NULL
  OR theme_preference IS NULL
  OR updated_at IS NULL
  OR username LIKE '%@%';

-- 3) De-duplicate usernames (case-insensitive) before unique index
WITH ranked AS (
  SELECT
    id,
    username,
    row_number() OVER (PARTITION BY lower(username) ORDER BY created_at NULLS LAST, id) AS rn
  FROM public.profiles
)
UPDATE public.profiles p
SET username = p.username || '_' || substr(p.id::text, 1, 4)
FROM ranked r
WHERE p.id = r.id AND r.rn > 1;

-- 4) Constraints/indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique_ci
ON public.profiles (lower(username));

CREATE INDEX IF NOT EXISTS idx_profiles_updated_at_desc
ON public.profiles (updated_at DESC);

-- 5) Updated_at trigger
CREATE OR REPLACE FUNCTION public.trg_set_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.trg_set_profiles_updated_at();

-- 6) Follow counters (if follows table exists)
CREATE OR REPLACE FUNCTION public.recalc_follow_counts(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles p
  SET
    followers_count = COALESCE((
      SELECT COUNT(*)::int FROM public.follows f WHERE f.following_id = p.id
    ), 0),
    following_count = COALESCE((
      SELECT COUNT(*)::int FROM public.follows f WHERE f.follower_id = p.id
    ), 0)
  WHERE p.id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_follow_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('INSERT','UPDATE') THEN
    PERFORM public.recalc_follow_counts(NEW.follower_id);
    PERFORM public.recalc_follow_counts(NEW.following_id);
  END IF;
  IF TG_OP IN ('DELETE','UPDATE') THEN
    PERFORM public.recalc_follow_counts(OLD.follower_id);
    PERFORM public.recalc_follow_counts(OLD.following_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.follows') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_sync_follow_counts ON public.follows;
    CREATE TRIGGER trg_sync_follow_counts
    AFTER INSERT OR UPDATE OR DELETE ON public.follows
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_sync_follow_counts();

    UPDATE public.profiles p
    SET
      followers_count = COALESCE(src.followers_count, 0),
      following_count = COALESCE(src.following_count, 0)
    FROM (
      SELECT
        p2.id,
        (SELECT COUNT(*)::int FROM public.follows f1 WHERE f1.following_id = p2.id) AS followers_count,
        (SELECT COUNT(*)::int FROM public.follows f2 WHERE f2.follower_id = p2.id) AS following_count
      FROM public.profiles p2
    ) src
    WHERE src.id = p.id;
  END IF;
END $$;

-- 7) RLS policies for profile behavior
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

CREATE POLICY profiles_insert_own
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_update_own
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 8) Canonical setup_profile RPC
CREATE OR REPLACE FUNCTION public.setup_profile(
  p_username text DEFAULT NULL,
  p_display_name text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_username text;
  v_display_name text;
  result json;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_username := COALESCE(NULLIF(split_part(COALESCE(p_username, ''), '@', 1), ''), 'user_' || substr(v_uid::text, 1, 8));
  v_display_name := COALESCE(NULLIF(p_display_name, ''), v_username, 'User');

  INSERT INTO public.profiles (id, username, display_name, avatar_url, created_at, updated_at)
  VALUES (v_uid, v_username, v_display_name, p_avatar_url, now(), now())
  ON CONFLICT (id) DO UPDATE
  SET
    username = COALESCE(v_username, public.profiles.username),
    display_name = COALESCE(v_display_name, public.profiles.display_name),
    avatar_url = COALESCE(p_avatar_url, public.profiles.avatar_url),
    updated_at = now();

  SELECT row_to_json(p) INTO result
  FROM public.profiles p
  WHERE p.id = v_uid;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.setup_profile(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.setup_profile(text, text, text) TO authenticated;

COMMIT;

-- Diagnostics
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' ORDER BY ordinal_position;
-- SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE schemaname='public' AND tablename='profiles' ORDER BY policyname;
-- SELECT username, display_name, followers_count, following_count FROM public.profiles ORDER BY updated_at DESC LIMIT 20;
