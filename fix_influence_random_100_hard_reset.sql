-- HARD fix for profile influence drift (including random 100)
-- Run once in Supabase SQL editor.

BEGIN;

-- 1) Influence must default to zero for fresh accounts.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS influence integer,
  ALTER COLUMN influence SET DEFAULT 0;

UPDATE public.profiles
SET influence = 0
WHERE influence IS NULL;

-- 2) Remove known legacy mutators.
DROP FUNCTION IF EXISTS public.increment_influence(uuid, integer);
DROP FUNCTION IF EXISTS public.recalc_profile_influence(uuid);
DROP FUNCTION IF EXISTS public.trg_refresh_profile_influence_from_votes();
DROP TRIGGER IF EXISTS trg_refresh_profile_influence_from_votes ON public.idea_votes;
DROP TRIGGER IF EXISTS trg_sync_profile_influence_from_votes ON public.idea_votes;
DROP TRIGGER IF EXISTS trg_sync_profile_influence_from_ideas ON public.ideas;

-- 3) Canonical votes-only recompute function.
CREATE OR REPLACE FUNCTION public.recalc_profile_influence_from_votes(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.profiles p
  SET influence = COALESCE((
    SELECT SUM(
      CASE
        WHEN lower(v.direction::text) IN ('1','up') THEN 1
        WHEN lower(v.direction::text) IN ('-1','down') THEN -1
        ELSE 0
      END
    )::int
    FROM public.ideas i
    LEFT JOIN public.idea_votes v ON v.idea_id = i.id
    WHERE i.author_id = p.id
  ), 0)
  WHERE p.id = p_user_id;
END;
$$;

-- 4) Keep influence synced when votes change.
CREATE OR REPLACE FUNCTION public.trg_sync_profile_influence_from_votes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_new uuid;
  v_author_old uuid;
BEGIN
  IF TG_OP IN ('INSERT','UPDATE') THEN
    SELECT author_id INTO v_author_new FROM public.ideas WHERE id = NEW.idea_id;
    IF v_author_new IS NOT NULL THEN
      PERFORM public.recalc_profile_influence_from_votes(v_author_new);
    END IF;
  END IF;

  IF TG_OP IN ('DELETE','UPDATE') THEN
    SELECT author_id INTO v_author_old FROM public.ideas WHERE id = OLD.idea_id;
    IF v_author_old IS NOT NULL AND v_author_old IS DISTINCT FROM v_author_new THEN
      PERFORM public.recalc_profile_influence_from_votes(v_author_old);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.idea_votes') IS NOT NULL THEN
    CREATE TRIGGER trg_sync_profile_influence_from_votes
    AFTER INSERT OR UPDATE OR DELETE ON public.idea_votes
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_sync_profile_influence_from_votes();
  END IF;
END $$;

-- 5) Backfill everyone now from actual vote totals.
UPDATE public.profiles p
SET influence = COALESCE(src.net_votes, 0)
FROM (
  SELECT
    i.author_id AS user_id,
    COALESCE(SUM(
      CASE
        WHEN lower(v.direction::text) IN ('1','up') THEN 1
        WHEN lower(v.direction::text) IN ('-1','down') THEN -1
        ELSE 0
      END
    ), 0)::int AS net_votes
  FROM public.ideas i
  LEFT JOIN public.idea_votes v ON v.idea_id = i.id
  GROUP BY i.author_id
) src
WHERE p.id = src.user_id;

UPDATE public.profiles p
SET influence = 0
WHERE NOT EXISTS (
  SELECT 1 FROM public.ideas i WHERE i.author_id = p.id
)
AND COALESCE(p.influence, 0) <> 0;

CREATE INDEX IF NOT EXISTS idx_ideas_author_id ON public.ideas (author_id);
CREATE INDEX IF NOT EXISTS idx_idea_votes_idea_id ON public.idea_votes (idea_id);

COMMIT;

-- Diagnostic:
-- SELECT id, username, display_name, influence FROM public.profiles ORDER BY influence DESC LIMIT 30;
