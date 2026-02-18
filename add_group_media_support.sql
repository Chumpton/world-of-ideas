-- Add group media support (save links/images/files per group)
-- Run in Supabase SQL editor.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.group_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'link',
  caption text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT group_media_title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT group_media_url_not_empty CHECK (length(trim(media_url)) > 0),
  CONSTRAINT group_media_type_valid CHECK (media_type IN ('link', 'image', 'video', 'file'))
);

ALTER TABLE public.group_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "group_media_select_public" ON public.group_media;
DROP POLICY IF EXISTS "group_media_insert_members" ON public.group_media;
DROP POLICY IF EXISTS "group_media_update_owner_or_leader" ON public.group_media;
DROP POLICY IF EXISTS "group_media_delete_owner_or_leader" ON public.group_media;

CREATE POLICY "group_media_select_public"
ON public.group_media
FOR SELECT
USING (true);

CREATE POLICY "group_media_insert_members"
ON public.group_media
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_id
      AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "group_media_update_owner_or_leader"
ON public.group_media
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_id
      AND g.leader_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_id
      AND g.leader_id = auth.uid()
  )
);

CREATE POLICY "group_media_delete_owner_or_leader"
ON public.group_media
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_id
      AND g.leader_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_group_media_group_created_at
  ON public.group_media (group_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_group_media_user
  ON public.group_media (user_id);

COMMIT;
