-- Save/Follow ideas table for IdeaDetails "Save" bubble + Feed Following tab.
-- Run in Supabase SQL editor.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.saved_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  idea_id uuid NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saved_ideas_user_idea_unique UNIQUE (user_id, idea_id)
);

ALTER TABLE public.saved_ideas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_ideas_select_own" ON public.saved_ideas;
DROP POLICY IF EXISTS "saved_ideas_insert_own" ON public.saved_ideas;
DROP POLICY IF EXISTS "saved_ideas_delete_own" ON public.saved_ideas;

CREATE POLICY "saved_ideas_select_own"
ON public.saved_ideas
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "saved_ideas_insert_own"
ON public.saved_ideas
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_ideas_delete_own"
ON public.saved_ideas
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_saved_ideas_user_created_at
  ON public.saved_ideas (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_ideas_idea_id
  ON public.saved_ideas (idea_id);

COMMIT;
