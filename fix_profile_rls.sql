-- ============================================================
-- DEFINITIVE FIX: Server-side profile setup function
-- This runs with SECURITY DEFINER (bypasses RLS) and is safe
-- because it only allows updating YOUR OWN profile via auth.uid()
-- ============================================================

-- 1. FIX RLS (belt AND suspenders)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- 2. CREATE the RPC function that register() will call
-- SECURITY DEFINER = runs with the function owner's privileges, NOT the caller's
-- This bypasses RLS but is safe because auth.uid() locks it to the caller's own row
CREATE OR REPLACE FUNCTION public.setup_profile(
    p_username TEXT DEFAULT NULL,
    p_display_name TEXT DEFAULT NULL,
    p_avatar_url TEXT DEFAULT NULL,
    p_bio TEXT DEFAULT NULL,
    p_skills TEXT[] DEFAULT NULL,
    p_location TEXT DEFAULT NULL,
    p_role TEXT DEFAULT 'explorer'
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
BEGIN
    UPDATE public.profiles
    SET 
        username = COALESCE(p_username, username),
        display_name = COALESCE(p_display_name, display_name, p_username),
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        bio = COALESCE(p_bio, bio),
        skills = COALESCE(p_skills, skills),
        location = COALESCE(p_location, location),
        role = COALESCE(p_role, role),
        influence = 0,
        updated_at = NOW()
    WHERE id = auth.uid();

    SELECT row_to_json(p) INTO result
    FROM public.profiles p
    WHERE p.id = auth.uid();

    RETURN result;
END;
$$;

-- 3. Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.setup_profile TO authenticated;

-- 4. FIX the trigger to use signup metadata (if trigger exists)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, username, display_name, avatar_url, influence)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        0
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- 5. Attach trigger (replace any existing one)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. VERIFY
SELECT 'setup_profile function' as item, 
       EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'setup_profile') as exists;
SELECT 'handle_new_user trigger' as item,
       EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') as exists;
