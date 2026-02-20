-- Fix profile display names (no email prefix presentation) + theme preference defaults
-- Run in Supabase SQL editor.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS theme_preference text,
  ALTER COLUMN theme_preference SET DEFAULT 'light';

-- Normalize theme values.
UPDATE public.profiles
SET theme_preference = CASE
  WHEN lower(coalesce(theme_preference, '')) = 'dark' THEN 'dark'
  ELSE 'light'
END
WHERE theme_preference IS NULL
   OR lower(theme_preference) NOT IN ('light', 'dark');

-- Display name must not be email-like; prefer metadata display_name, then existing username.
UPDATE public.profiles p
SET display_name = COALESCE(
  NULLIF(u.raw_user_meta_data->>'display_name', ''),
  NULLIF(p.username, ''),
  'User'
)
FROM auth.users u
WHERE u.id = p.id
  AND (
    p.display_name IS NULL
    OR p.display_name = ''
    OR p.display_name LIKE '%@%'
  );

-- Username must not be email-like.
UPDATE public.profiles p
SET username = COALESCE(
  NULLIF(split_part(COALESCE(u.raw_user_meta_data->>'username', ''), '@', 1), ''),
  NULLIF(split_part(COALESCE(p.username, ''), '@', 1), ''),
  'user_' || substr(p.id::text, 1, 8)
)
FROM auth.users u
WHERE u.id = p.id
  AND (
    p.username IS NULL
    OR p.username = ''
    OR p.username LIKE '%@%'
  );

-- Ensure setup_profile preserves explicit display_name and never falls back to email prefix.
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
    id, username, display_name, avatar_url, theme_preference, created_at, updated_at
  )
  VALUES (
    v_uid, v_username, v_display_name, v_avatar, 'light', now(), now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    username = COALESCE(NULLIF(v_username, ''), public.profiles.username),
    display_name = COALESCE(NULLIF(v_display_name, ''), public.profiles.display_name),
    avatar_url = COALESCE(v_avatar, public.profiles.avatar_url),
    theme_preference = COALESCE(public.profiles.theme_preference, 'light'),
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
-- SELECT id, username, display_name, theme_preference FROM public.profiles ORDER BY updated_at DESC LIMIT 20;
