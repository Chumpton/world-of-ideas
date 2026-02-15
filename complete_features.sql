-- ==============================================================================
-- MIGRATION: COMPLETE FEATURE SET
-- ==============================================================================
-- This script creates the missing tables for Resources, Bounties, Applications, and ensures Groups/Clans support.
-- Run this via the Supabase SQL Editor.

-- 1. RESOURCES (For Pledging)
CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g. "3D Printer", "Legal Advice"
    type TEXT DEFAULT 'other', -- 'funding', 'material', 'service', 'other'
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'fulfilled'
    pledged_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- User who pledged it
    pledger_name TEXT, -- Denormalized for display if needed
    quantity INTEGER DEFAULT 1,
    estimated_value DECIMAL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- Policies for Resources
DROP POLICY IF EXISTS "Resources viewable by everyone" ON public.resources;
CREATE POLICY "Resources viewable by everyone" ON public.resources FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users can pledge resources" ON public.resources;
CREATE POLICY "Auth users can pledge resources" ON public.resources FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 2. BOUNTIES (For Tasks/Jobs)
CREATE TABLE IF NOT EXISTS public.bounties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES public.profiles(id),
    title TEXT NOT NULL,
    description TEXT,
    reward_amount INTEGER DEFAULT 0, -- Coins/Credits
    status TEXT DEFAULT 'open', -- 'open', 'assigned', 'completed', 'verified'
    assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    bounty_data JSONB DEFAULT '{}' -- flexible extra data
);

ALTER TABLE public.bounties ENABLE ROW LEVEL SECURITY;

-- Policies for Bounties
DROP POLICY IF EXISTS "Bounties viewable by everyone" ON public.bounties;
CREATE POLICY "Bounties viewable by everyone" ON public.bounties FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users can create bounties" ON public.bounties;
CREATE POLICY "Auth users can create bounties" ON public.bounties FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Creators can update bounties" ON public.bounties;
CREATE POLICY "Creators can update bounties" ON public.bounties FOR UPDATE USING (auth.uid() = creator_id);

-- 3. APPLICATIONS (For Roles)
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE,
    applicant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_name TEXT NOT NULL, -- e.g. "Frontend Developer"
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    message TEXT, -- Cover letter / note
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Policies for Applications
DROP POLICY IF EXISTS "Applications viewable by idea author or applicant" ON public.applications;
-- (This requires joining ideas, which can be complex in RLS. Simplified: Applicant sees, Idea owner sees)
-- For now, allow public read OR restrict. Let's start with public read for simplicity in debugging, then restrict.
CREATE POLICY "Applications viewable by everyone" ON public.applications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users can apply" ON public.applications;
CREATE POLICY "Auth users can apply" ON public.applications FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- 4. ENSURE PROFILES HAVE COINS
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 100; -- Starting balance
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]';

-- 5. ENSURE GROUPS (If not already created by groups_feature.sql)
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    banner_url TEXT,
    leader_id UUID REFERENCES public.profiles(id),
    color TEXT DEFAULT '#7d5fff',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Groups viewable by everyone" ON public.groups;
CREATE POLICY "Groups viewable by everyone" ON public.groups FOR SELECT USING (true);


-- 6. GRANT PERMISSIONS
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
