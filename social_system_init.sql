-- ==============================================================================
-- WORLD OF IDEAS: SOCIAL SYSTEM INITIALIZATION
-- ==============================================================================
-- This script initializes the core social features: Profiles, Follows, Comments, Notifications.
-- Run this to "Scan and Fix" your entire social layer.

-- 1. SOCIAL GRAPH (Follows)
CREATE TABLE IF NOT EXISTS public.follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Everyone can see who follows whom
DROP POLICY IF EXISTS "Follows viewable by everyone" ON public.follows;
CREATE POLICY "Follows viewable by everyone" 
ON public.follows FOR SELECT USING (true);

-- Auth users can follow/unfollow
DROP POLICY IF EXISTS "Auth users can follow" ON public.follows;
CREATE POLICY "Auth users can follow" 
ON public.follows FOR INSERT 
WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Auth users can unfollow" ON public.follows;
CREATE POLICY "Auth users can unfollow" 
ON public.follows FOR DELETE 
USING (auth.uid() = follower_id);


-- 2. DISCUSSIONS & COMMENTS (Hierarchical)
CREATE TABLE IF NOT EXISTS public.idea_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    author TEXT,          
    author_avatar TEXT,   
    parent_id UUID REFERENCES public.idea_comments(id), -- Threading
    votes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id)
);

ALTER TABLE public.idea_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comments viewable by everyone" ON public.idea_comments;
CREATE POLICY "Comments viewable by everyone" 
ON public.idea_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users can insert comments" ON public.idea_comments;
CREATE POLICY "Auth users can insert comments" 
ON public.idea_comments FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');


-- 3. NOTIFICATIONS SYSTEM
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- Who receives it
    type TEXT, -- 'follow', 'comment', 'upvote', 'fork'
    message TEXT,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id);

-- System/Users can trigger notifications (Insert policy is usually broad for triggers, or use Service Role)
-- allowing auth users to insert notifications for OTHERS is acceptable in this simple architecture
DROP POLICY IF EXISTS "Users can create notifications" ON public.notifications;
CREATE POLICY "Users can create notifications" 
ON public.notifications FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Users can mark THEIR notifications as read
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" 
ON public.notifications FOR UPDATE 
USING (auth.uid() = user_id);


-- 4. ENSURE PROFILES ARE PUBLIC
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable" ON public.profiles;
CREATE POLICY "Public profiles are viewable" 
ON public.profiles FOR SELECT USING (true);

-- 5. ENSURE IDEAS ARE PUBLIC
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ideas viewable by everyone" ON public.ideas;
CREATE POLICY "Ideas viewable by everyone" 
ON public.ideas FOR SELECT USING (true);

