-- Full Profiles Audit: Show ALL profiles with their key fields
SELECT 
    id,
    username,
    display_name,
    avatar_url,
    bio,
    influence,
    created_at
FROM public.profiles
ORDER BY created_at DESC;
