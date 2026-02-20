-- Canonical identity: username is the only display identity.
-- display_name is mirrored from username for compatibility only.
-- Run in Supabase SQL editor.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS display_name text;

-- Remove email-like usernames and regenerate safe handles where needed.
UPDATE public.profiles p
SET username = COALESCE(
  NULLIF(split_part(COALESCE(p.username, ''), '@', 1), ''),
  NULLIF(split_part(COALESCE(u.raw_user_meta_data->>'username', ''), '@', 1), ''),
  NULLIF(split_part(COALESCE(u.raw_user_meta_data->>'display_name', ''), '@', 1), ''),
  'user_' || substr(p.id::text, 1, 8)
)
FROM auth.users u
WHERE u.id = p.id
  AND (p.username IS NULL OR p.username = '' OR p.username LIKE '%@%');

-- Mirror compatibility column.
UPDATE public.profiles
SET display_name = username
WHERE COALESCE(display_name, '') <> COALESCE(username, '');

-- setup_profile now treats username as canonical display value.
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
  v_avatar text;
  result json;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE(
    NULLIF(split_part(COALESCE(p_username, ''), '@', 1), ''),
    NULLIF(split_part(COALESCE(u.raw_user_meta_data->>'username', ''), '@', 1), ''),
    NULLIF(split_part(COALESCE(u.raw_user_meta_data->>'display_name', ''), '@', 1), ''),
    'user_' || substr(v_uid::text, 1, 8)
  )
  INTO v_username
  FROM auth.users u
  WHERE u.id = v_uid;

  v_avatar := NULLIF(trim(COALESCE(p_avatar_url, '')), '');

  INSERT INTO public.profiles (id, username, display_name, avatar_url, created_at, updated_at)
  VALUES (v_uid, v_username, v_username, v_avatar, now(), now())
  ON CONFLICT (id) DO UPDATE
  SET
    username = COALESCE(NULLIF(v_username, ''), public.profiles.username),
    display_name = COALESCE(NULLIF(v_username, ''), public.profiles.display_name),
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

COMMIT;

-- Diagnostics:
-- SELECT id, username, display_name FROM public.profiles ORDER BY updated_at DESC LIMIT 20;
