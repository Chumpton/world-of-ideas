-- Canonical signup/profile display + influence defaults
-- Run in Supabase SQL editor.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Profiles defaults: new users must start at 0 influence.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS influence integer,
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

ALTER TABLE public.profiles
  ALTER COLUMN influence SET DEFAULT 0,
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN created_at SET DEFAULT now();

UPDATE public.profiles
SET influence = COALESCE(influence, 0)
WHERE influence IS NULL;

-- 2) Stop email-local-part from becoming display_name when metadata has a real display_name.
UPDATE public.profiles p
SET display_name = u.raw_user_meta_data->>'display_name'
FROM auth.users u
WHERE u.id = p.id
  AND NULLIF(u.raw_user_meta_data->>'display_name', '') IS NOT NULL
  AND (
    p.display_name IS NULL
    OR p.display_name = ''
    OR p.display_name LIKE '%@%'
    OR lower(p.display_name) = lower(split_part(COALESCE(u.email, ''), '@', 1))
  );

-- 3) Sanitize usernames if legacy rows used emails.
UPDATE public.profiles p
SET username = COALESCE(
  NULLIF(split_part(COALESCE(p.username, ''), '@', 1), ''),
  NULLIF(split_part(COALESCE(u.raw_user_meta_data->>'username', ''), '@', 1), ''),
  'user_' || substr(p.id::text, 1, 8)
)
FROM auth.users u
WHERE u.id = p.id
  AND (p.username IS NULL OR p.username = '' OR p.username LIKE '%@%');

UPDATE public.profiles
SET display_name = COALESCE(NULLIF(display_name, ''), username, 'User')
WHERE display_name IS NULL OR display_name = '';

-- 4) Canonical setup_profile: display_name comes from provided/display metadata, never email suffix.
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
    id, username, display_name, avatar_url, influence, created_at, updated_at
  )
  VALUES (
    v_uid, v_username, v_display_name, v_avatar, 0, now(), now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    username = COALESCE(NULLIF(v_username, ''), public.profiles.username),
    display_name = COALESCE(NULLIF(v_display_name, ''), public.profiles.display_name),
    avatar_url = COALESCE(v_avatar, public.profiles.avatar_url),
    influence = COALESCE(public.profiles.influence, 0),
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

-- Diagnostics:
-- SELECT id, username, display_name, influence, created_at FROM public.profiles ORDER BY created_at DESC LIMIT 20;
