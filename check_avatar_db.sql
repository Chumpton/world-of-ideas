-- Check specific user by Username
SELECT id, username, avatar_url 
FROM public.profiles 
WHERE username ILIKE 'CampWilkins%';

-- Check for ANY users with valid avatars
SELECT username, avatar_url 
FROM public.profiles 
WHERE avatar_url IS NOT NULL AND avatar_url != '' AND avatar_url NOT ILIKE '%ui-avatars%'
LIMIT 5;
