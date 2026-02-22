-- schema_relationships_and_influence_rpc_patch.sql
-- Run in Supabase SQL editor. Adds missing profile relationships and influence RPC.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Keep frequent reads fast (schema-safe).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ideas' AND column_name = 'author_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_ideas_author_id ON public.ideas (author_id)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'idea_votes' AND column_name = 'idea_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_idea_votes_idea_id ON public.idea_votes (idea_id)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'idea_votes' AND column_name = 'user_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'idea_votes' AND column_name = 'idea_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_idea_votes_user_idea ON public.idea_votes (user_id, idea_id)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'discussions' AND column_name = 'user_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_discussions_user_id ON public.discussions (user_id)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'applicant_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_applications_applicant_id ON public.applications (applicant_id)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'pledged_by'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_resources_pledged_by ON public.resources (pledged_by)';
  END IF;
END $$;

DO $$
BEGIN
  -- applications -> profiles
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'applicant_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'applications_applicant_id_fkey'
    ) THEN
      EXECUTE 'ALTER TABLE public.applications
               ADD CONSTRAINT applications_applicant_id_fkey
               FOREIGN KEY (applicant_id) REFERENCES public.profiles(id) ON DELETE CASCADE';
    END IF;
  END IF;

  -- resources -> profiles
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'pledged_by'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'resources_pledged_by_fkey'
    ) THEN
      EXECUTE 'ALTER TABLE public.resources
               ADD CONSTRAINT resources_pledged_by_fkey
               FOREIGN KEY (pledged_by) REFERENCES public.profiles(id) ON DELETE SET NULL';
    END IF;
  END IF;

  -- discussions -> profiles
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'discussions' AND column_name = 'user_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'discussions_user_id_fkey'
    ) THEN
      EXECUTE 'ALTER TABLE public.discussions
               ADD CONSTRAINT discussions_user_id_fkey
               FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL';
    END IF;
  END IF;

  -- discussion_comments -> profiles
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'discussion_comments' AND column_name = 'user_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'discussion_comments_user_id_fkey'
    ) THEN
      EXECUTE 'ALTER TABLE public.discussion_comments
               ADD CONSTRAINT discussion_comments_user_id_fkey
               FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL';
    END IF;
  END IF;

  -- idea_comments -> profiles
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'idea_comments' AND column_name = 'user_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'idea_comments_user_id_fkey'
    ) THEN
      EXECUTE 'ALTER TABLE public.idea_comments
               ADD CONSTRAINT idea_comments_user_id_fkey
               FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL';
    END IF;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.recalc_profile_influence_from_votes(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score integer := 0;
BEGIN
  SELECT COALESCE(SUM(
    CASE
      WHEN iv.direction::text IN ('1', 'up') THEN 1
      WHEN iv.direction::text IN ('-1', 'down') THEN -1
      ELSE 0
    END
  ), 0)
  INTO v_score
  FROM public.idea_votes iv
  JOIN public.ideas i ON i.id = iv.idea_id
  WHERE i.author_id = p_user_id;

  UPDATE public.profiles
  SET influence = v_score,
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN v_score;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalc_profile_influence_from_votes(uuid) TO anon, authenticated, service_role;

-- Ask PostgREST to reload schema cache so new relationships/RPC are visible immediately.
NOTIFY pgrst, 'reload schema';

COMMIT;

-- Diagnostics:
-- SELECT conname, conrelid::regclass AS table_name FROM pg_constraint WHERE conname IN (
--   'applications_applicant_id_fkey', 'resources_pledged_by_fkey', 'discussions_user_id_fkey',
--   'discussion_comments_user_id_fkey', 'idea_comments_user_id_fkey'
-- );
-- SELECT public.recalc_profile_influence_from_votes('<your-user-id>'::uuid);
