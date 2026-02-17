-- Run this in Supabase SQL Editor to see EXACTLY what the DB has for your profile.
-- This will reveal why the UI shows wrong username, 100 influence, and no avatar.

-- 1. Show ALL profile data for the logged-in user (by email)
SELECT 
    id,
    username,
    display_name,
    avatar_url,
    influence,
    bio,
    skills,
    location,
    coins,
    border_color,
    role,
    created_at,
    updated_at
FROM profiles 
WHERE username ILIKE '%campwilkins%' 
   OR username ILIKE '%camp%'
ORDER BY created_at DESC;

-- 2. Check if there are multiple profiles (duplicate accounts)
SELECT count(*), username, display_name, avatar_url, influence 
FROM profiles 
GROUP BY username, display_name, avatar_url, influence
ORDER BY count(*) DESC;

-- 3. Check the auth.users metadata to see what Supabase auth has
SELECT 
    id,
    email,
    raw_user_meta_data->>'username' as meta_username,
    raw_user_meta_data->>'display_name' as meta_display_name,
    raw_user_meta_data->>'avatar_url' as meta_avatar_url,
    created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 4. Check if there's a trigger setting default influence to 100
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'profiles';

-- 5. Check column defaults for the profiles table
SELECT column_name, column_default, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
