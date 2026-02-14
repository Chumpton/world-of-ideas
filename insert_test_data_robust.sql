-- ==============================================================================
-- ROBUST TEST DATA INSERTION
-- ==============================================================================
-- This script guarantees 5 test ideas appear in your feed.
-- It handles the case where "public.profiles" might be empty by creating a placeholder.

-- 1. Ensure at least one profile exists
DO $$
DECLARE
    target_user_id uuid;
BEGIN
    -- Try to find an existing user
    SELECT id INTO target_user_id FROM public.profiles LIMIT 1;

    -- If no user found, create a 'System Admin' placeholder
    IF target_user_id IS NULL THEN
        target_user_id := uuid_generate_v4();
        INSERT INTO public.profiles (id, username, role, tier, bio)
        VALUES (target_user_id, 'SystemAdmin', 'admin', 'visionary', 'System generated account for testing.');
    END IF;

    -- 2. Insert Test Ideas linked to this user
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
    VALUES 
    (
        'Project Genesis (System Test)', 
        'A foundational test idea to verify database connectivity and feed rendering.', 
        '## Functionality Test\nThis idea serves as a baseline for testing the **World of Ideas** platform.',
        'invention', 
        target_user_id, 
        'SystemAdmin', 
        1250, 
        5000, 
        'active', 
        34.0522, -118.2437, 'Los Angeles',
        ARRAY['test', 'system']
    ),
    (
        'Community Green Space', 
        'Proposal to convert vacant lots into sustainable community gardens.', 
        'Details regarding the implementation of urban farming.',
        'ecology', 
        450, 
        1200, 
        'active', 
        40.7128, -74.0060, 'New York',
        ARRAY['nature', 'growth']
    ),
    (
        'Hyperloop Transit', 
        'High-speed underground transportation system.', 
        'Technical feasibility study for vacuum-tube based transit.',
        'infrastructure', 
        890, 
        3400, 
        'active', 
        51.5074, -0.1278, 'London',
        ARRAY['future', 'speed']
    ),
    (
        'Digital Democracy', 
        'Blockchain-based voting system for transparent governance.', 
        'Secure method for municipal elections.',
        'policy', 
        670, 
        2100, 
        'active', 
        35.6762, 139.6503, 'Tokyo',
        ARRAY['gov', 'vote']
    ),
    (
        'AI Art Symposium', 
        'Annual gathering for generative artists.', 
        'Global digital art exhibition planning.',
        'entertainment', 
        340, 
        980, 
        'active', 
        48.8566, 2.3522, 'Paris',
        ARRAY['art', 'ai']
    );

END $$;
