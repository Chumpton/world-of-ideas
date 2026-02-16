-- Fix profiles where username or display_name contains an email address
-- This strips the @domain part, leaving only the prefix

-- 1. Show affected profiles BEFORE fix
SELECT id, username, display_name 
FROM public.profiles 
WHERE username LIKE '%@%' OR display_name LIKE '%@%';

-- 2. Fix username (strip email domain)
UPDATE public.profiles
SET username = split_part(username, '@', 1)
WHERE username LIKE '%@%';

-- 3. Fix display_name (strip email domain)
UPDATE public.profiles
SET display_name = split_part(display_name, '@', 1)
WHERE display_name LIKE '%@%';

-- 4. Set display_name to username where display_name is null
UPDATE public.profiles
SET display_name = username
WHERE display_name IS NULL AND username IS NOT NULL;

-- 5. Verify
SELECT id, username, display_name FROM public.profiles ORDER BY created_at DESC;
