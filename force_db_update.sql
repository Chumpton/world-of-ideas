-- FORCE UPDATE AVATAR (Bypassing RLS because you run this in Dashboard)
-- User ID: 57ed2178-7b09-4c07-86ab-0ef7d091a1a8
-- File: avatar_1771262206107.png

UPDATE public.profiles
SET avatar_url = 'https://ntugltfyugwnnelihsgo.supabase.co/storage/v1/object/public/avatars/57ed2178-7b09-4c07-86ab-0ef7d091a1a8/avatar_1771262206107.png'
WHERE id = '57ed2178-7b09-4c07-86ab-0ef7d091a1a8';

-- VERIFY IMMEDIATELY
SELECT id, username, avatar_url FROM public.profiles WHERE id = '57ed2178-7b09-4c07-86ab-0ef7d091a1a8';
