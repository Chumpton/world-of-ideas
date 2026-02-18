-- Admin + Moderator RBAC + Moderation queue for Supabase
-- Run in Supabase SQL editor.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Profiles role + ban fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banned_reason text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banned_at timestamptz;

ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'user';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_role_valid'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_valid
      CHECK (role IN ('user', 'moderator', 'admin'));
  END IF;
END
$$;

UPDATE public.profiles
SET role = 'user'
WHERE role IS NULL OR role NOT IN ('user', 'moderator', 'admin');

-- 2) Canonical role table
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure every new profile gets a user_roles row.
CREATE OR REPLACE FUNCTION public.ensure_user_role_for_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (NEW.id, COALESCE(NULLIF(NEW.role, ''), 'user'), NULL)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_user_role_for_profile ON public.profiles;
CREATE TRIGGER trg_ensure_user_role_for_profile
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.ensure_user_role_for_profile();

INSERT INTO public.user_roles (user_id, role, assigned_by)
SELECT p.id, COALESCE(NULLIF(p.role, ''), 'user'), NULL
FROM public.profiles p
ON CONFLICT (user_id) DO UPDATE
SET role = EXCLUDED.role,
    updated_at = now();

CREATE OR REPLACE FUNCTION public.set_user_roles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_roles_updated_at ON public.user_roles;
CREATE TRIGGER trg_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.set_user_roles_updated_at();

-- Keep profiles.role synced from user_roles.
CREATE OR REPLACE FUNCTION public.sync_profile_role_from_user_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET role = NEW.role
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_role_from_user_roles ON public.user_roles;
CREATE TRIGGER trg_sync_profile_role_from_user_roles
AFTER INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_role_from_user_roles();

-- 3) Role helper functions
CREATE OR REPLACE FUNCTION public.is_admin(p_uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p_uid AND ur.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_mod(p_uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p_uid AND ur.role IN ('admin', 'moderator')
  );
$$;

-- 4) Secure RPC for assigning roles (admin only)
CREATE OR REPLACE FUNCTION public.set_user_role(p_target_user_id uuid, p_new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF p_new_role NOT IN ('user', 'moderator', 'admin') THEN
    RAISE EXCEPTION 'Invalid role: %', p_new_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (p_target_user_id, p_new_role, auth.uid())
  ON CONFLICT (user_id) DO UPDATE
    SET role = EXCLUDED.role,
        assigned_by = EXCLUDED.assigned_by,
        updated_at = now();
END;
$$;

-- 5) Secure RPC for banning users (admin/mod only)
CREATE OR REPLACE FUNCTION public.set_user_banned_status(
  p_target_user_id uuid,
  p_banned boolean,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_admin_or_mod(auth.uid()) THEN
    RAISE EXCEPTION 'Moderator access required';
  END IF;

  UPDATE public.profiles
  SET
    is_banned = p_banned,
    banned_reason = CASE WHEN p_banned THEN p_reason ELSE NULL END,
    banned_at = CASE WHEN p_banned THEN now() ELSE NULL END
  WHERE id = p_target_user_id;
END;
$$;

-- 6) Moderation reports queue
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('idea', 'comment', 'user', 'group', 'message')),
  target_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  review_notes text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_status_created_at
  ON public.reports (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_target
  ON public.reports (target_type, target_id);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_insert_own" ON public.reports;
DROP POLICY IF EXISTS "reports_select_moderators" ON public.reports;
DROP POLICY IF EXISTS "reports_update_moderators" ON public.reports;

CREATE POLICY "reports_insert_own"
ON public.reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "reports_select_moderators"
ON public.reports
FOR SELECT
TO authenticated
USING (public.is_admin_or_mod(auth.uid()));

CREATE POLICY "reports_update_moderators"
ON public.reports
FOR UPDATE
TO authenticated
USING (public.is_admin_or_mod(auth.uid()))
WITH CHECK (public.is_admin_or_mod(auth.uid()));

-- 7) user_roles table visibility
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_select_admin_mod" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_admin_only" ON public.user_roles;

CREATE POLICY "user_roles_select_admin_mod"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_admin_or_mod(auth.uid()));

CREATE POLICY "user_roles_update_admin_only"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 8) Allow moderators/admins to delete ideas (in addition to authors).
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ideas_delete_moderators" ON public.ideas;
CREATE POLICY "ideas_delete_moderators"
ON public.ideas
FOR DELETE
TO authenticated
USING (public.is_admin_or_mod(auth.uid()));

COMMIT;
