-- Robust Clubhouse database plan for Supabase/Postgres
-- Safe-by-default migration sketch using IF NOT EXISTS guards.
-- This plan upgrades existing groups/group_members usage and adds invite + governance support.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'group_role') THEN
    CREATE TYPE public.group_role AS ENUM ('leader', 'moderator', 'member');
  END IF;
END $$;

-- Core clubs table (extends existing groups semantics)
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  badge text DEFAULT '🏠',
  category text DEFAULT 'Community',
  color text DEFAULT '#7d5fff',
  banner_url text,
  leader_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS badge text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.groups
  ALTER COLUMN badge SET DEFAULT '🏠',
  ALTER COLUMN category SET DEFAULT 'Community';

CREATE INDEX IF NOT EXISTS idx_groups_created_at_desc ON public.groups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_groups_leader_id ON public.groups(leader_id);
CREATE INDEX IF NOT EXISTS idx_groups_category ON public.groups(category);

-- Members + role authority
CREATE TABLE IF NOT EXISTS public.group_members (
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.group_role NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  added_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  PRIMARY KEY (group_id, user_id)
);

ALTER TABLE public.group_members
  ADD COLUMN IF NOT EXISTS role public.group_role NOT NULL DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS joined_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS added_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_role ON public.group_members(group_id, role);

-- Optional invite workflow before membership
CREATE TABLE IF NOT EXISTS public.group_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  invited_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', -- pending|accepted|declined|revoked
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (group_id, invited_user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_invites_invited_user ON public.group_invites(invited_user_id, status);
CREATE INDEX IF NOT EXISTS idx_group_invites_group_status ON public.group_invites(group_id, status);

-- Discussion boards
CREATE TABLE IF NOT EXISTS public.group_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_posts_group_created ON public.group_posts(group_id, created_at DESC);

-- Idea lists linkage (explicit joins instead of text heuristics)
CREATE TABLE IF NOT EXISTS public.group_idea_links (
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  idea_id uuid NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  linked_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  linked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, idea_id)
);

CREATE INDEX IF NOT EXISTS idx_group_idea_links_idea_id ON public.group_idea_links(idea_id);

-- Wiki + live chat
CREATE TABLE IF NOT EXISTS public.group_wikis (
  group_id uuid PRIMARY KEY REFERENCES public.groups(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.group_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_chat_group_created ON public.group_chat_messages(group_id, created_at DESC);

-- Utility helpers
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id AND gm.user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.can_moderate_group(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.user_id = p_user_id
      AND gm.role IN ('leader', 'moderator')
  );
$$;

-- RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_idea_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_wikis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chat_messages ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname='public' AND tablename IN (
    'groups','group_members','group_invites','group_posts','group_idea_links','group_wikis','group_chat_messages'
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;

-- groups
CREATE POLICY groups_select_public ON public.groups
FOR SELECT USING (is_public = true OR public.is_group_member(id, auth.uid()));

CREATE POLICY groups_insert_auth ON public.groups
FOR INSERT TO authenticated
WITH CHECK (leader_id = auth.uid());

CREATE POLICY groups_update_leader ON public.groups
FOR UPDATE TO authenticated
USING (leader_id = auth.uid())
WITH CHECK (leader_id = auth.uid());

-- group_members
CREATE POLICY group_members_select_members ON public.group_members
FOR SELECT TO authenticated
USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY group_members_insert_leader_or_self ON public.group_members
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.leader_id = auth.uid()
  )
);

CREATE POLICY group_members_update_leader_only ON public.group_members
FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.leader_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.leader_id = auth.uid())
);

CREATE POLICY group_members_delete_leader_or_self ON public.group_members
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.leader_id = auth.uid())
);

-- group_invites
CREATE POLICY group_invites_select_parties ON public.group_invites
FOR SELECT TO authenticated
USING (
  invited_user_id = auth.uid()
  OR invited_by = auth.uid()
  OR public.can_moderate_group(group_id, auth.uid())
);

CREATE POLICY group_invites_insert_moderators ON public.group_invites
FOR INSERT TO authenticated
WITH CHECK (public.can_moderate_group(group_id, auth.uid()));

CREATE POLICY group_invites_update_parties ON public.group_invites
FOR UPDATE TO authenticated
USING (invited_user_id = auth.uid() OR public.can_moderate_group(group_id, auth.uid()))
WITH CHECK (invited_user_id = auth.uid() OR public.can_moderate_group(group_id, auth.uid()));

-- group_posts
CREATE POLICY group_posts_select_members ON public.group_posts
FOR SELECT TO authenticated
USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY group_posts_insert_moderators ON public.group_posts
FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND public.can_moderate_group(group_id, auth.uid())
);

-- group_idea_links
CREATE POLICY group_idea_links_select_members ON public.group_idea_links
FOR SELECT TO authenticated
USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY group_idea_links_insert_moderators ON public.group_idea_links
FOR INSERT TO authenticated
WITH CHECK (public.can_moderate_group(group_id, auth.uid()));

-- group_wikis
CREATE POLICY group_wikis_select_members ON public.group_wikis
FOR SELECT TO authenticated
USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY group_wikis_upsert_moderators ON public.group_wikis
FOR ALL TO authenticated
USING (public.can_moderate_group(group_id, auth.uid()))
WITH CHECK (public.can_moderate_group(group_id, auth.uid()));

-- group_chat_messages
CREATE POLICY group_chat_messages_select_members ON public.group_chat_messages
FOR SELECT TO authenticated
USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY group_chat_messages_insert_members ON public.group_chat_messages
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.is_group_member(group_id, auth.uid()));

COMMIT;

-- Diagnostics
-- SELECT * FROM pg_policies WHERE schemaname='public' AND tablename LIKE 'group_%' ORDER BY tablename, policyname;
-- SELECT g.id, g.name, g.category, g.badge, count(gm.user_id) AS members
-- FROM public.groups g LEFT JOIN public.group_members gm ON gm.group_id = g.id
-- GROUP BY g.id ORDER BY members DESC;
