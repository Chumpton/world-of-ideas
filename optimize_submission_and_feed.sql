-- Submission + Feed Performance Hardening
-- Safe to run multiple times.

BEGIN;

-- Ensure idea submission-friendly defaults.
ALTER TABLE public.ideas ALTER COLUMN votes SET DEFAULT 0;
ALTER TABLE public.ideas ALTER COLUMN status SET DEFAULT 'open';
ALTER TABLE public.ideas ALTER COLUMN tags SET DEFAULT '{}'::text[];
ALTER TABLE public.ideas ALTER COLUMN roles_needed SET DEFAULT '[]'::jsonb;
ALTER TABLE public.ideas ALTER COLUMN resources_needed SET DEFAULT '[]'::jsonb;
ALTER TABLE public.ideas ALTER COLUMN comment_count SET DEFAULT 0;
ALTER TABLE public.ideas ALTER COLUMN view_count SET DEFAULT 0;
ALTER TABLE public.ideas ALTER COLUMN shares SET DEFAULT 0;
ALTER TABLE public.ideas ALTER COLUMN created_at SET DEFAULT now();

UPDATE public.ideas
SET
  votes = COALESCE(votes, 0),
  status = COALESCE(NULLIF(status, ''), 'open'),
  tags = COALESCE(tags, '{}'::text[]),
  roles_needed = COALESCE(roles_needed, '[]'::jsonb),
  resources_needed = COALESCE(resources_needed, '[]'::jsonb),
  comment_count = COALESCE(comment_count, 0),
  view_count = COALESCE(view_count, 0),
  shares = COALESCE(shares, 0),
  created_at = COALESCE(created_at, now())
WHERE
  votes IS NULL
  OR status IS NULL
  OR status = ''
  OR tags IS NULL
  OR roles_needed IS NULL
  OR resources_needed IS NULL
  OR comment_count IS NULL
  OR view_count IS NULL
  OR shares IS NULL
  OR created_at IS NULL;

-- Keep RPC signature aligned with frontend call: p_idea_id
CREATE OR REPLACE FUNCTION public.increment_idea_views(p_idea_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ideas
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = p_idea_id;
END;
$$;

COMMIT;

-- Read-heavy index set for cohesive cached/uncached fetch paths.
CREATE INDEX IF NOT EXISTS idx_ideas_created_at_desc ON public.ideas (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_author_id ON public.ideas (author_id);
CREATE INDEX IF NOT EXISTS idx_ideas_category_created_at ON public.ideas (category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussions_created_at_desc ON public.discussions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guides_created_at_desc ON public.guides (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows (following_id);
CREATE INDEX IF NOT EXISTS idx_idea_votes_idea_id ON public.idea_votes (idea_id);
CREATE INDEX IF NOT EXISTS idx_idea_votes_user_id ON public.idea_votes (user_id);
