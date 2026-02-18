-- End-to-end Groups system hardening:
-- - create/find/join groups
-- - member-only group chat
-- - group wiki area
-- Run in Supabase SQL editor.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Core tables
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  banner_url TEXT,
  leader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  color TEXT DEFAULT '#7d5fff',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.group_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.group_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2) Wiki table (one page per group)
CREATE TABLE IF NOT EXISTS public.group_wikis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE UNIQUE,
  content TEXT DEFAULT '',
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3) Enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_wikis ENABLE ROW LEVEL SECURITY;

-- 4) Reset policies
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('groups', 'group_members', 'group_posts', 'group_chat_messages', 'group_wikis')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;

-- 5) Groups policies
CREATE POLICY "groups_select_public"
ON public.groups
FOR SELECT
USING (true);

CREATE POLICY "groups_insert_creator_is_leader"
ON public.groups
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "groups_update_leader_only"
ON public.groups
FOR UPDATE
TO authenticated
USING (auth.uid() = leader_id)
WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "groups_delete_leader_only"
ON public.groups
FOR DELETE
TO authenticated
USING (auth.uid() = leader_id);

-- 6) Group membership policies
CREATE POLICY "group_members_select_public"
ON public.group_members
FOR SELECT
USING (true);

CREATE POLICY "group_members_insert_self"
ON public.group_members
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "group_members_delete_self_or_leader"
ON public.group_members
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_id AND g.leader_id = auth.uid()
  )
);

-- 7) Posts policies (members can write; everyone can read)
CREATE POLICY "group_posts_select_public"
ON public.group_posts
FOR SELECT
USING (true);

CREATE POLICY "group_posts_insert_member"
ON public.group_posts
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = author_id
  AND EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_id AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "group_posts_update_author_or_leader"
ON public.group_posts
FOR UPDATE
TO authenticated
USING (
  auth.uid() = author_id
  OR EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_id AND g.leader_id = auth.uid()
  )
);

CREATE POLICY "group_posts_delete_author_or_leader"
ON public.group_posts
FOR DELETE
TO authenticated
USING (
  auth.uid() = author_id
  OR EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_id AND g.leader_id = auth.uid()
  )
);

-- 8) Chat policies (member-only room)
CREATE POLICY "group_chat_select_members"
ON public.group_chat_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_id AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "group_chat_insert_members"
ON public.group_chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_id AND gm.user_id = auth.uid()
  )
);

-- 9) Wiki policies (read public, write members)
CREATE POLICY "group_wikis_select_public"
ON public.group_wikis
FOR SELECT
USING (true);

CREATE POLICY "group_wikis_insert_members"
ON public.group_wikis
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = updated_by
  AND EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_id AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "group_wikis_update_members"
ON public.group_wikis
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_id AND gm.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = updated_by
  AND EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_id AND gm.user_id = auth.uid()
  )
);

COMMIT;

-- 10) Indexes
CREATE INDEX IF NOT EXISTS idx_group_members_group_user ON public.group_members (group_id, user_id);
CREATE INDEX IF NOT EXISTS idx_group_posts_group_created ON public.group_posts (group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_chat_group_created ON public.group_chat_messages (group_id, created_at DESC);
