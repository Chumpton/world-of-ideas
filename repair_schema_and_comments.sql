-- ==============================================================================
-- UNIVERSAL REPAIR SCRIPT: COHESIVE SYSTEM FIX
-- ==============================================================================
-- 1. Creates missing 'idea_comments' table (required for comments to work)
-- 2. Refreshes 'ideas' RLS policies (fixes feed loading)
-- 3. Ensures 'profiles' are writable (fixes login/profile creation)

-- ==============================================================================
-- 1. FIX COMMENTS (Missing Table)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.idea_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idea_id TEXT REFERENCES public.ideas(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    author TEXT,          -- Denormalized username
    author_avatar TEXT,   -- Denormalized avatar
    parent_id UUID REFERENCES public.idea_comments(id), -- For nested replies
    votes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) -- Optional link to auth
);

-- Enable RLS
ALTER TABLE public.idea_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view comments
DROP POLICY IF EXISTS "Comments viewable by everyone" ON public.idea_comments;
CREATE POLICY "Comments viewable by everyone" 
ON public.idea_comments FOR SELECT USING (true);

-- Policy: Auth users can post comments
DROP POLICY IF EXISTS "Auth users can insert comments" ON public.idea_comments;
CREATE POLICY "Auth users can insert comments" 
ON public.idea_comments FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Policy: Authors can update/delete own comments (based on user_id if present, or potentially author name match relative to auth? 
-- Safer to rely on user_id if we have it, but AppContext might not send it. 
-- Let's update AppContext to send user_id, but for now allow insert.)

-- ==============================================================================
-- 2. FIX IDEAS (Feed Loading)
-- ==============================================================================
-- Ensure correct RLS policies for Ideas
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ideas viewable by everyone" ON public.ideas;
CREATE POLICY "Ideas viewable by everyone" 
ON public.ideas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users can insert ideas" ON public.ideas;
CREATE POLICY "Auth users can insert ideas" 
ON public.ideas FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authors can update own ideas" ON public.ideas;
CREATE POLICY "Authors can update own ideas" 
ON public.ideas FOR UPDATE 
USING (auth.uid() = author_id);

-- ==============================================================================
-- 3. FIX PROFILES (Simplicity for Login)
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

-- Allow users to insert/update their OWN profile
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- ==============================================================================
-- 4. CLEANUP (Optional)
-- ==============================================================================
-- If you have a broken 'public.comments' table that is unused, you can drop it manually.
-- DROP TABLE IF EXISTS public.comments;
