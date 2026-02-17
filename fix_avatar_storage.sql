-- ============================================================
-- FIX SUPABASE STORAGE: Create 'avatars' bucket with public access
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Check if the 'avatars' bucket exists
SELECT id, name, public, created_at 
FROM storage.buckets 
WHERE name = 'avatars';

-- 2. Create the bucket if it doesn't exist (public so URLs work without tokens)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Allow authenticated users to upload their own avatars
-- Policy: user can upload to their own folder (userId/*)
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- 4. Allow authenticated users to update/overwrite their own avatars
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- 5. Allow anyone to view avatars (public read)
DROP POLICY IF EXISTS "Avatars are publicly viewable" ON storage.objects;
CREATE POLICY "Avatars are publicly viewable" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'avatars');

-- 6. Allow users to delete their own avatars
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- 7. Verify bucket exists and is public
SELECT id, name, public FROM storage.buckets WHERE name = 'avatars';

-- 8. Verify policies
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage';
