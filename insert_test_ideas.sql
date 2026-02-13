-- ==============================================================================
-- INSERT TEST IDEAS
-- ==============================================================================
-- This script inserts 5 "Site Made" test ideas into the 'ideas' table.
-- It automatically assigns them to the first user found in 'profiles' (or auth.users).
-- Useful for populating the feed with safe, diverse data for testing.

WITH first_user AS (
    SELECT id, username FROM public.profiles LIMIT 1
)
INSERT INTO public.ideas (
    title, 
    description, 
    body, 
    type, 
    author_id, 
    author_name, 
    votes, 
    views, 
    status, 
    lat, 
    lng, 
    city,
    tags
)
SELECT 
    idea.title, 
    idea.description, 
    idea.body, 
    idea.type, 
    (SELECT id FROM first_user), 
    (SELECT username FROM first_user), 
    idea.votes, 
    idea.views, 
    'active', 
    idea.lat, 
    idea.lng, 
    idea.city,
    idea.tags
FROM (VALUES 
    (
        'Project Genesis (System Test)', 
        'A foundational test idea to verify database connectivity and feed rendering.', 
        '## Functionality Test\nThis idea serves as a baseline for testing the **World of Ideas** platform.\n\n- **Category**: Invention\n- **Status**: Active\n- **Origin**: Site Admin',
        'invention', 
        100, 
        50, 
        34.0522, -118.2437, 'Los Angeles',
        ARRAY['test', 'system', 'admin']
    ),
    (
        'Community Green Space', 
        'Proposal to convert vacant lots into sustainable community gardens.', 
        'Details regarding the implementation of urban farming and recreational spaces.',
        'ecology', 
        10, 
        150, 
        40.7128, -74.0060, 'New York',
        ARRAY['nature', 'urban', 'growth']
    ),
    (
        'Hyperloop Transit Network', 
        'High-speed underground transportation system connecting major hubs.', 
        'Technical feasibility study for vacuum-tube based transit.',
        'infrastructure', 
        20, 
        1200, 
        51.5074, -0.1278, 'London',
        ARRAY['transport', 'speed', 'future']
    ),
    (
        'Digital Democracy Framework', 
        'Blockchain-based voting system for transparent local governance.', 
        ' outlines a secure method for municipal elections using distributed ledger technology.',
        'policy', 
        40, 
        300, 
        35.6762, 139.6503, 'Tokyo',
        ARRAY['gov', 'vote', 'tech']
    ),
    (
        'AI Art Symposium', 
        'Annual gathering for generative artists and critics.', 
        'Event planning for a global digital art exhibition.',
        'entertainment', 
        15, 
        450, 
        48.8566, 2.3522, 'Paris',
        ARRAY['art', 'ai', 'event']
    )
) AS idea(title, description, body, type, votes, views, lat, lng, city, tags)
WHERE EXISTS (SELECT 1 FROM first_user);
