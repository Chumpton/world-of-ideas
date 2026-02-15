-- ==============================================================================
-- FIX DATA INTEGRITY: INFLUENCE & USERNAMES
-- ==============================================================================

-- 1. RECALCULATE INFLUENCE
-- Logic: Influence = Sum of votes on Ideas + Guide Votes + Comment Votes (if any)
-- This resets everyone's influence to their "earned" score, ignoring previous spending (for now, to fix the 'low number' issue).

WITH calculated_scores AS (
    SELECT 
        p.id as profile_id,
        COALESCE((SELECT SUM(votes) FROM public.ideas WHERE author_id = p.id), 0) +
        COALESCE((SELECT SUM(direction) FROM public.guide_votes gv JOIN public.guides g ON g.id = gv.guide_id WHERE g.author_id = p.id), 0) +
        COALESCE((SELECT SUM(direction) FROM public.idea_comment_votes icv JOIN public.idea_comments ic ON ic.id = icv.comment_id WHERE ic.user_id = p.id), 0) 
        as total_score
    FROM public.profiles p
)
UPDATE public.profiles
SET influence = cs.total_score
FROM calculated_scores cs
WHERE profiles.id = cs.profile_id;

-- 2. FIX MISSING USERNAMES
-- If a profile has no username, try to set a default (checking for collision is hard in pure SQL without auth.users access, so we use a placeholder)
-- Users can update this in their profile later.
UPDATE public.profiles
SET username = 'User_' || substring(id::text, 1, 8)
WHERE username IS NULL OR username = '' OR username = 'User';

-- 3. ENSURE AVATARS
-- If avatar is missing, let the frontend handle the default, but ensure the column isn't null if possible (or leave null for logic to handle).
-- Currently logic handles null, so we leave it.

