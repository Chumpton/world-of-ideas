-- Canonical social core reset: profiles + follows + ideas + comments + messages
-- Run once in Supabase SQL editor.
-- This script intentionally drops policy drift and legacy trigger drift, then recreates a coherent baseline.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Profiles canonical columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS skills text[],
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS links jsonb,
  ADD COLUMN IF NOT EXISTS followers_count integer,
  ADD COLUMN IF NOT EXISTS following_count integer,
  ADD COLUMN IF NOT EXISTS theme_preference text,
  ADD COLUMN IF NOT EXISTS submissions integer,
  ADD COLUMN IF NOT EXISTS influence integer,
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS is_banned boolean,
  ADD COLUMN IF NOT EXISTS banned_reason text,
  ADD COLUMN IF NOT EXISTS banned_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

ALTER TABLE public.profiles
  ALTER COLUMN bio SET DEFAULT '',
  ALTER COLUMN skills SET DEFAULT '{}'::text[],
  ALTER COLUMN location SET DEFAULT '',
  ALTER COLUMN links SET DEFAULT '[]'::jsonb,
  ALTER COLUMN followers_count SET DEFAULT 0,
  ALTER COLUMN following_count SET DEFAULT 0,
  ALTER COLUMN theme_preference SET DEFAULT 'light',
  ALTER COLUMN submissions SET DEFAULT 0,
  ALTER COLUMN influence SET DEFAULT 0,
  ALTER COLUMN role SET DEFAULT 'user',
  ALTER COLUMN is_banned SET DEFAULT false,
  ALTER COLUMN updated_at SET DEFAULT now();

UPDATE public.profiles
SET
  username = COALESCE(NULLIF(split_part(COALESCE(username, ''), '@', 1), ''), 'user_' || substr(id::text, 1, 8)),
  display_name = COALESCE(NULLIF(display_name, ''), NULLIF(split_part(COALESCE(username, ''), '@', 1), ''), 'User'),
  bio = COALESCE(bio, ''),
  skills = COALESCE(skills, '{}'::text[]),
  location = COALESCE(location, ''),
  links = COALESCE(links, '[]'::jsonb),
  followers_count = COALESCE(followers_count, 0),
  following_count = COALESCE(following_count, 0),
  theme_preference = COALESCE(NULLIF(theme_preference, ''), 'light'),
  submissions = COALESCE(submissions, 0),
  influence = COALESCE(influence, 0),
  role = COALESCE(NULLIF(role, ''), 'user'),
  is_banned = COALESCE(is_banned, false),
  updated_at = COALESCE(updated_at, now())
WHERE
  username IS NULL OR username = ''
  OR display_name IS NULL OR display_name = ''
  OR bio IS NULL OR skills IS NULL OR location IS NULL OR links IS NULL
  OR followers_count IS NULL OR following_count IS NULL
  OR theme_preference IS NULL OR theme_preference = ''
  OR submissions IS NULL OR influence IS NULL
  OR role IS NULL OR role = ''
  OR is_banned IS NULL
  OR updated_at IS NULL
  OR username LIKE '%@%';

-- 2) Drop known legacy profile triggers/functions that caused drift
DROP TRIGGER IF EXISTS trg_protect_profile_sensitive_fields ON public.profiles;
DROP TRIGGER IF EXISTS trg_set_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS trg_ensure_user_role_for_profile ON public.profiles;

DROP FUNCTION IF EXISTS public.protect_profile_sensitive_fields();
DROP FUNCTION IF EXISTS public.trg_set_profiles_updated_at();
DROP FUNCTION IF EXISTS public.ensure_user_role_for_profile();

-- 3) Recreate minimal stable profile triggers
CREATE OR REPLACE FUNCTION public.trg_set_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.trg_set_profiles_updated_at();

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

CREATE TRIGGER trg_protect_profile_sensitive_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_sensitive_fields();

-- 4) Follows (if present) -> keep profile counters synced
CREATE OR REPLACE FUNCTION public.recalc_follow_counts(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF to_regclass('public.follows') IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.profiles p
  SET
    followers_count = COALESCE((SELECT COUNT(*)::int FROM public.follows f WHERE f.following_id = p.id), 0),
    following_count = COALESCE((SELECT COUNT(*)::int FROM public.follows f WHERE f.follower_id = p.id), 0)
  WHERE p.id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_follow_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('INSERT','UPDATE') THEN
    PERFORM public.recalc_follow_counts(NEW.follower_id);
    PERFORM public.recalc_follow_counts(NEW.following_id);
  END IF;
  IF TG_OP IN ('DELETE','UPDATE') THEN
    PERFORM public.recalc_follow_counts(OLD.follower_id);
    PERFORM public.recalc_follow_counts(OLD.following_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.follows') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_sync_follow_counts ON public.follows;
    CREATE TRIGGER trg_sync_follow_counts
    AFTER INSERT OR UPDATE OR DELETE ON public.follows
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_sync_follow_counts();
  END IF;
END $$;

-- 5) Canonical setup_profile RPC
CREATE OR REPLACE FUNCTION public.setup_profile(
  p_username text DEFAULT NULL,
  p_display_name text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_username text;
  v_display_name text;
  v_avatar text;
  v_existing_username text;
  v_existing_display_name text;
  v_meta_username text;
  v_meta_display_name text;
  result json;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT
    NULLIF(split_part(COALESCE(u.raw_user_meta_data->>'username', ''), '@', 1), ''),
    NULLIF(u.raw_user_meta_data->>'display_name', '')
  INTO v_meta_username, v_meta_display_name
  FROM auth.users u
  WHERE u.id = v_uid;

  SELECT p.username, p.display_name
  INTO v_existing_username, v_existing_display_name
  FROM public.profiles p
  WHERE p.id = v_uid;

  v_username := COALESCE(
    NULLIF(split_part(COALESCE(p_username, ''), '@', 1), ''),
    v_existing_username,
    v_meta_username,
    'user_' || substr(v_uid::text, 1, 8)
  );

  v_display_name := COALESCE(
    NULLIF(p_display_name, ''),
    v_existing_display_name,
    v_meta_display_name,
    v_username,
    'User'
  );

  v_avatar := NULLIF(trim(COALESCE(p_avatar_url, '')), '');

  INSERT INTO public.profiles (id, username, display_name, avatar_url, created_at, updated_at)
  VALUES (v_uid, v_username, v_display_name, v_avatar, now(), now())
  ON CONFLICT (id) DO UPDATE
  SET
    username = COALESCE(NULLIF(v_username, ''), public.profiles.username),
    display_name = COALESCE(NULLIF(v_display_name, ''), public.profiles.display_name),
    avatar_url = COALESCE(v_avatar, public.profiles.avatar_url),
    updated_at = now();

  SELECT row_to_json(p) INTO result
  FROM public.profiles p
  WHERE p.id = v_uid;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.setup_profile(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.setup_profile(text, text, text) TO authenticated;

-- 5b) One-time backfill: align denormalized author labels to display_name.
DO $$
BEGIN
  IF to_regclass('public.ideas') IS NOT NULL THEN
    UPDATE public.ideas i
    SET author_name = COALESCE(p.display_name, p.username, i.author_name)
    FROM public.profiles p
    WHERE p.id = i.author_id
      AND COALESCE(i.author_name, '') <> COALESCE(COALESCE(p.display_name, p.username), '');
  END IF;

  IF to_regclass('public.idea_comments') IS NOT NULL THEN
    UPDATE public.idea_comments c
    SET author = COALESCE(p.display_name, p.username, c.author),
        author_avatar = COALESCE(p.avatar_url, c.author_avatar)
    FROM public.profiles p
    WHERE p.id = c.user_id
      AND (
        COALESCE(c.author, '') <> COALESCE(COALESCE(p.display_name, p.username), '')
        OR COALESCE(c.author_avatar, '') <> COALESCE(COALESCE(p.avatar_url, ''), '')
      );
  END IF;

  IF to_regclass('public.guides') IS NOT NULL THEN
    UPDATE public.guides g
    SET author_name = COALESCE(p.display_name, p.username, g.author_name)
    FROM public.profiles p
    WHERE p.id = g.author_id
      AND COALESCE(g.author_name, '') <> COALESCE(COALESCE(p.display_name, p.username), '');
  END IF;

  IF to_regclass('public.discussions') IS NOT NULL THEN
    UPDATE public.discussions d
    SET author = COALESCE(p.display_name, p.username, d.author),
        author_avatar = COALESCE(p.avatar_url, d.author_avatar)
    FROM public.profiles p
    WHERE p.id = d.user_id
      AND (
        COALESCE(d.author, '') <> COALESCE(COALESCE(p.display_name, p.username), '')
        OR COALESCE(d.author_avatar, '') <> COALESCE(COALESCE(p.avatar_url, ''), '')
      );
  END IF;
END $$;

-- 6) RLS reset helper
DO $$
DECLARE
  t text;
  p record;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','ideas','idea_comments','messages','follows']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      FOR p IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname='public' AND tablename=t
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- 7) Canonical policies
-- profiles
CREATE POLICY profiles_select_public ON public.profiles FOR SELECT USING (true);
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ideas (if exists)
DO $$
BEGIN
  IF to_regclass('public.ideas') IS NOT NULL THEN
    EXECUTE 'CREATE POLICY ideas_select_public ON public.ideas FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY ideas_insert_owner ON public.ideas FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid())';
    EXECUTE 'CREATE POLICY ideas_update_owner ON public.ideas FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid())';
    EXECUTE 'CREATE POLICY ideas_delete_owner ON public.ideas FOR DELETE TO authenticated USING (author_id = auth.uid())';
  END IF;
END $$;

-- idea_comments (if exists)
DO $$
BEGIN
  IF to_regclass('public.idea_comments') IS NOT NULL THEN
    EXECUTE 'CREATE POLICY idea_comments_select_public ON public.idea_comments FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY idea_comments_insert_owner ON public.idea_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY idea_comments_update_owner ON public.idea_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY idea_comments_delete_owner ON public.idea_comments FOR DELETE TO authenticated USING (auth.uid() = user_id)';
  END IF;
END $$;

-- messages (if exists)
DO $$
BEGIN
  IF to_regclass('public.messages') IS NOT NULL THEN
    EXECUTE 'CREATE POLICY messages_select_participants ON public.messages FOR SELECT TO authenticated USING (auth.uid() = from_id OR auth.uid() = to_id)';
    EXECUTE 'CREATE POLICY messages_insert_sender ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_id)';
    EXECUTE 'CREATE POLICY messages_update_participants ON public.messages FOR UPDATE TO authenticated USING (auth.uid() = from_id OR auth.uid() = to_id) WITH CHECK (auth.uid() = from_id OR auth.uid() = to_id)';
    EXECUTE 'CREATE POLICY messages_delete_sender ON public.messages FOR DELETE TO authenticated USING (auth.uid() = from_id)';
  END IF;
END $$;

-- follows (if exists)
DO $$
BEGIN
  IF to_regclass('public.follows') IS NOT NULL THEN
    EXECUTE 'CREATE POLICY follows_select_public ON public.follows FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY follows_insert_owner ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id)';
    EXECUTE 'CREATE POLICY follows_delete_owner ON public.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id)';
  END IF;
END $$;

COMMIT;

-- Diagnostics
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename IN ('profiles','ideas','idea_comments','messages','follows') ORDER BY tablename, policyname;
-- SELECT proname FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('setup_profile','protect_profile_sensitive_fields','trg_set_profiles_updated_at','trg_sync_follow_counts');
