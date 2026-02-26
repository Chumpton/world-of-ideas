-- World of Ideas: Supabase Schema Updates
-- Based on error analysis from AppContext.jsx fetch attempts

-- 1. Fix Discussions Join
-- The discussions query fails with PGRST200 because there is no foreign key linking author_id to profiles.
-- Add the missing column first, then the constraint.
ALTER TABLE discussions ADD COLUMN IF NOT EXISTS author_id UUID;
ALTER TABLE discussions ADD CONSTRAINT discussions_author_id_fkey FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 2. Fix Applications Join
-- The applications query fails with PGRST200 because there is no foreign key linking applicant_id to profiles(id).
-- Add the missing column first, then the constraint.
ALTER TABLE applications ADD COLUMN IF NOT EXISTS applicant_id UUID;
ALTER TABLE applications ADD CONSTRAINT applications_applicant_id_fkey FOREIGN KEY (applicant_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 3. Create missing table: club_members
-- Throws PGRST205 (does not exist) during app initialization.
CREATE TABLE IF NOT EXISTS club_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(club_id, user_id)
);

-- 4. Create missing table: group_discussions
-- Throws PGRST205 (does not exist)
CREATE TABLE IF NOT EXISTS group_discussions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create missing table: wiki_entries
-- Throws PGRST205 (does not exist) when opening 'Wiki' tab on an Idea
CREATE TABLE IF NOT EXISTS wiki_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
    author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create missing table: idea_resources
-- Throws PGRST205 (does not exist) when opening 'Resources' or fetching related resources
CREATE TABLE IF NOT EXISTS idea_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
    author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT,
    type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTE: The 'idea_comments' table issue (PGRST201 - multiple joins)
-- was already fixed in the React codebase by explicitly targeting the
-- !idea_comments_user_id_fkey relationship.
