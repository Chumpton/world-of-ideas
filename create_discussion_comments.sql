-- Create discussion_comments table
create table if not exists public.discussion_comments (
  id uuid default gen_random_uuid() primary key,
  discussion_id uuid references public.discussions(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  parent_id uuid references public.discussion_comments(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  votes int default 0
);

-- RLS for discussion_comments
alter table public.discussion_comments enable row level security;

create policy "Public comments are viewable by everyone."
  on public.discussion_comments for select
  using ( true );

create policy "Users can insert their own comments."
  on public.discussion_comments for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own comments."
  on public.discussion_comments for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own comments."
  on public.discussion_comments for delete
  using ( auth.uid() = user_id );

-- Create discussion_comment_votes table
create table if not exists public.discussion_comment_votes (
  id uuid default gen_random_uuid() primary key,
  comment_id uuid references public.discussion_comments(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  vote_type int not null check (vote_type in (-1, 1)),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(comment_id, user_id)
);

-- RLS for discussion_comment_votes
alter table public.discussion_comment_votes enable row level security;

create policy "Public comment votes are viewable by everyone."
  on public.discussion_comment_votes for select
  using ( true );

create policy "Users can insert their own comment votes."
  on public.discussion_comment_votes for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own comment votes."
  on public.discussion_comment_votes for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own comment votes."
  on public.discussion_comment_votes for delete
  using ( auth.uid() = user_id );
