-- Permanent fix: idea discussion comments save/load reliability
-- Run in Supabase SQL editor.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Canonicalize idea_comments schema.
CREATE TABLE IF NOT EXISTS public.idea_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text text NOT NULL,
  author text,
  author_avatar text,
  parent_id uuid REFERENCES public.idea_comments(id) ON DELETE CASCADE,
  votes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.idea_comments ADD COLUMN IF NOT EXISTS idea_id uuid;
ALTER TABLE public.idea_comments ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.idea_comments ADD COLUMN IF NOT EXISTS text text;
ALTER TABLE public.idea_comments ADD COLUMN IF NOT EXISTS author text;
ALTER TABLE public.idea_comments ADD COLUMN IF NOT EXISTS author_avatar text;
ALTER TABLE public.idea_comments ADD COLUMN IF NOT EXISTS parent_id uuid;
ALTER TABLE public.idea_comments ADD COLUMN IF NOT EXISTS votes integer DEFAULT 0;
ALTER TABLE public.idea_comments ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE public.idea_comments
  ALTER COLUMN votes SET DEFAULT 0,
  ALTER COLUMN created_at SET DEFAULT now();

UPDATE public.idea_comments
SET
  votes = COALESCE(votes, 0),
  created_at = COALESCE(created_at, now()),
  text = COALESCE(NULLIF(text, ''), '[deleted]')
WHERE votes IS NULL OR created_at IS NULL OR text IS NULL;

-- 2) Enforce row-level security with coherent policies.
ALTER TABLE public.idea_comments ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'idea_comments'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.idea_comments', p.policyname);
  END LOOP;
END $$;

CREATE POLICY idea_comments_select_public
ON public.idea_comments
FOR SELECT
USING (true);

CREATE POLICY idea_comments_insert_owner
ON public.idea_comments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY idea_comments_update_owner
ON public.idea_comments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY idea_comments_delete_owner
ON public.idea_comments
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 3) Keep ideas.comment_count always accurate.
CREATE OR REPLACE FUNCTION public.trg_sync_idea_comment_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.ideas
    SET comment_count = COALESCE(comment_count, 0) + 1
    WHERE id = NEW.idea_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.ideas
    SET comment_count = GREATEST(COALESCE(comment_count, 0) - 1, 0)
    WHERE id = OLD.idea_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.idea_id IS DISTINCT FROM OLD.idea_id THEN
      UPDATE public.ideas
      SET comment_count = GREATEST(COALESCE(comment_count, 0) - 1, 0)
      WHERE id = OLD.idea_id;

      UPDATE public.ideas
      SET comment_count = COALESCE(comment_count, 0) + 1
      WHERE id = NEW.idea_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_idea_comment_count ON public.idea_comments;
CREATE TRIGGER trg_sync_idea_comment_count
AFTER INSERT OR UPDATE OR DELETE ON public.idea_comments
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_idea_comment_count();

-- Backfill counts from source of truth.
UPDATE public.ideas i
SET comment_count = COALESCE(src.cnt, 0)
FROM (
  SELECT idea_id, COUNT(*)::int AS cnt
  FROM public.idea_comments
  GROUP BY idea_id
) src
WHERE i.id = src.idea_id;

UPDATE public.ideas
SET comment_count = 0
WHERE id NOT IN (SELECT DISTINCT idea_id FROM public.idea_comments);

-- 4) Stable RPC for comment insertion (frontend uses this first).
CREATE OR REPLACE FUNCTION public.add_idea_comment(
  p_idea_id uuid,
  p_text text,
  p_parent_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  idea_id uuid,
  user_id uuid,
  text text,
  author text,
  author_avatar text,
  parent_id uuid,
  votes integer,
  created_at timestamptz,
  idea_comment_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_username text;
  v_avatar text;
  v_row public.idea_comments%ROWTYPE;
  v_count integer;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF COALESCE(trim(p_text), '') = '' THEN
    RAISE EXCEPTION 'Comment text is required';
  END IF;

  -- Ensure a profile row exists for FK reliability.
  INSERT INTO public.profiles (id, username, display_name, created_at, updated_at)
  SELECT
    u.id,
    COALESCE(NULLIF(u.raw_user_meta_data->>'username', ''), split_part(COALESCE(u.email, ''), '@', 1), 'user_' || substr(u.id::text, 1, 8)),
    COALESCE(NULLIF(u.raw_user_meta_data->>'display_name', ''), NULLIF(u.raw_user_meta_data->>'username', ''), split_part(COALESCE(u.email, ''), '@', 1), 'User'),
    now(),
    now()
  FROM auth.users u
  WHERE u.id = v_uid
  ON CONFLICT (id) DO UPDATE SET updated_at = now();

  SELECT p.username, p.avatar_url
  INTO v_username, v_avatar
  FROM public.profiles p
  WHERE p.id = v_uid;

  INSERT INTO public.idea_comments (idea_id, user_id, text, author, author_avatar, parent_id, votes)
  VALUES (p_idea_id, v_uid, trim(p_text), COALESCE(v_username, 'Community Member'), v_avatar, p_parent_id, 0)
  RETURNING * INTO v_row;

  SELECT COALESCE(i.comment_count, 0)
  INTO v_count
  FROM public.ideas i
  WHERE i.id = p_idea_id;

  RETURN QUERY
  SELECT
    v_row.id,
    v_row.idea_id,
    v_row.user_id,
    v_row.text,
    v_row.author,
    v_row.author_avatar,
    v_row.parent_id,
    v_row.votes,
    v_row.created_at,
    v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.add_idea_comment(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_idea_comment(uuid, text, uuid) TO authenticated;

-- 5) Helpful indexes.
CREATE INDEX IF NOT EXISTS idx_idea_comments_idea_created_at
  ON public.idea_comments (idea_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_idea_comments_parent_id
  ON public.idea_comments (parent_id);
CREATE INDEX IF NOT EXISTS idx_idea_comments_user_id
  ON public.idea_comments (user_id);

COMMIT;
