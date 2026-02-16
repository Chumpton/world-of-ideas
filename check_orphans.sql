-- Check for profiles that do NOT have a corresponding user in auth.users
SELECT * FROM public.profiles 
WHERE id NOT IN (SELECT id FROM auth.users);

-- Check for duplicate emails in auth.users (shouldn't happen but good to check)
SELECT email, count(*) 
FROM auth.users 
GROUP BY email 
HAVING count(*) > 1;

-- Check for duplicate usernames in profiles
SELECT username, count(*) 
FROM public.profiles 
GROUP BY username 
HAVING count(*) > 1;
