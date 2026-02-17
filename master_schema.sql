-- ============================================================
-- COMPREHENSIVE DATABASE AUDIT & FIX
-- Run this ENTIRE script in Supabase SQL Editor (one shot)
-- ============================================================

-- ========================
-- SECTION 1: PROFILES TABLE
-- ========================

-- 1a. Ensure all needed columns exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS expertise TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS border_color TEXT DEFAULT '#6C63FF';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS influence INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 50;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS followers JSONB DEFAULT '[]';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS following JSONB DEFAULT '[]';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS submissions INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mentorship JSONB DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'dark';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 1b. Fix influence default (was 100, should be 0)
ALTER TABLE public.profiles ALTER COLUMN influence SET DEFAULT 0;

-- 1c. RLS Policies for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ========================
-- SECTION 2: IDEAS TABLE
-- ========================

-- 2a. Ensure all needed columns exist
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'invention';
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS author_id UUID;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS author_name TEXT;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS author_avatar TEXT;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS votes INTEGER DEFAULT 0;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS forked_from UUID;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS roles_needed JSONB DEFAULT '[]';
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS resources_needed JSONB DEFAULT '[]';
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS markdown_body TEXT;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS lat FLOAT;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS lng FLOAT;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS shares INTEGER DEFAULT 0;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 2b. Ensure FK from ideas.author_id -> profiles.id exists
-- This is CRITICAL for the join query: .select('*, profiles(username, avatar_url, tier)')
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'ideas' AND constraint_name = 'ideas_author_id_fkey'
    ) THEN
        -- Only add if author_id column exists and there are no orphans
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ideas' AND column_name = 'author_id') THEN
            -- Clean orphan ideas first (author_id not in profiles)
            DELETE FROM public.ideas WHERE author_id IS NOT NULL AND author_id NOT IN (SELECT id FROM public.profiles);
            -- Add FK
            ALTER TABLE public.ideas ADD CONSTRAINT ideas_author_id_fkey 
                FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- 2c. RLS for ideas
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ideas viewable by everyone" ON public.ideas;
CREATE POLICY "Ideas viewable by everyone" ON public.ideas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users can create ideas" ON public.ideas;
CREATE POLICY "Auth users can create ideas" ON public.ideas 
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can update own ideas" ON public.ideas;
CREATE POLICY "Authors can update own ideas" ON public.ideas 
    FOR UPDATE TO authenticated USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can delete own ideas" ON public.ideas;
CREATE POLICY "Authors can delete own ideas" ON public.ideas 
    FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- ========================
-- SECTION 3: IDEA VOTES TABLE
-- ========================
CREATE TABLE IF NOT EXISTS public.idea_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    direction INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(idea_id, user_id)
);

ALTER TABLE public.idea_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Votes viewable by everyone" ON public.idea_votes;
CREATE POLICY "Votes viewable by everyone" ON public.idea_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users can vote" ON public.idea_votes;
CREATE POLICY "Auth users can vote" ON public.idea_votes 
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can change own votes" ON public.idea_votes;
CREATE POLICY "Users can change own votes" ON public.idea_votes 
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove own votes" ON public.idea_votes;
CREATE POLICY "Users can remove own votes" ON public.idea_votes 
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ========================
-- SECTION 4: IDEA COMMENTS TABLE
-- ========================
CREATE TABLE IF NOT EXISTS public.idea_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    author TEXT,
    author_avatar TEXT,
    parent_id UUID REFERENCES public.idea_comments(id),
    votes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE
);

ALTER TABLE public.idea_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Comments viewable by everyone" ON public.idea_comments;
CREATE POLICY "Comments viewable by everyone" ON public.idea_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth users can insert comments" ON public.idea_comments;
CREATE POLICY "Auth users can insert comments" ON public.idea_comments FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Users can update own comments" ON public.idea_comments;
CREATE POLICY "Users can update own comments" ON public.idea_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ========================
-- SECTION 5: FOLLOWS TABLE
-- ========================
CREATE TABLE IF NOT EXISTS public.follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Follows viewable by everyone" ON public.follows;
CREATE POLICY "Follows viewable by everyone" ON public.follows FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth users can follow" ON public.follows;
CREATE POLICY "Auth users can follow" ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
DROP POLICY IF EXISTS "Auth users can unfollow" ON public.follows;
CREATE POLICY "Auth users can unfollow" ON public.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- ========================
-- SECTION 6: GUIDES TABLE
-- ========================
CREATE TABLE IF NOT EXISTS public.guides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    author_name TEXT,
    author_avatar TEXT,
    category TEXT DEFAULT 'general',
    tags TEXT[] DEFAULT '{}',
    votes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Guides viewable by everyone" ON public.guides;
CREATE POLICY "Guides viewable by everyone" ON public.guides FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth users can create guides" ON public.guides;
CREATE POLICY "Auth users can create guides" ON public.guides FOR INSERT TO authenticated WITH CHECK (true);

-- ========================
-- SECTION 7: NOTIFICATIONS TABLE
-- ========================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT,
    message TEXT,
    read BOOLEAN DEFAULT false,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own notifications" ON public.notifications;
CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ========================
-- SECTION 8: DISCUSSIONS TABLE
-- ========================
CREATE TABLE IF NOT EXISTS public.discussions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    body TEXT,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    author_name TEXT,
    author_avatar TEXT,
    category TEXT DEFAULT 'general',
    votes INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Discussions viewable by everyone" ON public.discussions;
CREATE POLICY "Discussions viewable by everyone" ON public.discussions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth users can create discussions" ON public.discussions;
CREATE POLICY "Auth users can create discussions" ON public.discussions FOR INSERT TO authenticated WITH CHECK (true);

-- ========================
-- SECTION 9: DISCUSSION COMMENTS TABLE
-- ========================
CREATE TABLE IF NOT EXISTS public.discussion_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discussion_id UUID REFERENCES public.discussions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID,
    votes INTEGER DEFAULT 0,
    author_name TEXT,
    author_avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.discussion_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Discussion comments viewable" ON public.discussion_comments;
CREATE POLICY "Discussion comments viewable" ON public.discussion_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth users can comment on discussions" ON public.discussion_comments;
CREATE POLICY "Auth users can comment on discussions" ON public.discussion_comments FOR INSERT TO authenticated WITH CHECK (true);

-- ========================
-- SECTION 10: MESSAGES TABLE
-- ========================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    to_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own messages" ON public.messages;
CREATE POLICY "Users see own messages" ON public.messages FOR SELECT TO authenticated 
    USING (auth.uid() = from_id OR auth.uid() = to_id);
DROP POLICY IF EXISTS "Auth users can send messages" ON public.messages;
CREATE POLICY "Auth users can send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_id);

-- ========================
-- SECTION 11: GROUPS & RELATED TABLES
-- ========================
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    banner_url TEXT,
    leader_id UUID REFERENCES public.profiles(id),
    color TEXT DEFAULT '#7d5fff',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Groups viewable by everyone" ON public.groups;
CREATE POLICY "Groups viewable by everyone" ON public.groups FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth users can create groups" ON public.groups;
CREATE POLICY "Auth users can create groups" ON public.groups FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Group members viewable" ON public.group_members;
CREATE POLICY "Group members viewable" ON public.group_members FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth users can join groups" ON public.group_members;
CREATE POLICY "Auth users can join groups" ON public.group_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_members;
CREATE POLICY "Users can leave groups" ON public.group_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.group_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT,
    body TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.group_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Group posts viewable" ON public.group_posts;
CREATE POLICY "Group posts viewable" ON public.group_posts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth users can post in groups" ON public.group_posts;
CREATE POLICY "Auth users can post in groups" ON public.group_posts FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.group_chat (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    username TEXT,
    avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.group_chat ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Group chat viewable" ON public.group_chat;
CREATE POLICY "Group chat viewable" ON public.group_chat FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth users can chat in groups" ON public.group_chat;
CREATE POLICY "Auth users can chat in groups" ON public.group_chat FOR INSERT TO authenticated WITH CHECK (true);

-- ========================
-- SECTION 12: RESOURCES, BOUNTIES, APPLICATIONS
-- ========================
CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'other',
    status TEXT DEFAULT 'pending',
    pledged_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    pledger_name TEXT,
    quantity INTEGER DEFAULT 1,
    estimated_value DECIMAL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Resources viewable by everyone" ON public.resources;
CREATE POLICY "Resources viewable by everyone" ON public.resources FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth users can pledge resources" ON public.resources;
CREATE POLICY "Auth users can pledge resources" ON public.resources FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.bounties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES public.profiles(id),
    title TEXT NOT NULL,
    description TEXT,
    reward_amount INTEGER DEFAULT 0,
    status TEXT DEFAULT 'open',
    assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    bounty_data JSONB DEFAULT '{}'
);
ALTER TABLE public.bounties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Bounties viewable by everyone" ON public.bounties;
CREATE POLICY "Bounties viewable by everyone" ON public.bounties FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth users can create bounties" ON public.bounties;
CREATE POLICY "Auth users can create bounties" ON public.bounties FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Creators can update bounties" ON public.bounties;
CREATE POLICY "Creators can update bounties" ON public.bounties FOR UPDATE TO authenticated USING (auth.uid() = creator_id);

CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE,
    applicant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Applications viewable by everyone" ON public.applications;
CREATE POLICY "Applications viewable by everyone" ON public.applications FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth users can apply" ON public.applications;
CREATE POLICY "Auth users can apply" ON public.applications FOR INSERT TO authenticated WITH CHECK (true);

-- ========================
-- SECTION 13: GUIDE VOTES & COMMENTS
-- ========================
CREATE TABLE IF NOT EXISTS public.guide_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guide_id UUID REFERENCES public.guides(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    direction INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(guide_id, user_id)
);
ALTER TABLE public.guide_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Guide votes viewable" ON public.guide_votes;
CREATE POLICY "Guide votes viewable" ON public.guide_votes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth users can vote guides" ON public.guide_votes;
CREATE POLICY "Auth users can vote guides" ON public.guide_votes FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.guide_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guide_id UUID REFERENCES public.guides(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.guide_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Guide comments viewable" ON public.guide_comments;
CREATE POLICY "Guide comments viewable" ON public.guide_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth users can comment guides" ON public.guide_comments;
CREATE POLICY "Auth users can comment guides" ON public.guide_comments FOR INSERT TO authenticated WITH CHECK (true);

-- ========================
-- SECTION 14: IDEA COMMENT VOTES
-- ========================
CREATE TABLE IF NOT EXISTS public.idea_comment_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID REFERENCES public.idea_comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    direction INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);
ALTER TABLE public.idea_comment_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Comment votes viewable" ON public.idea_comment_votes;
CREATE POLICY "Comment votes viewable" ON public.idea_comment_votes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth users can vote comments" ON public.idea_comment_votes;
CREATE POLICY "Auth users can vote comments" ON public.idea_comment_votes FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Users can change comment votes" ON public.idea_comment_votes;
CREATE POLICY "Users can change comment votes" ON public.idea_comment_votes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can remove comment votes" ON public.idea_comment_votes;
CREATE POLICY "Users can remove comment votes" ON public.idea_comment_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ========================
-- SECTION 15: ACTIVITY LOG
-- ========================
CREATE TABLE IF NOT EXISTS public.activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Activity viewable by owner" ON public.activity_log;
CREATE POLICY "Activity viewable by owner" ON public.activity_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "System can log activity" ON public.activity_log;
CREATE POLICY "System can log activity" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (true);

-- ========================
-- SECTION 16: FEASIBILITY VOTES
-- ========================
CREATE TABLE IF NOT EXISTS public.feasibility_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    score INTEGER CHECK (score >= 1 AND score <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(idea_id, user_id)
);
ALTER TABLE public.feasibility_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Feasibility votes viewable" ON public.feasibility_votes;
CREATE POLICY "Feasibility votes viewable" ON public.feasibility_votes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth users can vote feasibility" ON public.feasibility_votes;
CREATE POLICY "Auth users can vote feasibility" ON public.feasibility_votes FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Users can update feasibility vote" ON public.feasibility_votes;
CREATE POLICY "Users can update feasibility vote" ON public.feasibility_votes FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ========================
-- SECTION 17: COIN TRANSACTIONS
-- ========================
CREATE TABLE IF NOT EXISTS public.coin_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    to_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    amount INTEGER NOT NULL,
    type TEXT DEFAULT 'tip',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Transactions viewable by participants" ON public.coin_transactions;
CREATE POLICY "Transactions viewable by participants" ON public.coin_transactions FOR SELECT TO authenticated 
    USING (auth.uid() = from_id OR auth.uid() = to_id);
DROP POLICY IF EXISTS "Auth users can create transactions" ON public.coin_transactions;
CREATE POLICY "Auth users can create transactions" ON public.coin_transactions FOR INSERT TO authenticated WITH CHECK (true);

-- ========================
-- SECTION 18: RPC FUNCTIONS
-- ========================

-- Profile setup (bypasses RLS for signup)
CREATE OR REPLACE FUNCTION public.setup_profile(
    p_username TEXT DEFAULT NULL,
    p_display_name TEXT DEFAULT NULL,
    p_avatar_url TEXT DEFAULT NULL,
    p_bio TEXT DEFAULT NULL,
    p_skills TEXT[] DEFAULT NULL,
    p_location TEXT DEFAULT NULL,
    p_role TEXT DEFAULT 'explorer'
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result JSON;
BEGIN
    UPDATE public.profiles SET 
        username = COALESCE(p_username, username),
        display_name = COALESCE(p_display_name, display_name, p_username),
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        bio = COALESCE(p_bio, bio),
        skills = COALESCE(p_skills, skills),
        location = COALESCE(p_location, location),
        role = COALESCE(p_role, role),
        influence = COALESCE(influence, 0),
        updated_at = NOW()
    WHERE id = auth.uid();
    SELECT row_to_json(p) INTO result FROM public.profiles p WHERE p.id = auth.uid();
    RETURN result;
END; $$;
GRANT EXECUTE ON FUNCTION public.setup_profile TO authenticated;

-- Share increment
CREATE OR REPLACE FUNCTION increment_idea_shares(idea_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE ideas SET shares = COALESCE(shares, 0) + 1 WHERE id = idea_id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vote count update
CREATE OR REPLACE FUNCTION update_idea_vote_count(idea_id UUID, new_count INT)
RETURNS VOID AS $$
BEGIN
    UPDATE ideas SET votes = new_count WHERE id = idea_id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- View count increment  
CREATE OR REPLACE FUNCTION increment_idea_views(p_idea_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE ideas SET view_count = COALESCE(view_count, 0) + 1 WHERE id = p_idea_id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Influence update
CREATE OR REPLACE FUNCTION increment_influence(user_id UUID, delta INT)
RETURNS VOID AS $$
BEGIN
    UPDATE profiles SET influence = COALESCE(influence, 0) + delta WHERE id = user_id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment vote (upsert vote, return new total)
CREATE OR REPLACE FUNCTION vote_idea_comment(p_comment_id UUID, p_user_id UUID, p_direction INT)
RETURNS JSON AS $$
DECLARE
    new_total INT;
BEGIN
    INSERT INTO idea_comment_votes (comment_id, user_id, direction)
    VALUES (p_comment_id, p_user_id, p_direction)
    ON CONFLICT (comment_id, user_id) DO UPDATE SET direction = p_direction;
    
    SELECT COALESCE(SUM(direction), 0) INTO new_total
    FROM idea_comment_votes WHERE comment_id = p_comment_id;
    
    UPDATE idea_comments SET votes = new_total WHERE id = p_comment_id;
    
    RETURN json_build_object('votes', new_total);
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================
-- SECTION 19: AUTH TRIGGER
-- ========================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.profiles (id, username, display_name, avatar_url, influence)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        0
    ) ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================
-- SECTION 20: STORAGE BUCKET
-- ========================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies
DO $$
BEGIN
    -- Upload policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Avatar upload' AND tablename = 'objects') THEN
        CREATE POLICY "Avatar upload" ON storage.objects FOR INSERT TO authenticated
            WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
    END IF;
    -- Update policy  
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Avatar update' AND tablename = 'objects') THEN
        CREATE POLICY "Avatar update" ON storage.objects FOR UPDATE TO authenticated
            USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
    END IF;
    -- Public read
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Avatar public read' AND tablename = 'objects') THEN
        CREATE POLICY "Avatar public read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
    END IF;
END $$;

-- ========================
-- SECTION 21: GLOBAL PERMISSIONS
-- ========================
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated, anon;

-- ========================
-- SECTION 22: VERIFICATION
-- ========================
SELECT 'TABLES' as check_type, tablename 
FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
