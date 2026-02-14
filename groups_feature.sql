-- GROUPS FEATURE IMPLEMENTATION (Corrected to 'groups')

-- 1. Groups Table
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    banner_url TEXT,
    leader_id UUID REFERENCES public.profiles(id),
    color TEXT DEFAULT '#7d5fff',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safety: Add columns if table exists but columns are missing
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#7d5fff';
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS leader_id UUID REFERENCES public.profiles(id);

-- 2. Group Members
CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member', -- 'leader', 'officer', 'member'
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- 3. Discussion Board (Posts & Comments)
CREATE TABLE IF NOT EXISTS public.group_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.group_post_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES public.group_posts(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Live Chat
CREATE TABLE IF NOT EXISTS public.group_chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chat_messages ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- Groups
DROP POLICY IF EXISTS "Groups viewable by everyone" ON public.groups;
CREATE POLICY "Groups viewable by everyone" ON public.groups FOR SELECT USING (true);

-- Members
DROP POLICY IF EXISTS "Group members viewable" ON public.group_members;
CREATE POLICY "Group members viewable" ON public.group_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "User join group" ON public.group_members;
CREATE POLICY "User join group" ON public.group_members FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "User leave group" ON public.group_members;
CREATE POLICY "User leave group" ON public.group_members FOR DELETE USING (auth.uid() = user_id);

-- Posts
DROP POLICY IF EXISTS "Posts viewable by everyone" ON public.group_posts;
CREATE POLICY "Posts viewable by everyone" ON public.group_posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users can post" ON public.group_posts;
CREATE POLICY "Auth users can post" ON public.group_posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Chat
DROP POLICY IF EXISTS "Chat viewable by everyone" ON public.group_chat_messages;
CREATE POLICY "Chat viewable by everyone" ON public.group_chat_messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users can chat" ON public.group_chat_messages;
CREATE POLICY "Auth users can chat" ON public.group_chat_messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- 7. SEED DATA
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM public.groups) THEN
    INSERT INTO public.groups (name, description, banner_url, color) VALUES
    ('Techno-Optimists', 'Accelerating the future through code and silicon.', 'https://images.unsplash.com/photo-1518770660439-4636190af475', '#0984e3'),
    ('Green Guardians', 'Protecting the planet with sustainable innovation.', 'https://images.unsplash.com/photo-1542601906990-b4d3fb7d5b43', '#00b894'),
    ('Cosmic Explorers', 'Looking to the stars for humanity''s next home.', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa', '#6c5ce7'),
    ('Urban Architects', 'Designing the cities of tomorrow, today.', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab', '#e17055');
  END IF;
END $$;
