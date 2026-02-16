-- 1. FIX THE NAME Check
-- The user said "I never typed campwilkins". This was likely auto-generated from email.
-- Let's set a proper Display Name.
UPDATE public.profiles
SET 
  username = 'CampWilkins', 
  display_name = 'Camp Wilkins' 
WHERE email ILIKE 'campwilkins%';

-- 2. Verify Fix (Check Avatar too)
SELECT id, username, display_name, avatar_url FROM public.profiles WHERE email ILIKE 'campwilkins%';

-- 3. Influence Fix (Recalculate)
UPDATE public.profiles p
SET influence = (
  COALESCE((SELECT SUM(votes) FROM public.ideas WHERE author_id = p.id), 0) * 10 +
  COALESCE((SELECT SUM(votes) FROM public.idea_comments WHERE user_id = p.id), 0) * 2 +
  COALESCE((SELECT SUM(votes) FROM public.discussions WHERE author = p.username), 0) * 5 +
  COALESCE((SELECT SUM(votes) FROM public.discussion_comments WHERE user_id = p.id), 0) * 2
);
UPDATE public.profiles p
SET influence = (
  COALESCE((SELECT SUM(votes) FROM public.ideas WHERE author_id = p.id), 0) * 10 +
  COALESCE((SELECT SUM(votes) FROM public.idea_comments WHERE user_id = p.id), 0) * 2 +
  -- Discussions and Discussion Comments might relying on text matching if no FK exists or is named differently.
  -- Based on addDiscussion, it saves 'author' as username string.
  COALESCE((SELECT SUM(votes) FROM public.discussions WHERE author = p.username), 0) * 5 +
  COALESCE((SELECT SUM(votes) FROM public.discussion_comments WHERE user_id = p.id), 0) * 2
);
