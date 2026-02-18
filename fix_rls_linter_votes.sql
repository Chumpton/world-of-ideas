-- Fix Supabase linter errors:
-- - rls_disabled_in_public on public.mentor_votes
-- - rls_disabled_in_public on public.feasibility_votes
--
-- Run in Supabase SQL editor.

BEGIN;

-- 1) mentor_votes is legacy in this codebase; lock it down if it still exists.
DO $$
DECLARE
  p record;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'mentor_votes'
  ) THEN
    ALTER TABLE public.mentor_votes ENABLE ROW LEVEL SECURITY;

    FOR p IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'mentor_votes'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.mentor_votes', p.policyname);
    END LOOP;

    -- No direct client access (table is unused by frontend now).
    CREATE POLICY "mentor_votes_no_client_access"
    ON public.mentor_votes
    FOR ALL
    TO authenticated
    USING (false)
    WITH CHECK (false);

    -- Keep service-role access for maintenance/admin scripts.
    CREATE POLICY "mentor_votes_service_role_all"
    ON public.mentor_votes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- 2) feasibility_votes is active; enforce owner-based writes.
DO $$
DECLARE
  p record;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'feasibility_votes'
  ) THEN
    ALTER TABLE public.feasibility_votes ENABLE ROW LEVEL SECURITY;

    FOR p IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'feasibility_votes'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.feasibility_votes', p.policyname);
    END LOOP;

    CREATE POLICY "feasibility_votes_select_public"
    ON public.feasibility_votes
    FOR SELECT
    USING (true);

    CREATE POLICY "feasibility_votes_insert_owner"
    ON public.feasibility_votes
    FOR INSERT
    TO authenticated
    WITH CHECK (
      auth.uid() = user_id
      AND score >= 1
      AND score <= 5
    );

    CREATE POLICY "feasibility_votes_update_owner"
    ON public.feasibility_votes
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (
      auth.uid() = user_id
      AND score >= 1
      AND score <= 5
    );

    CREATE POLICY "feasibility_votes_delete_owner"
    ON public.feasibility_votes
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;

COMMIT;

-- Diagnostics:
-- select relname as table_name, relrowsecurity as rls_enabled
-- from pg_class c join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname='public' and relname in ('mentor_votes', 'feasibility_votes');
--
-- select policyname, cmd, roles, qual, with_check
-- from pg_policies
-- where schemaname='public' and tablename in ('mentor_votes', 'feasibility_votes')
-- order by tablename, policyname;
