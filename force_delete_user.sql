-- ==============================================================================
-- FORCE DELETE USER (Fixes "User Already Exists")
-- ==============================================================================
-- Deleting from 'public.profiles' only removes the profile data.
-- The login credentials live in 'auth.users'. You must delete from there.
-- NOTE: This usually cascades and deletes the profile too.

-- Replace with the specific email you want to delete:
DELETE FROM auth.users WHERE email = 'your_email@example.com';

-- OR to delete ALL users (WARNING: WIPES ALL LOGINS):
-- DELETE FROM auth.users;
