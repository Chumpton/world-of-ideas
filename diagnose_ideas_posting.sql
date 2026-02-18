-- Diagnose why ideas are not posting (schema + policies + constraints).
-- Run in Supabase SQL editor.

-- 1) Core table exists and RLS status
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'ideas';

-- 2) Ideas columns and types that frontend insert relies on
SELECT
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'ideas'
  AND column_name IN (
    'id','title','description','category','tags',
    'author_id','author_name','author_avatar',
    'status','votes','roles_needed','resources_needed',
    'markdown_body','lat','lng','city',
    'title_image','thumbnail_url','idea_data',
    'forked_from','created_at'
  )
ORDER BY ordinal_position;

-- 3) Ideas RLS policies (look for conflicting/duplicate insert checks)
SELECT
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'ideas'
ORDER BY policyname;

-- 4) FK constraints on ideas (author_id/profile mismatch is common failure)
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'ideas'
ORDER BY tc.constraint_type, tc.constraint_name;

-- 5) Quick insert sanity check via auth context
-- Run this while authenticated in SQL editor if needed:
-- select auth.uid() as auth_uid;
-- select id, username from public.profiles where id = auth.uid();
