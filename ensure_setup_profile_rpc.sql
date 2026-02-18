-- Ensure setup_profile RPC exists and is executable by authenticated users.
-- Run in Supabase SQL editor.

CREATE OR REPLACE FUNCTION public.setup_profile(
  p_username TEXT DEFAULT NULL,
  p_display_name TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
  v_display_name TEXT;
  result JSON;
BEGIN
  v_display_name := NULLIF(BTRIM(p_display_name), '');
  v_username := NULLIF(BTRIM(p_username), '');

  IF v_display_name IS NULL THEN
    v_display_name := v_username;
  END IF;
  IF v_username IS NULL THEN
    v_username := v_display_name;
  END IF;

  IF v_display_name IS NULL THEN
    v_display_name := split_part(COALESCE((SELECT email FROM auth.users WHERE id = auth.uid()), 'user@example.com'), '@', 1);
  END IF;
  IF v_username IS NULL THEN
    v_username := v_display_name;
  END IF;

  INSERT INTO public.profiles (id, username, display_name, avatar_url, created_at, updated_at)
  VALUES (auth.uid(), v_username, v_display_name, p_avatar_url, now(), now())
  ON CONFLICT (id) DO UPDATE
  SET
    username = COALESCE(EXCLUDED.username, public.profiles.username),
    display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  SELECT row_to_json(p) INTO result FROM public.profiles p WHERE p.id = auth.uid();
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.setup_profile(TEXT, TEXT, TEXT) TO authenticated;
