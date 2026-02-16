-- Make the 'avatars' bucket public
UPDATE storage.buckets
SET public = true
WHERE name = 'avatars';

-- Ensure authenticated users can upload
CREATE POLICY "Avatar Upload Policy"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'avatars' );

-- Ensure everyone can view avatars
CREATE POLICY "Avatar Public View Policy"
ON storage.objects
FOR SELECT
TO public
USING ( bucket_id = 'avatars' );
