-- 02_post_patch_verification.sql
-- Verify expected invariants after running 01_integrity_and_limits_patch.sql

BEGIN;

-- 1) Required objects
SELECT 'rpc_set_idea_vote' AS check_name,
       EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='set_idea_vote') AS pass;

SELECT 'rpc_set_discussion_vote' AS check_name,
       EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='set_discussion_vote') AS pass;

SELECT 'rpc_set_idea_comment_vote' AS check_name,
       EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='set_idea_comment_vote') AS pass;

SELECT 'rpc_set_discussion_comment_vote' AS check_name,
       EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='set_discussion_comment_vote') AS pass;

SELECT 'rpc_recalc_profile_influence_v2' AS check_name,
       EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='recalc_profile_influence_v2') AS pass;

SELECT 'table_influence_weights' AS check_name,
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='influence_weights') AS pass;

SELECT 'table_user_action_events' AS check_name,
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_action_events') AS pass;

SELECT 'table_idea_share_events' AS check_name,
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='idea_share_events') AS pass;

-- 2) Unique indexes
SELECT 'unique_idx_idea_votes_user_idea' AS check_name,
       EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='idea_votes' AND indexname='idx_idea_votes_user_idea_unique') AS pass;

SELECT 'unique_idx_discussion_votes_user_discussion' AS check_name,
       EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='discussion_votes' AND indexname='idx_discussion_votes_user_discussion_unique') AS pass;

SELECT 'unique_idx_idea_comment_votes_user_comment' AS check_name,
       EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='idea_comment_votes' AND indexname='idx_idea_comment_votes_user_comment_unique') AS pass;

SELECT 'unique_idx_discussion_comment_votes_user_comment' AS check_name,
       EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='discussion_comment_votes' AND indexname='idx_discussion_comment_votes_user_comment_unique') AS pass;

-- 3) No duplicate vote rows
SELECT 'dup_check_idea_votes' AS check_name,
       NOT EXISTS (
         SELECT 1 FROM public.idea_votes GROUP BY user_id, idea_id HAVING COUNT(*) > 1
       ) AS pass;

SELECT 'dup_check_discussion_votes' AS check_name,
       NOT EXISTS (
         SELECT 1 FROM public.discussion_votes GROUP BY user_id, discussion_id HAVING COUNT(*) > 1
       ) AS pass;

SELECT 'dup_check_idea_comment_votes' AS check_name,
       NOT EXISTS (
         SELECT 1 FROM public.idea_comment_votes GROUP BY user_id, comment_id HAVING COUNT(*) > 1
       ) AS pass;

SELECT 'dup_check_discussion_comment_votes' AS check_name,
       NOT EXISTS (
         SELECT 1 FROM public.discussion_comment_votes GROUP BY user_id, comment_id HAVING COUNT(*) > 1
       ) AS pass;

-- 4) Counter drift check for ideas.votes
SELECT 'drift_check_ideas_votes' AS check_name,
       NOT EXISTS (
         SELECT 1
         FROM public.ideas i
         LEFT JOIN (
           SELECT idea_id,
                  COALESCE(SUM(CASE WHEN direction::text IN ('1','up') THEN 1 WHEN direction::text IN ('-1','down') THEN -1 ELSE 0 END),0) AS net_votes
           FROM public.idea_votes
           GROUP BY idea_id
         ) v ON v.idea_id = i.id
         WHERE COALESCE(i.votes, 0) <> COALESCE(v.net_votes, 0)
       ) AS pass;

-- 5) Post patch pass/fail gate
WITH checks AS (
  SELECT 'rpc_set_idea_vote' AS check_name, EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='set_idea_vote') AS pass
  UNION ALL
  SELECT 'rpc_set_discussion_vote', EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='set_discussion_vote')
  UNION ALL
  SELECT 'rpc_set_idea_comment_vote', EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='set_idea_comment_vote')
  UNION ALL
  SELECT 'rpc_set_discussion_comment_vote', EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='set_discussion_comment_vote')
  UNION ALL
  SELECT 'table_influence_weights', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='influence_weights')
  UNION ALL
  SELECT 'table_user_action_events', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_action_events')
  UNION ALL
  SELECT 'table_idea_share_events', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='idea_share_events')
)
SELECT CASE WHEN bool_and(pass) THEN 'PASS' ELSE 'FAIL' END AS verification_gate,
       COUNT(*) FILTER (WHERE NOT pass) AS failed_checks
FROM checks;

ROLLBACK;
