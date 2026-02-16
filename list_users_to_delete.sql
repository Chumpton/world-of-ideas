-- List all users so you can find the "Ghosts"
-- If they appear here, they are REAL users (not orphans), just unwanted ones.

SELECT 
    p.username, 
    p.id as user_id, 
    u.email, 
    p.created_at 
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC;

-- COPY THE ID of the user you want to delete and run:
-- DELETE FROM auth.users WHERE id = 'THE_ID_HERE';
