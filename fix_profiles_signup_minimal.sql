-- Minimal profile/signup canonical fix
-- Purpose: keep profile data simple + stable for signup and profile card rendering.
-- Run in Supabase SQL editor.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Core + compatibility columns used by frontend/profile card
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS id uuid,
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS skills text[],
  ADD COLUMN IF NOT EXISTS links jsonb,
  ADD COLUMN IF NOT EXISTS theme_preference text,
  ADD COLUMN IF NOT EXISTS followers_count integer,
  ADD COLUMN IF NOT EXISTS following_count integer,
  ADD COLUMN IF NOT EXISTS submissions integer,
  ADD COLUMN IF NOT EXISTS influence integer,
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS is_banned boolean,
  ADD COLUMN IF NOT EXISTS banned_reason text,
  ADD COLUMN IF NOT EXISTS banned_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Keep legacy display columns harmless/defaulted
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS coins integer,
  ADD COLUMN IF NOT EXISTS tier text,
  ADD COLUMN IF NOT EXISTS border_color text,
  ADD COLUMN IF NOT EXISTS badges jsonb;

ALTER TABLE public.profiles
  ALTER COLUMN bio SET DEFAULT '',
  ALTER COLUMN location SET DEFAULT '',
  ALTER COLUMN skills SET DEFAULT '{}'::text[],
  ALTER COLUMN links SET DEFAULT '[]'::jsonb,
  ALTER COLUMN theme_preference SET DEFAULT 'light',
  ALTER COLUMN followers_count SET DEFAULT 0,
  ALTER COLUMN following_count SET DEFAULT 0,
  ALTER COLUMN submissions SET DEFAULT 0,
  ALTER COLUMN influence SET DEFAULT 0,
  ALTER COLUMN role SET DEFAULT 'user',
  ALTER COLUMN is_banned SET DEFAULT false,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN coins SET DEFAULT 0,
  ALTER COLUMN tier SET DEFAULT 'free',
  ALTER COLUMN border_color SET DEFAULT '#7d5fff',
  ALTER COLUMN badges SET DEFAULT '[]'::jsonb;

-- 2) Backfill core fields from auth metadata/email when available
UPDATE public.profiles p
SET
  username = COALESCE(
    NULLIF(split_part(COALESCE(u.raw_user_meta_data->>'username', ''), '@', 1), ''),
    NULLIF(split_part(COALESCE(u.email, ''), '@', 1), ''),
    NULLIF(split_part(COALESCE(p.username, ''), '@', 1), ''),
    'user_' || substr(p.id::text, 1, 8)
  ),
  display_name = COALESCE(
    NULLIF(u.raw_user_meta_data->>'display_name', ''),
    NULLIF(p.display_name, ''),
    NULLIF(split_part(COALESCE(u.raw_user_meta_data->>'username', ''), '@', 1), ''),
    NULLIF(split_part(COALESCE(u.email, ''), '@', 1), ''),
    'User'
  ),
  avatar_url = COALESCE(NULLIF(p.avatar_url, ''), NULLIF(u.raw_user_meta_data->>'avatar_url', '')),
  bio = COALESCE(p.bio, ''),
  location = COALESCE(p.location, ''),
  skills = COALESCE(p.skills, '{}'::text[]),
  links = COALESCE(p.links, '[]'::jsonb),
  theme_preference = CASE WHEN p.theme_preference IN ('light', 'dark') THEN p.theme_preference ELSE 'light' END,
  followers_count = COALESCE(p.followers_count, 0),
  following_count = COALESCE(p.following_count, 0),
  submissions = COALESCE(p.submissions, 0),
  influence = COALESCE(p.influence, 0),
  role = COALESCE(NULLIF(p.role, ''), 'user'),
  is_banned = COALESCE(p.is_banned, false),
  created_at = COALESCE(p.created_at, now()),
  updated_at = COALESCE(p.updated_at, now())
FROM auth.users u
WHERE u.id = p.id;

UPDATE public.profiles p
SET
  username = COALESCE(NULLIF(split_part(COALESCE(p.username, ''), '@', 1), ''), 'user_' || substr(p.id::text, 1, 8)),
  display_name = COALESCE(NULLIF(p.display_name, ''), NULLIF(split_part(COALESCE(p.username, ''), '@', 1), ''), 'User'),
  bio = COALESCE(p.bio, ''),
  location = COALESCE(p.location, ''),
  skills = COALESCE(p.skills, '{}'::text[]),
  links = COALESCE(p.links, '[]'::jsonb),
  theme_preference = CASE WHEN p.theme_preference IN ('light', 'dark') THEN p.theme_preference ELSE 'light' END,
  followers_count = COALESCE(p.followers_count, 0),
  following_count = COALESCE(p.following_count, 0),
  submissions = COALESCE(p.submissions, 0),
  influence = COALESCE(p.influence, 0),
  role = COALESCE(NULLIF(p.role, ''), 'user'),
  is_banned = COALESCE(p.is_banned, false),
  created_at = COALESCE(p.created_at, now()),
  updated_at = COALESCE(p.updated_at, now())
WHERE p.username IS NULL
   OR p.display_name IS NULL
   OR p.bio IS NULL
   OR p.location IS NULL
   OR p.skills IS NULL
   OR p.links IS NULL
   OR p.theme_preference IS NULL
   OR p.followers_count IS NULL
   OR p.following_count IS NULL
   OR p.submissions IS NULL
   OR p.influence IS NULL
   OR p.role IS NULL
   OR p.is_banned IS NULL
   OR p.created_at IS NULL
   OR p.updated_at IS NULL
   OR p.username LIKE '%@%';

-- 3) Username uniqueness (case-insensitive)
WITH ranked AS (
  SELECT id, username,
         row_number() OVER (PARTITION BY lower(username) ORDER BY created_at NULLS LAST, id) AS rn
  FROM public.profiles
)
UPDATE public.profiles p
SET username = p.username || '_' || substr(p.id::text, 1, 4)
FROM ranked r
WHERE p.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique_ci
ON public.profiles (lower(username));

-- 4) Updated-at trigger only
DROP TRIGGER IF EXISTS trg_set_profiles_updated_at ON public.profiles;
DROP FUNCTION IF EXISTS public.trg_set_profiles_updated_at();

CREATE OR REPLACE FUNCTION public.trg_set_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.trg_set_profiles_updated_at();

-- 5) Canonical setup_profile RPC for signup/profile hydration
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
  v_meta_username text;
  v_meta_display_name text;
  v_username text;
  v_display_name text;
  v_avatar text;
  result json;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT
    NULLIF(split_part(COALESCE(u.raw_user_meta_data->>'username', ''), '@', 1), ''),
    NULLIF(u.raw_user_meta_data->>'display_name', '')
  INTO v_meta_username, v_meta_display_name
  FROM auth.users u
  WHERE u.id = v_uid;

  v_username := COALESCE(
    NULLIF(split_part(COALESCE(p_username, ''), '@', 1), ''),
    v_meta_username,
    'user_' || substr(v_uid::text, 1, 8)
  );

  v_display_name := COALESCE(
    NULLIF(p_display_name, ''),
    v_meta_display_name,
    v_username,
    'User'
  );

  v_avatar := NULLIF(trim(COALESCE(p_avatar_url, '')), '');

  INSERT INTO public.profiles (
    id, username, display_name, avatar_url,
    bio, location, skills, links, theme_preference,
    followers_count, following_count, submissions, influence, role, is_banned,
    created_at, updated_at
  )
  VALUES (
    v_uid, v_username, v_display_name, v_avatar,
    '', '', '{}'::text[], '[]'::jsonb, 'light',
    0, 0, 0, 0, 'user', false,
    now(), now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    username = COALESCE(NULLIF(v_username, ''), public.profiles.username),
    display_name = COALESCE(NULLIF(v_display_name, ''), public.profiles.display_name),
    avatar_url = COALESCE(v_avatar, public.profiles.avatar_url),
    updated_at = now();

  SELECT row_to_json(p) INTO result
  FROM public.profiles p
  WHERE p.id = v_uid;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.setup_profile(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.setup_profile(text, text, text) TO authenticated;

-- 6) Profiles RLS only (safe reset)
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

COMMIT;

-- Diagnostics:
-- SELECT column_name, data_type, udt_name, column_default
-- FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='profiles'
-- ORDER BY ordinal_position;
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname='public' AND tablename='profiles'
-- ORDER BY policyname;
