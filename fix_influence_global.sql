-- Global Influence Recalculation (Fixed Column Names)

WITH calculated_influence AS (
    SELECT 
        author_id,
        SUM(votes) as total_votes
    FROM (
        -- Idea Votes
        SELECT author_id, votes FROM public.ideas
        
        UNION ALL
        
        -- Comment Votes (Legacy/Generic)
        SELECT author_id, votes FROM public.comments
        
        UNION ALL
        
        -- Discussion Comments (New)
        SELECT user_id as author_id, votes FROM public.discussion_comments
        
        UNION ALL
        
        -- Idea Comments (Specific)
        SELECT user_id as author_id, votes FROM public.idea_comments
    ) as all_activity
    WHERE author_id IS NOT NULL
    GROUP BY author_id
)
UPDATE public.profiles p
SET influence = COALESCE(c.total_votes, 0)
FROM calculated_influence c
WHERE p.id = c.author_id;

-- Verify
SELECT username, influence FROM public.profiles ORDER BY influence DESC LIMIT 10;
