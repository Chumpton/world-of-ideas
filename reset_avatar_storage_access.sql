-- Reset avatar storage access for both common bucket names: avatars / avatar
BEGIN;

-- Ensure bucket(s) exist and are public-readable
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatar', 'avatar', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Clean old named policies if present
DROP POLICY IF EXISTS "Avatar public read" ON storage.objects;
DROP POLICY IF EXISTS "Avatar upload" ON storage.objects;
DROP POLICY IF EXISTS "Avatar update" ON storage.objects;
DROP POLICY IF EXISTS "Avatar delete" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;

-- Read: anyone can read avatar objects from either bucket
CREATE POLICY "Avatar public read"
ON storage.objects
FOR SELECT
USING (bucket_id IN ('avatars', 'avatar'));

-- Insert: authenticated user can upload only into their own folder
CREATE POLICY "Avatar upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('avatars', 'avatar')
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- Update: own folder only
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

-- Delete: own folder only
CREATE POLICY "Avatar delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id IN ('avatars', 'avatar')
  AND split_part(name, '/', 1) = auth.uid()::text
);

COMMIT;

-- Diagnostics
-- select id, name, public from storage.buckets where id in ('avatars','avatar');
-- select policyname, cmd, qual, with_check from pg_policies where schemaname='storage' and tablename='objects' order by policyname;
