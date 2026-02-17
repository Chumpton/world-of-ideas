-- ============================================================
-- FIX PROFILES TABLE: Add all missing columns the app expects
-- Run this ONCE in Supabase SQL Editor
-- ============================================================

-- 1. DIAGNOSTIC: Show current columns (run this section first to see what's missing)
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. ADD ALL MISSING COLUMNS
-- Each uses IF NOT EXISTS so it's safe to re-run
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS expertise TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'explorer';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS border_color TEXT DEFAULT '#7d5fff';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS influence INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 100;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS submissions INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mentorship JSONB DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'dark';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. FIX: Set display_name = username for any rows where display_name is NULL
UPDATE public.profiles
SET display_name = username
WHERE display_name IS NULL AND username IS NOT NULL;

-- 4. FIX: Set influence to 0 for new users (100 was wrong default)
-- Only reset if influence is exactly 100 and user has no actual activity
UPDATE public.profiles p
SET influence = 0
WHERE p.influence = 100
  AND NOT EXISTS (
    SELECT 1 FROM public.ideas WHERE author_id = p.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.idea_comments WHERE user_id = p.id
  );

-- 5. FIX: Ensure the default for influence going forward is 0, not 100
ALTER TABLE public.profiles ALTER COLUMN influence SET DEFAULT 0;

-- 6. VERIFY: Show all profiles after fix
SELECT id, username, display_name, avatar_url, influence, coins, bio, 
       skills, location, role, tier, submissions, border_color,
       created_at, updated_at
FROM public.profiles
ORDER BY created_at DESC;
