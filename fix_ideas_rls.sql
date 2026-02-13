-- ==============================================================================
-- FIX: IDEAS LOADING ISSUE (RLS POLICIES)
-- ==============================================================================
-- It appears the 'ideas' table might have RLS enabled (or defaulted on) but 
-- relies on policies that were missing in the previous schema updates.
-- This script ensures the table allows public reads and authenticated writes.

-- 1. Enable RLS (Standard Practice)
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;

-- 2. Allow EVERYONE (Public + Auth) to view ideas
DROP POLICY IF EXISTS "Ideas viewable by everyone" ON public.ideas;
CREATE POLICY "Ideas viewable by everyone" 
ON public.ideas FOR SELECT 
USING (true);

-- 3. Allow Authenticated users to create ideas
DROP POLICY IF EXISTS "Auth users can insert ideas" ON public.ideas;
CREATE POLICY "Auth users can insert ideas" 
ON public.ideas FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- 4. Allow Authors to update their own ideas
DROP POLICY IF EXISTS "Authors can update own ideas" ON public.ideas;
CREATE POLICY "Authors can update own ideas" 
ON public.ideas FOR UPDATE 
USING (auth.uid() = author_id);

-- 5. Allow Authors to delete their own ideas (Optional but good)
DROP POLICY IF EXISTS "Authors can delete own ideas" ON public.ideas;
CREATE POLICY "Authors can delete own ideas" 
ON public.ideas FOR DELETE 
USING (auth.uid() = author_id);
