-- 00_diagnostics.sql
-- Run this first in Supabase SQL editor.
-- Produces deterministic PASS/FAIL gate checks for integrity prerequisites.

BEGIN;

CREATE TEMP TABLE IF NOT EXISTS woi_diagnostic_results (
  check_name text PRIMARY KEY,
  pass boolean NOT NULL,
  details text NOT NULL
) ON COMMIT DROP;

CREATE OR REPLACE FUNCTION pg_temp.woi_add_result(p_name text, p_pass boolean, p_details text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO woi_diagnostic_results(check_name, pass, details)
  VALUES (p_name, p_pass, p_details)
  ON CONFLICT (check_name) DO UPDATE
  SET pass = EXCLUDED.pass,
      details = EXCLUDED.details;
END;
$$;

DO $$
DECLARE
  v_count bigint;
  v_missing text;
BEGIN
  -- Required tables present
  SELECT string_agg(t, ', ')
  INTO v_missing
  FROM (
    SELECT unnest(ARRAY[
      'ideas','idea_votes','discussion_votes','idea_comments','discussion_comments',
      'resources','applications','reports','profiles'
    ]) AS t
  ) req
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name=req.t
  );

  PERFORM pg_temp.woi_add_result(
    'tables_present',
    v_missing IS NULL,
    COALESCE('Missing: ' || v_missing, 'All required tables present')
  );

  -- Duplicate vote rows
  SELECT COALESCE(SUM(c),0) INTO v_count FROM (
    SELECT COUNT(*) - 1 AS c
    FROM public.idea_votes
    GROUP BY user_id, idea_id
    HAVING COUNT(*) > 1
  ) d;
  PERFORM pg_temp.woi_add_result('dup_idea_votes', v_count = 0, 'duplicate rows=' || v_count);

  SELECT COALESCE(SUM(c),0) INTO v_count FROM (
    SELECT COUNT(*) - 1 AS c
    FROM public.discussion_votes
    GROUP BY user_id, discussion_id
    HAVING COUNT(*) > 1
  ) d;
  PERFORM pg_temp.woi_add_result('dup_discussion_votes', v_count = 0, 'duplicate rows=' || v_count);

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='idea_comment_votes' AND column_name='direction') THEN
    SELECT COALESCE(SUM(c),0) INTO v_count FROM (
      SELECT COUNT(*) - 1 AS c
      FROM public.idea_comment_votes
      GROUP BY user_id, comment_id
      HAVING COUNT(*) > 1
    ) d;
    PERFORM pg_temp.woi_add_result('dup_idea_comment_votes', v_count = 0, 'duplicate rows=' || v_count);
  ELSE
    PERFORM pg_temp.woi_add_result('dup_idea_comment_votes', false, 'table/columns missing: idea_comment_votes(user_id, comment_id, direction)');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='discussion_comment_votes' AND column_name='vote_type') THEN
    SELECT COALESCE(SUM(c),0) INTO v_count FROM (
      SELECT COUNT(*) - 1 AS c
      FROM public.discussion_comment_votes
      GROUP BY user_id, comment_id
      HAVING COUNT(*) > 1
    ) d;
    PERFORM pg_temp.woi_add_result('dup_discussion_comment_votes', v_count = 0, 'duplicate rows=' || v_count);
  ELSE
    PERFORM pg_temp.woi_add_result('dup_discussion_comment_votes', false, 'table/columns missing: discussion_comment_votes(user_id, comment_id, vote_type)');
  END IF;

  -- Idea vote counter drift
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ideas' AND column_name='votes') THEN
    SELECT COUNT(*) INTO v_count
    FROM public.ideas i
    LEFT JOIN (
      SELECT idea_id,
             COALESCE(SUM(CASE WHEN direction::text IN ('1','up') THEN 1 WHEN direction::text IN ('-1','down') THEN -1 ELSE 0 END),0) AS net_votes
      FROM public.idea_votes
      GROUP BY idea_id
    ) v ON v.idea_id = i.id
    WHERE COALESCE(i.votes, 0) <> COALESCE(v.net_votes, 0);

    PERFORM pg_temp.woi_add_result('drift_ideas_votes', v_count = 0, 'drift rows=' || v_count);
  ELSE
    PERFORM pg_temp.woi_add_result('drift_ideas_votes', false, 'ideas.votes missing');
  END IF;

  -- Local ID detection in UUID-expected columns
  SELECT
    COALESCE((SELECT COUNT(*) FROM public.ideas WHERE id::text LIKE 'local_%'), 0)
    + COALESCE((SELECT COUNT(*) FROM public.idea_votes WHERE idea_id::text LIKE 'local_%'), 0)
    + COALESCE((SELECT COUNT(*) FROM public.resources WHERE idea_id::text LIKE 'local_%'), 0)
    + COALESCE((SELECT COUNT(*) FROM public.applications WHERE idea_id::text LIKE 'local_%'), 0)
  INTO v_count;

  PERFORM pg_temp.woi_add_result('local_id_rows', v_count = 0, 'rows with local_* ids=' || v_count);

  -- Required RPC existence checks
  PERFORM pg_temp.woi_add_result(
    'rpc_update_idea_vote_count_present',
    EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname='public' AND p.proname='update_idea_vote_count'),
    'expects public.update_idea_vote_count'
  );

  PERFORM pg_temp.woi_add_result(
    'rpc_vote_idea_comment_present',
    EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname='public' AND p.proname='vote_idea_comment'),
    'expects public.vote_idea_comment'
  );

  PERFORM pg_temp.woi_add_result(
    'rpc_increment_idea_shares_present',
    EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname='public' AND p.proname='increment_idea_shares'),
    'expects public.increment_idea_shares'
  );

  -- Basic RLS checks
  PERFORM pg_temp.woi_add_result(
    'rls_ideas_enabled',
    EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='ideas' AND c.relrowsecurity),
    'public.ideas relrowsecurity should be true'
  );

  PERFORM pg_temp.woi_add_result(
    'rls_profiles_enabled',
    EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='profiles' AND c.relrowsecurity),
    'public.profiles relrowsecurity should be true'
  );
END $$;

-- Deterministic report block
SELECT
  check_name,
  pass,
  details
FROM woi_diagnostic_results
ORDER BY check_name;

SELECT
  CASE WHEN bool_and(pass) THEN 'PASS' ELSE 'FAIL' END AS deployment_gate,
  COUNT(*) FILTER (WHERE NOT pass) AS failed_checks
FROM woi_diagnostic_results;

ROLLBACK;
