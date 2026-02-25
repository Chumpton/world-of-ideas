-- profiles_display_name_canonical_patch.sql
-- Canonicalize identity to display_name and keep username as compatibility mirror.
-- Safe for mixed schemas.

BEGIN;

-- 1) Ensure display_name exists.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name text;

-- 2) Backfill display_name from existing safe value (never email prefix).
UPDATE public.profiles
SET display_name = COALESCE(
  NULLIF(display_name, ''),
  NULLIF(username, ''),
  'user_' || left(id::text, 8)
)
WHERE display_name IS NULL OR display_name = '';

-- 3) If username exists, keep it mirrored to display_name for app compatibility.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'username'
  ) THEN
    UPDATE public.profiles
    SET username = display_name
    WHERE COALESCE(username, '') <> COALESCE(display_name, '');
  END IF;
END $$;

-- 4) Enforce non-empty display_name for future writes.
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_display_name_not_blank
  CHECK (length(trim(COALESCE(display_name, ''))) > 0)
  NOT VALID;

ALTER TABLE public.profiles
  VALIDATE CONSTRAINT profiles_display_name_not_blank;

-- 5) Trigger: display_name is canonical; username mirrors it if username column exists.
CREATE OR REPLACE FUNCTION public.profiles_sync_identity_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  has_username boolean;
BEGIN
  NEW.display_name := NULLIF(trim(COALESCE(NEW.display_name, '')), '');

  IF NEW.display_name IS NULL THEN
    NEW.display_name := 'user_' || left(COALESCE(NEW.id::text, gen_random_uuid()::text), 8);
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'username'
  ) INTO has_username;

  IF has_username THEN
    NEW.username := NEW.display_name;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_sync_identity_fields ON public.profiles;
CREATE TRIGGER trg_profiles_sync_identity_fields
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.profiles_sync_identity_fields();

-- Optional (only after frontend no longer references username):
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS username;

COMMIT;

-- Diagnostics:
-- SELECT id, display_name, username FROM public.profiles LIMIT 50;