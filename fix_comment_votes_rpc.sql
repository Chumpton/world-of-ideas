-- Secure RPC for voting on comments
-- Handles upsert of vote record and atomic update of comment ref count

create or replace function vote_idea_comment(
  p_comment_id uuid,
  p_direction int
)
returns json
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_old_direction int;
  v_new_total int;
  v_diff int;
begin
  -- Get user ID securely
  v_user_id := auth.uid();
  if v_user_id is null then
    return json_build_object('success', false, 'error', 'Not logged in');
  end if;

  -- 1. Get existing vote if any
  select direction into v_old_direction
  from public.idea_comment_votes
  where comment_id = p_comment_id and user_id = v_user_id;

  -- Calculate vote difference
  -- If p_direction is same as old, do nothing? Or maybe toggle? Usually toggle is UI logic. 
  -- Assuming simple "set/update" logic here.
  
  if v_old_direction is null then
    -- New vote: +1 or -1
    v_diff := p_direction;
    
    insert into public.idea_comment_votes (comment_id, user_id, direction)
    values (p_comment_id, v_user_id, p_direction);
    
  elsif v_old_direction != p_direction then
    -- Changing vote: +1 -> -1 (diff -2) or -1 -> +1 (diff +2)
    v_diff := p_direction - v_old_direction;
    
    update public.idea_comment_votes
    set direction = p_direction, created_at = now()
    where comment_id = p_comment_id and user_id = v_user_id;
    
  else
    -- Same vote: No change to total needed
    v_diff := 0;
  end if;

  -- 2. Update comments table atomically
  if v_diff != 0 then
    update public.idea_comments
    set votes = votes + v_diff
    where id = p_comment_id
    returning votes into v_new_total;
  else
    select votes into v_new_total from public.idea_comments where id = p_comment_id;
  end if;

  return json_build_object('success', true, 'new_score', v_new_total);
end;
$$;

-- Ensure public access to RLS policies
alter table public.idea_comment_votes enable row level security;

-- Drop existing generic policies if any to avoid conflicts
drop policy if exists "Users can see all votes" on public.idea_comment_votes;
drop policy if exists "Users can vote" on public.idea_comment_votes;
drop policy if exists "Users can update own vote" on public.idea_comment_votes;

create policy "Users can see all votes"
  on public.idea_comment_votes for select
  using (true);

create policy "Users can insert own vote"
  on public.idea_comment_votes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own vote"
  on public.idea_comment_votes for update
  using (auth.uid() = user_id);
