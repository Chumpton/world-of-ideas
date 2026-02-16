-- Check profiles for avatar_url
SELECT id, username, email, avatar_url FROM profiles ORDER BY created_at DESC LIMIT 10;

-- Check storage bucket configuration (if possible via SQL, otherwise inferred)
-- Actually, we can't easily check bucket config via simple SQL query here without specific extensions,
-- but we can verify if the 'avatars' bucket exists in `storage.buckets`.
SELECT * FROM storage.buckets WHERE name = 'avatars';

-- Check policies on storage.objects for avatars
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
