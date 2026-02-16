-- ═══════════════════════════════════════════════════════════
--  Drop Unused/Legacy Tables
--  These tables exist in the DB but are not used by the code.
--  The `groups` system replaces clans functionality.
-- ═══════════════════════════════════════════════════════════

-- 1. Drop legacy comments table (replaced by idea_comments)
DROP TABLE IF EXISTS public.comments CASCADE;

-- 2. Drop unused clans tables (groups system is used instead)
DROP TABLE IF EXISTS public.clan_members CASCADE;
DROP TABLE IF EXISTS public.clans CASCADE;

-- 3. Drop unused mentor_votes table
DROP TABLE IF EXISTS public.mentor_votes CASCADE;

-- 4. Verify remaining tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
