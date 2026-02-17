-- Debug + Fix: Profile Update + Avatar Upload Pipeline
-- Run in Supabase SQL Editor

BEGIN;

-- 1) Ensure profiles RLS is enabled and update policy exists
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

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

-- 2) Ensure avatars bucket exists and is public-readable
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3) Storage policies for avatar paths: {user_id}/avatar_*.ext
-- remove common conflicting variants
DROP POLICY IF EXISTS "Avatar public read" ON storage.objects;
DROP POLICY IF EXISTS "Avatar upload" ON storage.objects;
DROP POLICY IF EXISTS "Avatar update" ON storage.objects;
DROP POLICY IF EXISTS "Avatar delete" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;

CREATE POLICY "Avatar public read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Avatar upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "Avatar update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND split_part(name, '/', 1) = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "Avatar delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND split_part(name, '/', 1) = auth.uid()::text
);

COMMIT;

-- 4) Diagnostics (run after commit)
-- A) your current auth uid + matching profile row
-- select auth.uid() as auth_uid;
-- select id, username, display_name, avatar_url, updated_at from public.profiles where id = auth.uid();

-- B) profile policies
-- select policyname, cmd, qual, with_check from pg_policies where schemaname='public' and tablename='profiles';

-- C) storage policies
-- select policyname, cmd, qual, with_check from pg_policies where schemaname='storage' and tablename='objects';
