-- 01_integrity_and_limits_patch.sql
-- Core integrity hardening, vote RPCs, influence recalculation, rate limits, and share throttling.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- Utility helpers
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.woi_is_admin_or_moderator(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_user_id
      AND COALESCE(lower(p.role), 'user') IN ('admin', 'moderator')
  );
$$;

CREATE OR REPLACE FUNCTION public.woi_assert_actor(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN;
  END IF;
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'forbidden: actor mismatch';
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- Unique vote constraints (pre-clean duplicates)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_order text;
BEGIN
  -- idea_votes (user_id, idea_id)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='idea_votes')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='idea_votes' AND column_name='user_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='idea_votes' AND column_name='idea_id') THEN
    v_order := '';
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='idea_votes' AND column_name='created_at') THEN
      v_order := v_order || 'created_at DESC NULLS LAST, ';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='idea_votes' AND column_name='id') THEN
      v_order := v_order || 'id DESC';
    ELSE
      v_order := v_order || 'ctid DESC';
    END IF;

    EXECUTE format(
      'WITH ranked AS (
         SELECT ctid AS rid,
                ROW_NUMBER() OVER (PARTITION BY user_id, idea_id ORDER BY %s) AS rn
         FROM public.idea_votes
       )
       DELETE FROM public.idea_votes v
       USING ranked r
       WHERE v.ctid = r.rid
         AND r.rn > 1',
      v_order
    );
  END IF;

  -- discussion_votes (user_id, discussion_id)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='discussion_votes')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='discussion_votes' AND column_name='user_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='discussion_votes' AND column_name='discussion_id') THEN
    v_order := '';
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='discussion_votes' AND column_name='created_at') THEN
      v_order := v_order || 'created_at DESC NULLS LAST, ';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='discussion_votes' AND column_name='id') THEN
      v_order := v_order || 'id DESC';
    ELSE
      v_order := v_order || 'ctid DESC';
    END IF;

    EXECUTE format(
      'WITH ranked AS (
         SELECT ctid AS rid,
                ROW_NUMBER() OVER (PARTITION BY user_id, discussion_id ORDER BY %s) AS rn
         FROM public.discussion_votes
       )
       DELETE FROM public.discussion_votes v
       USING ranked r
       WHERE v.ctid = r.rid
         AND r.rn > 1',
      v_order
    );
  END IF;

  -- idea_comment_votes (user_id, comment_id)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='idea_comment_votes')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='idea_comment_votes' AND column_name='user_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='idea_comment_votes' AND column_name='comment_id') THEN
    v_order := '';
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='idea_comment_votes' AND column_name='created_at') THEN
      v_order := v_order || 'created_at DESC NULLS LAST, ';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='idea_comment_votes' AND column_name='id') THEN
      v_order := v_order || 'id DESC';
    ELSE
      v_order := v_order || 'ctid DESC';
    END IF;

    EXECUTE format(
      'WITH ranked AS (
         SELECT ctid AS rid,
                ROW_NUMBER() OVER (PARTITION BY user_id, comment_id ORDER BY %s) AS rn
         FROM public.idea_comment_votes
       )
       DELETE FROM public.idea_comment_votes v
       USING ranked r
       WHERE v.ctid = r.rid
         AND r.rn > 1',
      v_order
    );
  END IF;

  -- discussion_comment_votes (user_id, comment_id)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='discussion_comment_votes')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='discussion_comment_votes' AND column_name='user_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='discussion_comment_votes' AND column_name='comment_id') THEN
    v_order := '';
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='discussion_comment_votes' AND column_name='created_at') THEN
      v_order := v_order || 'created_at DESC NULLS LAST, ';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='discussion_comment_votes' AND column_name='id') THEN
      v_order := v_order || 'id DESC';
    ELSE
      v_order := v_order || 'ctid DESC';
    END IF;

    EXECUTE format(
      'WITH ranked AS (
         SELECT ctid AS rid,
                ROW_NUMBER() OVER (PARTITION BY user_id, comment_id ORDER BY %s) AS rn
         FROM public.discussion_comment_votes
       )
       DELETE FROM public.discussion_comment_votes v
       USING ranked r
       WHERE v.ctid = r.rid
         AND r.rn > 1',
      v_order
    );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_idea_votes_user_idea_unique
  ON public.idea_votes (user_id, idea_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_discussion_votes_user_discussion_unique
  ON public.discussion_votes (user_id, discussion_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_idea_comment_votes_user_comment_unique
  ON public.idea_comment_votes (user_id, comment_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_discussion_comment_votes_user_comment_unique
  ON public.discussion_comment_votes (user_id, comment_id);

-- Ensure new profiles start with zero economy/reputation baseline.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'influence'
  ) THEN
    EXECUTE 'ALTER TABLE public.profiles ALTER COLUMN influence SET DEFAULT 0';
    EXECUTE 'UPDATE public.profiles SET influence = 0 WHERE influence IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'coins'
  ) THEN
    EXECUTE 'ALTER TABLE public.profiles ALTER COLUMN coins SET DEFAULT 0';
    EXECUTE 'UPDATE public.profiles SET coins = 0 WHERE coins IS NULL';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Influence weighting + recalculation
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.influence_weights (
  vote_source text PRIMARY KEY,
  weight numeric NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.influence_weights(vote_source, weight)
VALUES
  ('ideas', 1),
  ('discussions', 1),
  ('idea_comments', 1),
  ('discussion_comments', 1),
  ('guides', 1)
ON CONFLICT (vote_source) DO NOTHING;

CREATE OR REPLACE FUNCTION public.recalc_profile_influence_v2(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ideas integer := 0;
  v_idea_comments integer := 0;
  v_discussion_comments integer := 0;
  v_guides integer := 0;
  v_guide_comments integer := 0;
  v_score integer := 0;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ideas' AND column_name='author_id'
  ) THEN
    SELECT COUNT(*)::int
    INTO v_ideas
    FROM public.ideas i
    WHERE i.author_id = p_user_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='idea_comments' AND column_name='user_id'
  ) THEN
    SELECT COUNT(*)::int
    INTO v_idea_comments
    FROM public.idea_comments c
    WHERE c.user_id = p_user_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='discussion_comments' AND column_name='user_id'
  ) THEN
    SELECT COUNT(*)::int
    INTO v_discussion_comments
    FROM public.discussion_comments dc
    WHERE dc.user_id = p_user_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='guides' AND column_name='user_id'
  ) THEN
    SELECT COUNT(*)::int
    INTO v_guides
    FROM public.guides g
    WHERE g.user_id = p_user_id;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='guides' AND column_name='author_id'
  ) THEN
    SELECT COUNT(*)::int
    INTO v_guides
    FROM public.guides g
    WHERE g.author_id = p_user_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='guide_comments' AND column_name='user_id'
  ) THEN
    SELECT COUNT(*)::int
    INTO v_guide_comments
    FROM public.guide_comments gc
    WHERE gc.user_id = p_user_id;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='guide_comments' AND column_name='author_id'
  ) THEN
    SELECT COUNT(*)::int
    INTO v_guide_comments
    FROM public.guide_comments gc
    WHERE gc.author_id = p_user_id;
  END IF;

  v_score := v_ideas + v_idea_comments + v_discussion_comments + v_guides + v_guide_comments;

  UPDATE public.profiles
  SET influence = v_score,
      updated_at = now()
  WHERE id = p_user_id;

  RETURN v_score;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalc_all_profiles_influence_v2()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_count integer := 0;
BEGIN
  FOR r IN SELECT id FROM public.profiles LOOP
    PERFORM public.recalc_profile_influence_v2(r.id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- -----------------------------------------------------------------------------
-- Vote RPCs (idempotent + canonical count return)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_idea_vote(p_idea_id uuid, p_user_id uuid, p_direction int)
RETURNS TABLE(net_votes integer, my_vote integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current int := 0;
  v_next int := 0;
BEGIN
  PERFORM public.woi_assert_actor(p_user_id);

  IF p_direction NOT IN (-1, 1) THEN
    RAISE EXCEPTION 'p_direction must be -1 or 1';
  END IF;

  SELECT COALESCE(direction, 0)
  INTO v_current
  FROM public.idea_votes
  WHERE user_id = p_user_id AND idea_id = p_idea_id;

  IF v_current = p_direction THEN
    DELETE FROM public.idea_votes
    WHERE user_id = p_user_id AND idea_id = p_idea_id;
    v_next := 0;
  ELSIF v_current = 0 THEN
    INSERT INTO public.idea_votes (idea_id, user_id, direction)
    VALUES (p_idea_id, p_user_id, p_direction)
    ON CONFLICT (user_id, idea_id)
    DO UPDATE SET direction = EXCLUDED.direction;
    v_next := p_direction;
  ELSE
    UPDATE public.idea_votes
    SET direction = p_direction
    WHERE user_id = p_user_id AND idea_id = p_idea_id;
    v_next := p_direction;
  END IF;

  SELECT COALESCE(SUM(
    CASE WHEN direction::text IN ('1','up') THEN 1 WHEN direction::text IN ('-1','down') THEN -1 ELSE 0 END
  ),0)::int
  INTO net_votes
  FROM public.idea_votes
  WHERE idea_id = p_idea_id;

  UPDATE public.ideas
  SET votes = net_votes
  WHERE id = p_idea_id;

  my_vote := v_next;

  RETURN QUERY SELECT net_votes, my_vote;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_discussion_vote(p_discussion_id uuid, p_user_id uuid, p_direction int)
RETURNS TABLE(net_votes integer, my_vote integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current int := 0;
  v_next int := 0;
BEGIN
  PERFORM public.woi_assert_actor(p_user_id);

  IF p_direction NOT IN (-1, 1) THEN
    RAISE EXCEPTION 'p_direction must be -1 or 1';
  END IF;

  SELECT COALESCE(direction, 0)
  INTO v_current
  FROM public.discussion_votes
  WHERE user_id = p_user_id AND discussion_id = p_discussion_id;

  IF v_current = p_direction THEN
    DELETE FROM public.discussion_votes
    WHERE user_id = p_user_id AND discussion_id = p_discussion_id;
    v_next := 0;
  ELSIF v_current = 0 THEN
    INSERT INTO public.discussion_votes (discussion_id, user_id, direction)
    VALUES (p_discussion_id, p_user_id, p_direction)
    ON CONFLICT (user_id, discussion_id)
    DO UPDATE SET direction = EXCLUDED.direction;
    v_next := p_direction;
  ELSE
    UPDATE public.discussion_votes
    SET direction = p_direction
    WHERE user_id = p_user_id AND discussion_id = p_discussion_id;
    v_next := p_direction;
  END IF;

  SELECT COALESCE(SUM(
    CASE WHEN direction::text IN ('1','up') THEN 1 WHEN direction::text IN ('-1','down') THEN -1 ELSE 0 END
  ),0)::int
  INTO net_votes
  FROM public.discussion_votes
  WHERE discussion_id = p_discussion_id;

  UPDATE public.discussions
  SET votes = net_votes
  WHERE id = p_discussion_id;

  my_vote := v_next;
  RETURN QUERY SELECT net_votes, my_vote;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_idea_comment_vote(p_comment_id uuid, p_user_id uuid, p_direction int)
RETURNS TABLE(net_votes integer, my_vote integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current int := 0;
  v_next int := 0;
BEGIN
  PERFORM public.woi_assert_actor(p_user_id);

  IF p_direction NOT IN (-1, 1) THEN
    RAISE EXCEPTION 'p_direction must be -1 or 1';
  END IF;

  SELECT COALESCE(direction, 0)
  INTO v_current
  FROM public.idea_comment_votes
  WHERE user_id = p_user_id AND comment_id = p_comment_id;

  IF v_current = p_direction THEN
    DELETE FROM public.idea_comment_votes
    WHERE user_id = p_user_id AND comment_id = p_comment_id;
    v_next := 0;
  ELSIF v_current = 0 THEN
    INSERT INTO public.idea_comment_votes (comment_id, user_id, direction)
    VALUES (p_comment_id, p_user_id, p_direction)
    ON CONFLICT (user_id, comment_id)
    DO UPDATE SET direction = EXCLUDED.direction;
    v_next := p_direction;
  ELSE
    UPDATE public.idea_comment_votes
    SET direction = p_direction
    WHERE user_id = p_user_id AND comment_id = p_comment_id;
    v_next := p_direction;
  END IF;

  SELECT COALESCE(SUM(
    CASE WHEN direction::text IN ('1','up') THEN 1 WHEN direction::text IN ('-1','down') THEN -1 ELSE 0 END
  ),0)::int
  INTO net_votes
  FROM public.idea_comment_votes
  WHERE comment_id = p_comment_id;

  UPDATE public.idea_comments
  SET votes = net_votes
  WHERE id = p_comment_id;

  my_vote := v_next;
  RETURN QUERY SELECT net_votes, my_vote;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_discussion_comment_vote(p_comment_id uuid, p_user_id uuid, p_direction int)
RETURNS TABLE(net_votes integer, my_vote integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current int := 0;
  v_next int := 0;
BEGIN
  PERFORM public.woi_assert_actor(p_user_id);

  IF p_direction NOT IN (-1, 1) THEN
    RAISE EXCEPTION 'p_direction must be -1 or 1';
  END IF;

  SELECT COALESCE(vote_type, 0)
  INTO v_current
  FROM public.discussion_comment_votes
  WHERE user_id = p_user_id AND comment_id = p_comment_id;

  IF v_current = p_direction THEN
    DELETE FROM public.discussion_comment_votes
    WHERE user_id = p_user_id AND comment_id = p_comment_id;
    v_next := 0;
  ELSIF v_current = 0 THEN
    INSERT INTO public.discussion_comment_votes (comment_id, user_id, vote_type)
    VALUES (p_comment_id, p_user_id, p_direction)
    ON CONFLICT (user_id, comment_id)
    DO UPDATE SET vote_type = EXCLUDED.vote_type;
    v_next := p_direction;
  ELSE
    UPDATE public.discussion_comment_votes
    SET vote_type = p_direction
    WHERE user_id = p_user_id AND comment_id = p_comment_id;
    v_next := p_direction;
  END IF;

  SELECT COALESCE(SUM(
    CASE WHEN vote_type::text IN ('1','up') THEN 1 WHEN vote_type::text IN ('-1','down') THEN -1 ELSE 0 END
  ),0)::int
  INTO net_votes
  FROM public.discussion_comment_votes
  WHERE comment_id = p_comment_id;

  UPDATE public.discussion_comments
  SET votes = net_votes
  WHERE id = p_comment_id;

  my_vote := v_next;
  RETURN QUERY SELECT net_votes, my_vote;
END;
$$;

-- -----------------------------------------------------------------------------
-- Rate limiting and action events
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_action_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_user_action_events_user_action_created
  ON public.user_action_events(user_id, action_type, created_at DESC);

CREATE OR REPLACE FUNCTION public.can_create_idea(p_user_id uuid)
RETURNS TABLE(allowed boolean, remaining integer, limit_count integer, used_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer := 5;
  v_used integer := 0;
BEGIN
  PERFORM public.woi_assert_actor(p_user_id);

  IF public.woi_is_admin_or_moderator(p_user_id) THEN
    RETURN QUERY SELECT true, 9999, v_limit, 0;
    RETURN;
  END IF;

  SELECT COUNT(*)::int
  INTO v_used
  FROM public.user_action_events
  WHERE user_id = p_user_id
    AND action_type = 'create_idea'
    AND created_at > (now() - interval '24 hours');

  RETURN QUERY SELECT (v_used < v_limit), GREATEST(v_limit - v_used, 0), v_limit, v_used;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_create_comment(p_user_id uuid)
RETURNS TABLE(allowed boolean, remaining integer, limit_count integer, used_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer := 30;
  v_used integer := 0;
BEGIN
  PERFORM public.woi_assert_actor(p_user_id);

  IF public.woi_is_admin_or_moderator(p_user_id) THEN
    RETURN QUERY SELECT true, 9999, v_limit, 0;
    RETURN;
  END IF;

  SELECT COUNT(*)::int
  INTO v_used
  FROM public.user_action_events
  WHERE user_id = p_user_id
    AND action_type = 'create_comment'
    AND created_at > (now() - interval '24 hours');

  RETURN QUERY SELECT (v_used < v_limit), GREATEST(v_limit - v_used, 0), v_limit, v_used;
END;
$$;

-- -----------------------------------------------------------------------------
-- Share increment throttling (1 per user per idea per hour)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.idea_share_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  idea_id uuid NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  hour_bucket timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, idea_id, hour_bucket)
);

CREATE INDEX IF NOT EXISTS idx_idea_share_events_user_idea_created
  ON public.idea_share_events(user_id, idea_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.increment_idea_shares_limited(p_idea_id uuid, p_user_id uuid)
RETURNS TABLE(incremented boolean, remaining_cooldown_seconds integer, shares integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bucket timestamptz;
  v_last timestamptz;
BEGIN
  PERFORM public.woi_assert_actor(p_user_id);

  v_bucket := date_trunc('hour', now());

  BEGIN
    INSERT INTO public.idea_share_events (user_id, idea_id, hour_bucket)
    VALUES (p_user_id, p_idea_id, v_bucket);

    UPDATE public.ideas
    SET shares = COALESCE(shares, 0) + 1
    WHERE id = p_idea_id
    RETURNING COALESCE(shares, 0) INTO shares;

    incremented := true;
    remaining_cooldown_seconds := 0;
    RETURN NEXT;
    RETURN;
  EXCEPTION WHEN unique_violation THEN
    SELECT created_at
    INTO v_last
    FROM public.idea_share_events
    WHERE user_id = p_user_id
      AND idea_id = p_idea_id
      AND hour_bucket = v_bucket
    ORDER BY created_at DESC
    LIMIT 1;

    SELECT COALESCE(i.shares, 0)
    INTO shares
    FROM public.ideas i
    WHERE i.id = p_idea_id;

    incremented := false;
    remaining_cooldown_seconds := GREATEST(0, EXTRACT(EPOCH FROM ((v_bucket + interval '1 hour') - now()))::int);
    RETURN NEXT;
    RETURN;
  END;
END;
$$;

-- -----------------------------------------------------------------------------
-- RLS + policy alignment for new tables
-- -----------------------------------------------------------------------------
ALTER TABLE public.user_action_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_share_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_action_events' AND policyname='user_action_events_select_own'
  ) THEN
    CREATE POLICY user_action_events_select_own
    ON public.user_action_events
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_action_events' AND policyname='user_action_events_insert_own'
  ) THEN
    CREATE POLICY user_action_events_insert_own
    ON public.user_action_events
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='idea_share_events' AND policyname='idea_share_events_select_own'
  ) THEN
    CREATE POLICY idea_share_events_select_own
    ON public.idea_share_events
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='idea_share_events' AND policyname='idea_share_events_insert_own'
  ) THEN
    CREATE POLICY idea_share_events_insert_own
    ON public.idea_share_events
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.set_idea_vote(uuid, uuid, int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_discussion_vote(uuid, uuid, int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_idea_comment_vote(uuid, uuid, int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_discussion_comment_vote(uuid, uuid, int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recalc_profile_influence_v2(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recalc_all_profiles_influence_v2() TO service_role;
GRANT EXECUTE ON FUNCTION public.can_create_idea(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_create_comment(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_idea_shares_limited(uuid, uuid) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
