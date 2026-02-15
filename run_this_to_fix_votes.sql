-- ==============================================================================
-- MIGRATION: ADD COMMENT VOTES TABLE
-- ==============================================================================
-- This script creates the missing 'idea_comment_votes' table to track user votes on comments.
-- It works similarly to 'idea_votes' and ensures votes persist across sessions.

CREATE TABLE IF NOT EXISTS public.idea_comment_votes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    comment_id UUID REFERENCES public.idea_comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id), -- better to reference auth.users for strict auth binding
    direction INTEGER NOT NULL CHECK (direction IN (1, -1)), -- 1 for upvote, -1 for downvote
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- Enable RLS
ALTER TABLE public.idea_comment_votes ENABLE ROW LEVEL SECURITY;

-- 1. Everyone can view votes (needed for counting, though typically counts are aggregated)
DROP POLICY IF EXISTS "Comment votes viewable by everyone" ON public.idea_comment_votes;
CREATE POLICY "Comment votes viewable by everyone" 
ON public.idea_comment_votes FOR SELECT USING (true);

-- 2. Auth users can insert/update their OWN votes
DROP POLICY IF EXISTS "Users can vote on comments" ON public.idea_comment_votes;
CREATE POLICY "Users can vote on comments" 
ON public.idea_comment_votes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own comment votes" ON public.idea_comment_votes;
CREATE POLICY "Users can update own comment votes" 
ON public.idea_comment_votes FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comment votes" ON public.idea_comment_votes;
CREATE POLICY "Users can delete own comment votes" 
ON public.idea_comment_votes FOR DELETE 
USING (auth.uid() = user_id);
