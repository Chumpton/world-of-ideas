-- Idea wiki resources for the new IdeaDetails "Wiki" tab.
-- Run in Supabase SQL editor.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.idea_wiki_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  entry_type text NOT NULL DEFAULT 'resource',
  url text,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT idea_wiki_entries_title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT idea_wiki_entries_entry_type_valid CHECK (entry_type IN ('blueprint', 'guide', 'link', 'resource'))
);

CREATE OR REPLACE FUNCTION public.set_idea_wiki_entries_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_idea_wiki_entries_updated_at ON public.idea_wiki_entries;
CREATE TRIGGER trg_idea_wiki_entries_updated_at
BEFORE UPDATE ON public.idea_wiki_entries
FOR EACH ROW
EXECUTE FUNCTION public.set_idea_wiki_entries_updated_at();

ALTER TABLE public.idea_wiki_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "idea_wiki_entries_select_public" ON public.idea_wiki_entries;
DROP POLICY IF EXISTS "idea_wiki_entries_insert_owner" ON public.idea_wiki_entries;
DROP POLICY IF EXISTS "idea_wiki_entries_update_owner" ON public.idea_wiki_entries;
DROP POLICY IF EXISTS "idea_wiki_entries_delete_owner" ON public.idea_wiki_entries;

CREATE POLICY "idea_wiki_entries_select_public"
ON public.idea_wiki_entries
FOR SELECT
USING (true);

CREATE POLICY "idea_wiki_entries_insert_owner"
ON public.idea_wiki_entries
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "idea_wiki_entries_update_owner"
ON public.idea_wiki_entries
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "idea_wiki_entries_delete_owner"
ON public.idea_wiki_entries
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_idea_wiki_entries_idea_created_at
  ON public.idea_wiki_entries (idea_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_idea_wiki_entries_user_id
  ON public.idea_wiki_entries (user_id);

COMMIT;
