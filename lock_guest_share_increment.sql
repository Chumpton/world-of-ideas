-- Prevent guest users from incrementing idea shares
-- Run in Supabase SQL editor

BEGIN;

CREATE OR REPLACE FUNCTION public.increment_idea_shares(idea_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.ideas
  SET shares = COALESCE(shares, 0) + 1
  WHERE id = idea_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_idea_shares(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_idea_shares(uuid) TO authenticated;

COMMIT;
