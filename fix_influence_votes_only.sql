-- Canonical influence sync: profiles.influence = net votes received on authored ideas
-- Run in Supabase SQL editor.

BEGIN;

-- 0) Ensure influence exists and is initialized.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS influence integer;

ALTER TABLE public.profiles
  ALTER COLUMN influence SET DEFAULT 0;

UPDATE public.profiles
SET influence = COALESCE(influence, 0)
WHERE influence IS NULL;

-- 1) Remove legacy influence mutators.
DROP TRIGGER IF EXISTS trg_refresh_profile_influence_from_votes ON public.idea_votes;
DROP TRIGGER IF EXISTS trg_sync_profile_influence_from_votes ON public.idea_votes;
DROP TRIGGER IF EXISTS trg_sync_author_influence_from_votes ON public.idea_votes;
DROP TRIGGER IF EXISTS trg_sync_profile_influence_from_ideas ON public.ideas;

DROP FUNCTION IF EXISTS public.increment_influence(uuid, integer);
DROP FUNCTION IF EXISTS public.recalc_profile_influence(uuid);
DROP FUNCTION IF EXISTS public.trg_refresh_profile_influence_from_votes();
DROP FUNCTION IF EXISTS public.trg_sync_profile_influence_from_votes();
DROP FUNCTION IF EXISTS public.trg_sync_author_influence_from_votes();
DROP FUNCTION IF EXISTS public.trg_sync_profile_influence_from_ideas();

-- 2) Canonical recompute function (votes only).
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

  IF to_regclass('public.ideas') IS NULL OR to_regclass('public.idea_votes') IS NULL THEN
    UPDATE public.profiles SET influence = 0 WHERE id = p_user_id;
    RETURN;
  END IF;

  UPDATE public.profiles p
  SET influence = COALESCE((
    SELECT SUM(
      CASE
        WHEN lower(v.direction::text) IN ('1', 'up') THEN 1
        WHEN lower(v.direction::text) IN ('-1', 'down') THEN -1
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

-- 3) Trigger sync for vote changes.
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
  IF to_regclass('public.ideas') IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

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
    DROP TRIGGER IF EXISTS trg_sync_profile_influence_from_votes ON public.idea_votes;
    CREATE TRIGGER trg_sync_profile_influence_from_votes
    AFTER INSERT OR UPDATE OR DELETE ON public.idea_votes
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_sync_profile_influence_from_votes();
  END IF;
END $$;

-- 4) Keep influence correct if idea ownership changes.
CREATE OR REPLACE FUNCTION public.trg_sync_profile_influence_from_ideas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.author_id IS NOT NULL THEN
      PERFORM public.recalc_profile_influence_from_votes(NEW.author_id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.author_id IS NOT NULL THEN
      PERFORM public.recalc_profile_influence_from_votes(OLD.author_id);
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.author_id IS NOT NULL THEN
      PERFORM public.recalc_profile_influence_from_votes(OLD.author_id);
    END IF;
    IF NEW.author_id IS NOT NULL AND NEW.author_id IS DISTINCT FROM OLD.author_id THEN
      PERFORM public.recalc_profile_influence_from_votes(NEW.author_id);
    END IF;
    RETURN NEW;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.ideas') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_sync_profile_influence_from_ideas ON public.ideas;
    CREATE TRIGGER trg_sync_profile_influence_from_ideas
    AFTER INSERT OR UPDATE OR DELETE ON public.ideas
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_sync_profile_influence_from_ideas();
  END IF;
END $$;

-- 5) Backfill all profiles now.
WITH totals AS (
  SELECT
    i.author_id AS user_id,
    COALESCE(SUM(
      CASE
        WHEN lower(v.direction::text) IN ('1', 'up') THEN 1
        WHEN lower(v.direction::text) IN ('-1', 'down') THEN -1
        ELSE 0
      END
    ), 0)::int AS net_votes
  FROM public.ideas i
  LEFT JOIN public.idea_votes v ON v.idea_id = i.id
  GROUP BY i.author_id
)
UPDATE public.profiles p
SET influence = COALESCE(t.net_votes, 0)
FROM totals t
WHERE p.id = t.user_id;

UPDATE public.profiles p
SET influence = 0
WHERE NOT EXISTS (
  SELECT 1
  FROM public.ideas i
  LEFT JOIN public.idea_votes v ON v.idea_id = i.id
  WHERE i.author_id = p.id
)
AND COALESCE(p.influence, 0) <> 0;

-- 6) Indexes for fast recompute.
CREATE INDEX IF NOT EXISTS idx_ideas_author_id ON public.ideas (author_id);
CREATE INDEX IF NOT EXISTS idx_idea_votes_idea_id ON public.idea_votes (idea_id);

COMMIT;

-- Diagnostics:
-- SELECT id, username, display_name, influence FROM public.profiles ORDER BY influence DESC LIMIT 20;
-- SELECT i.author_id, COALESCE(SUM(CASE WHEN lower(v.direction::text) IN ('1','up') THEN 1 WHEN lower(v.direction::text) IN ('-1','down') THEN -1 ELSE 0 END),0)::int AS net_votes
-- FROM public.ideas i LEFT JOIN public.idea_votes v ON v.idea_id = i.id GROUP BY i.author_id ORDER BY net_votes DESC;
