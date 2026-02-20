-- Fix profile bio saving + influence updates
-- Run in Supabase SQL editor.

BEGIN;

-- 0) Ensure protected/sensitive columns exist before trigger function references them.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS influence integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_reason text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_at timestamptz;

-- 1) Ensure profiles has RLS enabled and basic self-update policies.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_select_public'
  ) THEN
    EXECUTE 'CREATE POLICY "profiles_select_public" ON public.profiles FOR SELECT USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_insert_own'
  ) THEN
    EXECUTE 'CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_update_own'
  ) THEN
    EXECUTE 'CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id)';
  END IF;
END
$$;

-- 2) Guard sensitive fields from self-escalation while allowing bio/profile edits.
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() = OLD.id THEN
    NEW.role := OLD.role;
    NEW.influence := OLD.influence;
    NEW.is_banned := OLD.is_banned;
    NEW.banned_reason := OLD.banned_reason;
    NEW.banned_at := OLD.banned_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_sensitive_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_sensitive_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_sensitive_fields();

-- 3) Reliable influence increment RPC used by app voting flows.
CREATE OR REPLACE FUNCTION public.increment_influence(user_id uuid, delta integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Keep changes bounded to reduce abuse surface.
  IF delta < -50 OR delta > 50 THEN
    RAISE EXCEPTION 'Delta out of allowed range';
  END IF;

  UPDATE public.profiles
  SET influence = COALESCE(influence, 0) + delta
  WHERE id = user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_influence(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_influence(uuid, integer) TO authenticated;

COMMIT;
