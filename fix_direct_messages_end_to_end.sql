-- End-to-end Direct Messaging hardening for Supabase.
-- Run in Supabase SQL editor.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Table shape expected by frontend.
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.messages ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.messages ALTER COLUMN read SET DEFAULT false;
ALTER TABLE public.messages ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

UPDATE public.messages
SET
  read = COALESCE(read, false),
  created_at = COALESCE(created_at, now())
WHERE read IS NULL OR created_at IS NULL;

-- 2) RLS policies (single coherent set).
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'messages'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.messages', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "messages_select_participants"
ON public.messages
FOR SELECT
TO authenticated
USING (auth.uid() = from_id OR auth.uid() = to_id);

CREATE POLICY "messages_insert_sender"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = from_id);

CREATE POLICY "messages_update_participants"
ON public.messages
FOR UPDATE
TO authenticated
USING (auth.uid() = from_id OR auth.uid() = to_id)
WITH CHECK (auth.uid() = from_id OR auth.uid() = to_id);

CREATE POLICY "messages_delete_sender"
ON public.messages
FOR DELETE
TO authenticated
USING (auth.uid() = from_id);

COMMIT;

-- 3) Performance indexes.
CREATE INDEX IF NOT EXISTS idx_messages_from_id_created_at ON public.messages (from_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_to_id_created_at ON public.messages (to_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_participants_created_at ON public.messages (from_id, to_id, created_at DESC);

-- Diagnostics:
-- select policyname, cmd, qual, with_check from pg_policies where schemaname='public' and tablename='messages' order by policyname;
-- select count(*) from public.messages;
