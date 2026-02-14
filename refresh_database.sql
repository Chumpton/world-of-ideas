-- MASTER REFRESH SCRIPT
-- 1. Schema Synchronization (Ensure all tables exist)
CREATE TABLE IF NOT EXISTS public.clans (
  id uuid primary key default uuid_generate_v4(),
  name text,
  description text,
  banner_url text,
  leader_id uuid references public.profiles(id),
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.clan_members (
  id uuid primary key default uuid_generate_v4(),
  clan_id uuid references public.clans(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text default 'soldier',
  joined_at timestamptz default now(),
  unique(clan_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.activity_log (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references public.profiles(id) on delete cascade,
    action text,
    details jsonb default '{}',
    created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.guide_votes (
  id uuid primary key default uuid_generate_v4(),
  guide_id uuid references public.guides(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  direction int default 1, -- 1 for up, -1 for down
  created_at timestamptz default now(),
  unique(guide_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.guide_comments (
  id uuid primary key default uuid_generate_v4(),
  guide_id uuid references public.guides(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  content text,
  created_at timestamptz default now()
);

-- Ensure idea_comments exists with correct schema (Denormalized author info)
CREATE TABLE IF NOT EXISTS public.idea_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    author TEXT,          -- Denormalized username
    author_avatar TEXT,   -- Denormalized avatar
    parent_id UUID REFERENCES public.idea_comments(id),
    votes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Safety: Add columns if they didn't exist from older migration
ALTER TABLE public.idea_comments ADD COLUMN IF NOT EXISTS author TEXT;
ALTER TABLE public.idea_comments ADD COLUMN IF NOT EXISTS author_avatar TEXT;
ALTER TABLE public.idea_comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.idea_comments(id);

-- Enforce Cascade Delete on Profiles (Fix for "comments not deleting")
DO $$ 
BEGIN
  -- Drop old constraint if exists (usually named idea_comments_user_id_fkey or similar)
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'idea_comments_user_id_fkey') THEN
    ALTER TABLE public.idea_comments DROP CONSTRAINT idea_comments_user_id_fkey;
  END IF;
  
  -- Add new constraint referencing profiles
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'idea_comments_user_id_fkey_profiles') THEN
    ALTER TABLE public.idea_comments 
    ADD CONSTRAINT idea_comments_user_id_fkey_profiles 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;


CREATE TABLE IF NOT EXISTS public.idea_comment_votes (
  id uuid primary key default uuid_generate_v4(),
  comment_id uuid references public.idea_comments(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  direction int default 1,
  created_at timestamptz default now(),
  unique(comment_id, user_id)
);

-- 2. User Cleanup (Remove "bot" users, PRESERVE 'campwilkins')
-- Deletes profiles that look like hex strings (e.g. 8d762b3e) or Generic Community Members
DELETE FROM public.profiles 
WHERE 
    ((username ~ '^[a-f0-9]{8}$') OR (username = 'Community Member') OR (display_name = 'Community Member'))
    AND username != 'campwilkins'; -- SAFETY LOCK

-- 2b. Ensure Profile Fields for People Card
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skills text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_title text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS border_color text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS followers_count integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS following_count integer DEFAULT 0;

-- 2c. Ensure Follows Table Exists (for counts)
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
CREATE POLICY "Auth users can follow" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
DROP POLICY IF EXISTS "Auth users can unfollow" ON public.follows;
CREATE POLICY "Auth users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- 2d. Recalculate Social Counts
WITH follower_stats AS (
    SELECT following_id, COUNT(*) as count FROM public.follows GROUP BY following_id
), following_stats AS (
    SELECT follower_id, COUNT(*) as count FROM public.follows GROUP BY follower_id
)
UPDATE public.profiles
SET 
    followers_count = COALESCE(follower_stats.count, 0),
    following_count = COALESCE(following_stats.count, 0)
FROM public.profiles p
LEFT JOIN follower_stats ON p.id = follower_stats.following_id
LEFT JOIN following_stats ON p.id = following_stats.follower_id
WHERE public.profiles.id = p.id;


-- 3. Fix Comment Counts
-- Recalculate and update the comment_count on ideas table based on actual rows in idea_comments
WITH comment_counts AS (
    SELECT idea_id, COUNT(*) as count
    FROM public.idea_comments
    GROUP BY idea_id
)
UPDATE public.ideas
SET comment_count = comment_counts.count
FROM comment_counts
WHERE public.ideas.id = comment_counts.idea_id;

-- 4. Fix Vote Counts (Enabled)
WITH vote_stats AS (
    SELECT 
        idea_id,
        COALESCE(SUM(direction), 0) as total_score
    FROM public.idea_votes
    GROUP BY idea_id
)
UPDATE public.ideas
SET votes = vote_stats.total_score
FROM vote_stats
WHERE public.ideas.id = vote_stats.idea_id;

-- 5. Ensure Shares & Votes Columns
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS shares integer DEFAULT 0;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS votes integer DEFAULT 0;

-- 6. Enable RLS on new tables
ALTER TABLE public.clans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clan_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_comment_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_comments ENABLE ROW LEVEL SECURITY;

-- 7. Grant access
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- 8. Policies for Idea Comments
DROP POLICY IF EXISTS "Comments viewable by everyone" ON public.idea_comments;
CREATE POLICY "Comments viewable by everyone" ON public.idea_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users can insert comments" ON public.idea_comments;
CREATE POLICY "Auth users can insert comments" ON public.idea_comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own comments" ON public.idea_comments;
CREATE POLICY "Users can update own comments" ON public.idea_comments FOR UPDATE USING (auth.uid() = user_id);

-- 9. RPC Functions

-- Share Increment
create or replace function increment_idea_shares(idea_id uuid)
returns void as $$
begin
  update ideas
  set shares = coalesce(shares, 0) + 1
  where id = idea_id;
end;
$$ language plpgsql security definer;

-- Vote Count Update (Bypasses RLS)
create or replace function update_idea_vote_count(idea_id uuid, new_count int)
returns void as $$
begin
  update ideas
  set votes = new_count
  where id = idea_id;
end;
$$ language plpgsql security definer;
