SELECT table_name, column_name
FROM information_schema.columns
WHERE table_name IN ('comments', 'idea_comments', 'discussion_comments')
AND column_name IN ('user_id', 'author_id', 'author_uuid', 'author');
