-- Minimal Signup + Editable Profile Support
-- Signup requires only email + display name + password.
-- Other profile fields are optional and can be edited later.

BEGIN;

-- Ensure commonly-used profile columns exist and are optional/defaulted.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS border_color TEXT DEFAULT '#7d5fff';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS influence INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]'::JSONB;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mentorship JSONB DEFAULT '{}'::JSONB;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'::JSONB;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'light';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.profiles ALTER COLUMN bio SET DEFAULT '';
ALTER TABLE public.profiles ALTER COLUMN location SET DEFAULT '';
ALTER TABLE public.profiles ALTER COLUMN skills SET DEFAULT '{}'::TEXT[];
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'user';
ALTER TABLE public.profiles ALTER COLUMN border_color SET DEFAULT '#7d5fff';
ALTER TABLE public.profiles ALTER COLUMN influence SET DEFAULT 0;
ALTER TABLE public.profiles ALTER COLUMN coins SET DEFAULT 0;
ALTER TABLE public.profiles ALTER COLUMN links SET DEFAULT '[]'::JSONB;
ALTER TABLE public.profiles ALTER COLUMN mentorship SET DEFAULT '{}'::JSONB;
ALTER TABLE public.profiles ALTER COLUMN badges SET DEFAULT '[]'::JSONB;
ALTER TABLE public.profiles ALTER COLUMN updated_at SET DEFAULT NOW();

-- Drop NOT NULL from optional profile fields (if currently enforced).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'bio'
  ) THEN
    ALTER TABLE public.profiles ALTER COLUMN bio DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'location'
  ) THEN
    ALTER TABLE public.profiles ALTER COLUMN location DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'skills'
  ) THEN
    ALTER TABLE public.profiles ALTER COLUMN skills DROP NOT NULL;
  END IF;
END $$;

-- Backfill missing names for existing users.
UPDATE public.profiles
SET
  username = COALESCE(NULLIF(username, ''), NULLIF(display_name, ''), 'User'),
  display_name = COALESCE(NULLIF(display_name, ''), NULLIF(username, ''), 'User'),
  updated_at = NOW()
WHERE username IS NULL OR username = '' OR display_name IS NULL OR display_name = '';

-- Signup helper RPC: keep minimal fields only, leave everything else for profile editing later.
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

  UPDATE public.profiles
  SET
    username = COALESCE(v_username, username),
    display_name = COALESCE(v_display_name, display_name, v_username),
    avatar_url = COALESCE(p_avatar_url, avatar_url),
    updated_at = NOW()
  WHERE id = auth.uid();

  SELECT row_to_json(p) INTO result FROM public.profiles p WHERE p.id = auth.uid();
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.setup_profile(TEXT, TEXT, TEXT) TO authenticated;

-- Auth trigger: create profile row from email + metadata only.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    avatar_url,
    influence,
    coins,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'username', ''),
      NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'username', ''),
      split_part(NEW.email, '@', 1)
    ),
    NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''),
    0,
    0,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;
