-- Fix your specific profile
-- Run in Supabase SQL Editor

-- 1. Check if you have ideas or comments (this is why influence stayed at 100)
SELECT 'ideas' as type, count(*) FROM public.ideas WHERE author_id = '57ed2178-7b09-4c07-86ab-0ef7d091a1a8'
UNION ALL
SELECT 'comments' as type, count(*) FROM public.idea_comments WHERE user_id = '57ed2178-7b09-4c07-86ab-0ef7d091a1a8';

-- 2. Force reset influence to 0
UPDATE public.profiles
SET influence = 0
WHERE id = '57ed2178-7b09-4c07-86ab-0ef7d091a1a8';

-- 3. Verify
SELECT username, display_name, influence, avatar_url
FROM public.profiles
WHERE id = '57ed2178-7b09-4c07-86ab-0ef7d091a1a8';
