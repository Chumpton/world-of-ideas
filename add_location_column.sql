ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS location text;

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'location';
