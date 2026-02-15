-- ==============================================================================
-- CLEANUP ORPHANED IDEAS
-- ==============================================================================
-- This script deletes ideas where the author_id no longer exists in the profiles table.

DELETE FROM public.ideas
WHERE author_id NOT IN (SELECT id FROM public.profiles);

-- Also clean up other orphaned data just in case cascades failed
DELETE FROM public.idea_comments
WHERE user_id NOT IN (SELECT id FROM public.profiles);

DELETE FROM public.guide_votes
WHERE user_id NOT IN (SELECT id FROM public.profiles);

DELETE FROM public.idea_comment_votes
WHERE user_id NOT IN (SELECT id FROM public.profiles);
