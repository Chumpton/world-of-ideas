-- ==============================================================================
-- MIGRATION: ADD GUIDES TABLES
-- ==============================================================================
-- This script creates the missing 'guides' table and its related tables.

-- 1. GUIDES TABLE
CREATE TABLE IF NOT EXISTS public.guides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    category TEXT,          -- Invention, Policy, etc.
    snippet TEXT,           -- Short description for card
    content TEXT,           -- Full markdown content
    author_id UUID REFERENCES auth.users(id), -- Link to auth user
    author_name TEXT,       -- Denormalized fallback
    votes INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Guides viewable by everyone" ON public.guides;
CREATE POLICY "Guides viewable by everyone" ON public.guides FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users can create guides" ON public.guides;
CREATE POLICY "Auth users can create guides" ON public.guides FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authors can update own guides" ON public.guides;
CREATE POLICY "Authors can update own guides" ON public.guides FOR UPDATE USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can delete own guides" ON public.guides;
CREATE POLICY "Authors can delete own guides" ON public.guides FOR DELETE USING (auth.uid() = author_id);


-- 2. GUIDE VOTES TABLE
CREATE TABLE IF NOT EXISTS public.guide_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guide_id UUID REFERENCES public.guides(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    direction INTEGER NOT NULL CHECK (direction IN (1, -1)),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(guide_id, user_id)
);

ALTER TABLE public.guide_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Guide votes viewable by everyone" ON public.guide_votes;
CREATE POLICY "Guide votes viewable by everyone" ON public.guide_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can vote on guides" ON public.guide_votes;
CREATE POLICY "Users can vote on guides" ON public.guide_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own guide votes" ON public.guide_votes;
CREATE POLICY "Users can update own guide votes" ON public.guide_votes FOR UPDATE USING (auth.uid() = user_id);


-- 3. GUIDE COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.guide_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guide_id UUID REFERENCES public.guides(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    author_id UUID REFERENCES auth.users(id),
    author_name TEXT,       -- Denormalized
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.guide_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Guide comments viewable by everyone" ON public.guide_comments;
CREATE POLICY "Guide comments viewable by everyone" ON public.guide_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users can comment on guides" ON public.guide_comments;
CREATE POLICY "Auth users can comment on guides" ON public.guide_comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
