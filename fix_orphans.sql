-- 1. Count orphaned profiles before deletion (for logging)
select count(*) as orphans_found from public.profiles 
where id not in (select id from auth.users);

-- 2. Delete the orphans
DELETE FROM public.profiles
WHERE id NOT IN (SELECT id FROM auth.users);

-- 3. Add Foreign Key Constraint with CASCADE DELETE
-- This ensures future deletions of users also delete the profile
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_id_fkey
FOREIGN KEY (id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 4. Verify no orphans remain
select count(*) as orphans_remaining from public.profiles 
where id not in (select id from auth.users);
