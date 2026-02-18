-- Repair avatar upload + profile avatar save pipeline
-- Run in Supabase SQL editor

BEGIN;

-- 1) Profiles RLS (coherent + minimal)
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

-- 2) Ensure setup_profile RPC exists for fallback saves
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
DECLARE result json;
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url, created_at, updated_at)
  VALUES (
    auth.uid(),
    COALESCE(NULLIF(p_username, ''), 'user_' || substr(auth.uid()::text, 1, 8)),
    COALESCE(NULLIF(p_display_name, ''), NULLIF(p_username, ''), 'User'),
    p_avatar_url,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    username = COALESCE(EXCLUDED.username, public.profiles.username),
    display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  SELECT row_to_json(p) INTO result
  FROM public.profiles p
  WHERE p.id = auth.uid();

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.setup_profile(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.setup_profile(text, text, text) TO authenticated;

-- 3) Storage buckets and policies for avatar upload
-- NOTE: Some environments do not own storage.objects in SQL editor sessions.
-- If ownership is missing, this block will be skipped with NOTICEs.
DO $$
DECLARE p record;
BEGIN
  BEGIN
    EXECUTE 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping ALTER TABLE storage.objects (insufficient privilege).';
  END;

  BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('avatars', 'avatars', true)
    ON CONFLICT (id) DO UPDATE SET public = true;

    INSERT INTO storage.buckets (id, name, public)
    VALUES ('avatar', 'avatar', true)
    ON CONFLICT (id) DO UPDATE SET public = true;
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping bucket upsert in storage.buckets (insufficient privilege).';
  END;

  BEGIN
    FOR p IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND (
          policyname ILIKE '%avatar%'
          OR policyname ILIKE '%avatars%'
        )
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', p.policyname);
    END LOOP;

    EXECUTE $sql$
      CREATE POLICY avatar_public_read
      ON storage.objects
      FOR SELECT
      USING (bucket_id IN ('avatars', 'avatar'))
    $sql$;

    EXECUTE $sql$
      CREATE POLICY avatar_upload
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id IN ('avatars', 'avatar')
        AND split_part(name, '/', 1) = auth.uid()::text
      )
    $sql$;

    EXECUTE $sql$
      CREATE POLICY avatar_update
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id IN ('avatars', 'avatar')
        AND split_part(name, '/', 1) = auth.uid()::text
      )
      WITH CHECK (
        bucket_id IN ('avatars', 'avatar')
        AND split_part(name, '/', 1) = auth.uid()::text
      )
    $sql$;

    EXECUTE $sql$
      CREATE POLICY avatar_delete
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id IN ('avatars', 'avatar')
        AND split_part(name, '/', 1) = auth.uid()::text
      )
    $sql$;
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping storage.objects policy reset (insufficient privilege).';
  END;
END $$;

COMMIT;

-- Diagnostics
-- select id, public from storage.buckets where id in ('avatars','avatar');
-- select policyname, cmd, qual, with_check from pg_policies where schemaname='storage' and tablename='objects' order by policyname;
-- select policyname, cmd, qual, with_check from pg_policies where schemaname='public' and tablename='profiles' order by policyname;
