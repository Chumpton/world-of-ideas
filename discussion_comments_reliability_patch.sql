-- discussion_comments_reliability_patch.sql
-- Stabilizes discussion comment insert/read paths and speeds nested comment loads.

BEGIN;

ALTER TABLE public.discussion_comments
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS discussion_id uuid,
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS parent_id uuid,
  ADD COLUMN IF NOT EXISTS votes integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE public.discussion_comment_votes
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS comment_id uuid,
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS vote_type integer,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE public.discussion_comments
  ALTER COLUMN votes SET DEFAULT 0,
  ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.discussion_comment_votes
  ALTER COLUMN vote_type SET DEFAULT 1,
  ALTER COLUMN created_at SET DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_discussion_comments_discussion_created
  ON public.discussion_comments (discussion_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_discussion_comments_parent
  ON public.discussion_comments (parent_id);

CREATE INDEX IF NOT EXISTS idx_discussion_comments_user
  ON public.discussion_comments (user_id);

CREATE INDEX IF NOT EXISTS idx_discussion_comment_votes_comment
  ON public.discussion_comment_votes (comment_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_discussion_comment_votes_unique
  ON public.discussion_comment_votes (comment_id, user_id);

ALTER TABLE public.discussion_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_comment_votes ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'discussion_comments'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.discussion_comments', p.policyname);
  END LOOP;

  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'discussion_comment_votes'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.discussion_comment_votes', p.policyname);
  END LOOP;
END $$;

CREATE POLICY discussion_comments_select_public
ON public.discussion_comments
FOR SELECT
USING (true);

CREATE POLICY discussion_comments_insert_authenticated
ON public.discussion_comments
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY discussion_comments_update_owner
ON public.discussion_comments
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY discussion_comment_votes_select_public
ON public.discussion_comment_votes
FOR SELECT
USING (true);

CREATE POLICY discussion_comment_votes_insert_authenticated
ON public.discussion_comment_votes
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY discussion_comment_votes_update_owner
ON public.discussion_comment_votes
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

COMMIT;

-- Diagnostics
-- SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='discussion_comments' ORDER BY policyname;
-- SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='discussion_comment_votes' ORDER BY policyname;
-- EXPLAIN ANALYZE SELECT * FROM public.discussion_comments WHERE discussion_id = '<your-id>' ORDER BY created_at ASC;
