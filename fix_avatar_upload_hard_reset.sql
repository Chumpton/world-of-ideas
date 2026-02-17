-- Hard reset avatar upload access for Supabase Storage.
-- Run in Supabase SQL editor.

BEGIN;

-- 1) Ensure RLS is enabled where expected.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2) Ensure both historical bucket names exist and are public.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatar', 'avatar', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3) Drop all avatar-related object policies to remove conflicts.
DO $$
DECLARE
  p record;
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
END $$;

-- 4) Recreate clean policies.
CREATE POLICY "Avatar public read"
ON storage.objects
FOR SELECT
USING (bucket_id IN ('avatars', 'avatar'));

CREATE POLICY "Avatar upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('avatars', 'avatar')
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "Avatar update"
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
);

CREATE POLICY "Avatar delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id IN ('avatars', 'avatar')
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- 5) Ensure profiles policies exist for save step after upload.
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by everyone"
ON public.profiles
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

COMMIT;

-- Diagnostics:
-- select id, name, public from storage.buckets where id in ('avatars','avatar');
-- select policyname, cmd, qual, with_check from pg_policies where schemaname='storage' and tablename='objects' order by policyname;
-- select policyname, cmd, qual, with_check from pg_policies where schemaname='public' and tablename='profiles' order by policyname;
