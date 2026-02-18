-- Fix profile save quality + accurate influence/submission metrics
-- Run in Supabase SQL editor

BEGIN;

-- 1) Make profile edit fields reliable even when optional/empty
ALTER TABLE public.profiles
  ALTER COLUMN bio SET DEFAULT '',
  ALTER COLUMN skills SET DEFAULT '{}'::text[],
  ALTER COLUMN influence SET DEFAULT 0,
  ALTER COLUMN submissions SET DEFAULT 0,
  ALTER COLUMN updated_at SET DEFAULT now();

UPDATE public.profiles
SET
  bio = COALESCE(bio, ''),
  skills = COALESCE(skills, '{}'::text[]),
  influence = COALESCE(influence, 0),
  submissions = COALESCE(submissions, 0),
  updated_at = COALESCE(updated_at, now())
WHERE
  bio IS NULL
  OR skills IS NULL
  OR influence IS NULL
  OR submissions IS NULL
  OR updated_at IS NULL;

-- 2) Keep profile.submissions accurate from ideas authored
CREATE OR REPLACE FUNCTION public.recalc_profile_submissions(p_user_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    UPDATE public.profiles p
    SET submissions = COALESCE(src.cnt, 0)
    FROM (
      SELECT p2.id, COUNT(i.id)::int AS cnt
      FROM public.profiles p2
      LEFT JOIN public.ideas i ON i.author_id = p2.id
      GROUP BY p2.id
    ) src
    WHERE src.id = p.id;
  ELSE
    UPDATE public.profiles p
    SET submissions = (
      SELECT COUNT(*)::int FROM public.ideas i WHERE i.author_id = p.id
    )
    WHERE p.id = p_user_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_refresh_profile_submissions_from_ideas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.author_id IS NOT NULL THEN
      PERFORM public.recalc_profile_submissions(NEW.author_id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.author_id IS NOT NULL THEN
      PERFORM public.recalc_profile_submissions(OLD.author_id);
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.author_id IS DISTINCT FROM OLD.author_id THEN
      IF OLD.author_id IS NOT NULL THEN
        PERFORM public.recalc_profile_submissions(OLD.author_id);
      END IF;
      IF NEW.author_id IS NOT NULL THEN
        PERFORM public.recalc_profile_submissions(NEW.author_id);
      END IF;
    ELSIF NEW.author_id IS NOT NULL THEN
      PERFORM public.recalc_profile_submissions(NEW.author_id);
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_profile_submissions_from_ideas ON public.ideas;
CREATE TRIGGER trg_refresh_profile_submissions_from_ideas
AFTER INSERT OR UPDATE OR DELETE ON public.ideas
FOR EACH ROW
EXECUTE FUNCTION public.trg_refresh_profile_submissions_from_ideas();

-- 3) Keep profile.influence accurate from idea vote totals (net score)
CREATE OR REPLACE FUNCTION public.recalc_profile_influence(p_user_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF to_regclass('public.idea_votes') IS NULL OR to_regclass('public.ideas') IS NULL THEN
    RETURN;
  END IF;

  IF p_user_id IS NULL THEN
    UPDATE public.profiles p
    SET influence = COALESCE(src.net_votes, 0)
    FROM (
      SELECT p2.id,
             COALESCE(SUM(v.direction), 0)::int AS net_votes
      FROM public.profiles p2
      LEFT JOIN public.ideas i ON i.author_id = p2.id
      LEFT JOIN public.idea_votes v ON v.idea_id = i.id
      GROUP BY p2.id
    ) src
    WHERE src.id = p.id;
  ELSE
    UPDATE public.profiles p
    SET influence = COALESCE((
      SELECT SUM(v.direction)::int
      FROM public.ideas i
      JOIN public.idea_votes v ON v.idea_id = i.id
      WHERE i.author_id = p.id
    ), 0)
    WHERE p.id = p_user_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_refresh_profile_influence_from_votes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_author uuid;
BEGIN
  IF to_regclass('public.ideas') IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP IN ('INSERT','UPDATE') THEN
    SELECT author_id INTO affected_author FROM public.ideas WHERE id = NEW.idea_id;
    IF affected_author IS NOT NULL THEN
      PERFORM public.recalc_profile_influence(affected_author);
    END IF;
  END IF;

  IF TG_OP IN ('DELETE','UPDATE') THEN
    SELECT author_id INTO affected_author FROM public.ideas WHERE id = OLD.idea_id;
    IF affected_author IS NOT NULL THEN
      PERFORM public.recalc_profile_influence(affected_author);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_profile_influence_from_votes ON public.idea_votes;
CREATE TRIGGER trg_refresh_profile_influence_from_votes
AFTER INSERT OR UPDATE OR DELETE ON public.idea_votes
FOR EACH ROW
EXECUTE FUNCTION public.trg_refresh_profile_influence_from_votes();

-- 4) Backfill now so UI immediately matches reality
SELECT public.recalc_profile_submissions(NULL);
SELECT public.recalc_profile_influence(NULL);

COMMIT;
