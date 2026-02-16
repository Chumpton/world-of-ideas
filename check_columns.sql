SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_name IN ('comments', 'discussion_comments', 'ideas');
